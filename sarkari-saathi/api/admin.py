"""
admin.py — "Report wrong info" for users and a small review API for the team.

Schemes found by live search are read from web pages by an AI, so they start
unverified. Users can report a mistake on any scheme; the team reviews reports
and live-found schemes (verify, correct, or delete them) from the /admin page
of the website. Admin calls need the ADMIN_SECRET env var in the
`x-admin-secret` header; without it set, the admin API is switched off.
"""
import hmac
import logging
import os
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field

import matcher
from api import live_search
from api.rate_limit import check_rate_limit

log = logging.getLogger("admin")
router = APIRouter()

REPORTS = "reports"


def _db():
    from api.firestore_client import get_db

    try:
        return get_db()
    except Exception:  # noqa: BLE001 — not configured / unreachable
        raise HTTPException(status_code=503, detail="Database is not available right now")


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    return forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")


def require_admin(x_admin_secret: str = Header(default="")) -> None:
    secret = os.environ.get("ADMIN_SECRET", "")
    if not secret:
        raise HTTPException(status_code=503, detail="Admin is not configured")
    if not hmac.compare_digest(x_admin_secret.encode(), secret.encode()):
        raise HTTPException(status_code=401, detail="Wrong admin secret")


# ---- Reports from users ----


class ReportIn(BaseModel):
    reason: Literal["wrong_info", "outdated", "broken_link", "other"]
    note: str = Field(default="", max_length=500)


@router.post("/schemes/{slug}/report")
def post_report(slug: str, body: ReportIn, request: Request):
    if not check_rate_limit(f"report:{_client_ip(request)}", max_calls=10, window_seconds=60 * 60):
        raise HTTPException(status_code=429, detail="Too many reports — try again later")
    scheme = matcher.get_scheme_by_slug(slug)
    if scheme is None and slug.startswith("web-") and live_search.load_from_firestore(slug):
        scheme = matcher.get_scheme_by_slug(slug)
    if scheme is None:
        raise HTTPException(status_code=404, detail="Scheme not found")
    _db().collection(REPORTS).add(
        {
            "slug": slug,
            "scheme_name": scheme.get("scheme_name"),
            "reason": body.reason,
            "note": body.note.strip(),
            "status": "open",
            "created": datetime.now(timezone.utc).isoformat(),
        }
    )
    return {"ok": True}


# ---- Review (admin) ----


class SchemeEdit(BaseModel):
    """Fields a reviewer may correct on a live-found scheme."""

    benefits_summary: Optional[str] = Field(default=None, max_length=1000)
    other_conditions: Optional[list[str]] = Field(default=None, max_length=20)
    documents_required: Optional[list[str]] = Field(default=None, max_length=30)
    application_link: Optional[str] = Field(default=None, max_length=500)


def _live_doc(slug: str):
    if not slug.startswith("web-"):
        raise HTTPException(status_code=400, detail="Only live-found schemes can be reviewed here")
    ref = _db().collection(live_search.COLLECTION).document(slug)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return ref, doc.to_dict()


@router.get("/admin/live-schemes", dependencies=[Depends(require_admin)])
def list_live_schemes():
    db = _db()
    open_reports: dict[str, int] = {}
    for r in db.collection(REPORTS).where("status", "==", "open").stream():
        slug = (r.to_dict() or {}).get("slug")
        open_reports[slug] = open_reports.get(slug, 0) + 1
    items = []
    for doc in db.collection(live_search.COLLECTION).stream():
        d = doc.to_dict() or {}
        items.append(
            {
                "slug": doc.id,
                "scheme_name": d.get("scheme_name"),
                "state": d.get("state"),
                "verified": bool(d.get("verified")),
                "benefits_summary": d.get("benefits_summary"),
                "other_conditions": d.get("other_conditions") or [],
                "documents_required": d.get("documents_required") or [],
                "application_link": d.get("application_link"),
                "source_url": d.get("source_url"),
                "date_added": d.get("date_added"),
                "open_reports": open_reports.get(doc.id, 0),
            }
        )
    items.sort(key=lambda i: (i["verified"], i["date_added"] or ""))
    return {"count": len(items), "results": items}


@router.post("/admin/live-schemes/{slug}/verify", dependencies=[Depends(require_admin)])
def verify_live_scheme(slug: str, verified: bool = True):
    ref, data = _live_doc(slug)
    ref.update({"verified": verified})
    data["verified"] = verified
    live_search._write_local(slug, data)
    return {"ok": True, "verified": verified}


@router.post("/admin/live-schemes/{slug}/edit", dependencies=[Depends(require_admin)])
def edit_live_scheme(slug: str, body: SchemeEdit):
    ref, data = _live_doc(slug)
    changes = body.model_dump(exclude_none=True)
    if "application_link" in changes and changes["application_link"]:
        if not changes["application_link"].lower().startswith(("http://", "https://")):
            raise HTTPException(status_code=400, detail="Link must start with http:// or https://")
    if "application_link" in changes and not changes["application_link"]:
        changes["application_link"] = None
    if not changes:
        return {"ok": True}
    ref.update(changes)
    data.update(changes)
    live_search._write_local(slug, data)
    return {"ok": True}


@router.delete("/admin/live-schemes/{slug}", dependencies=[Depends(require_admin)])
def delete_live_scheme(slug: str):
    ref, _data = _live_doc(slug)
    ref.delete()
    (matcher.LIVE_CACHE_DIR / f"{slug}.json").unlink(missing_ok=True)
    return {"ok": True}


@router.get("/admin/reports", dependencies=[Depends(require_admin)])
def list_reports():
    items = []
    for r in _db().collection(REPORTS).where("status", "==", "open").stream():
        d = r.to_dict() or {}
        items.append({"id": r.id, **{k: d.get(k) for k in ("slug", "scheme_name", "reason", "note", "created")}})
    items.sort(key=lambda i: i["created"] or "", reverse=True)
    return {"count": len(items), "results": items}


@router.post("/admin/reports/{report_id}/resolve", dependencies=[Depends(require_admin)])
def resolve_report(report_id: str):
    ref = _db().collection(REPORTS).document(report_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Report not found")
    ref.update({"status": "resolved"})
    return {"ok": True}
