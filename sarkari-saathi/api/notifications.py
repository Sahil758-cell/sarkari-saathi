"""
notifications.py — push token registration, profile sync, notification
history, and the scheduled "new scheme matches a saved profile" check.

Session tokens: verify-otp mints an opaque token (stored in Firestore
`sessions/{token}`) so the endpoints here — which read/write a user's
saved demographic profile — aren't reachable by anyone who just knows the
target's email. require_session() is a FastAPI dependency gating them.

run_check() is triggered by a scheduled GitHub Actions workflow hitting
POST /notifications/run-check with a shared secret (system-to-system, not
a user session) — see .github/workflows/notify-check.yml.
"""
import secrets
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx
from fastapi import Header, HTTPException

from api.firestore_client import get_db

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "bot"))
import matcher  # noqa: E402

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
HISTORY_LIMIT = 50


# ---- sessions ---------------------------------------------------------

def create_session(email: str) -> str:
    token = secrets.token_urlsafe(32)
    get_db().collection("sessions").document(token).set({
        "email": email,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return token


def require_session(authorization: Optional[str] = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing session token")
    token = authorization.removeprefix("Bearer ").strip()
    doc = get_db().collection("sessions").document(token).get()
    if not doc.exists:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return doc.to_dict()["email"]


# ---- registration / profile sync --------------------------------------

def register_token(email: str, token: str, platform: str) -> None:
    ref = get_db().collection("users").document(email)
    doc = ref.get()
    tokens = doc.to_dict().get("push_tokens", []) if doc.exists else []
    if token not in tokens:
        tokens.append(token)
    ref.set({"push_tokens": tokens, "platform": platform}, merge=True)


def sync_profiles(email: str, profiles: list[dict]) -> None:
    get_db().collection("users").document(email).set(
        {"profiles": profiles}, merge=True
    )


def unregister(email: str) -> None:
    get_db().collection("users").document(email).delete()


def get_history(email: str) -> list[dict]:
    docs = (
        get_db()
        .collection("users")
        .document(email)
        .collection("history")
        .order_by("sent_at", direction="DESCENDING")
        .limit(HISTORY_LIMIT)
        .stream()
    )
    return [d.to_dict() for d in docs]


# ---- push sending -------------------------------------------------------

def _send_expo_push(messages: list[dict]) -> None:
    """messages: [{"to", "title", "body", "data"}, ...], max 100 per Expo's
    own batching limit — chunk before calling."""
    for i in range(0, len(messages), 100):
        chunk = messages[i : i + 100]
        httpx.post(
            EXPO_PUSH_URL,
            json=chunk,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            timeout=15,
        )


# ---- scheduled check ----------------------------------------------------

def run_check() -> dict:
    db = get_db()
    state_ref = db.collection("system").document("state")
    state = state_ref.get()

    now = datetime.now(timezone.utc).isoformat()

    if not state.exists:
        # First-ever run: bootstrap the cursor without notifying anyone —
        # we don't know what "new since forever" would even mean yet.
        state_ref.set({"last_check_at": now})
        return {"bootstrapped": True, "notified": 0}

    last_check_at = state.to_dict()["last_check_at"]

    new_schemes = [
        s for s in matcher.load_schemes()
        if (s.get("date_added") or "") > last_check_at
    ]

    notified_count = 0
    if new_schemes:
        messages = []
        user_docs = list(db.collection("users").stream())
        for user_doc in user_docs:
            email = user_doc.id
            data = user_doc.to_dict()
            push_tokens = data.get("push_tokens", [])
            profiles = data.get("profiles", [])
            if not push_tokens or not profiles:
                continue

            for scheme in new_schemes:
                slug = scheme.get("_slug")
                dedup_id = f"{email}::{slug}"
                dedup_ref = db.collection("notifications_sent").document(dedup_id)
                if dedup_ref.get().exists:
                    continue

                matched = any(
                    matcher.check_eligibility(scheme, profile)["eligible"]
                    for profile in profiles
                )
                if not matched:
                    continue

                title = "New scheme you may be eligible for"
                body = scheme.get("scheme_name", "A new government scheme")
                for token in push_tokens:
                    messages.append({
                        "to": token,
                        "title": title,
                        "body": body,
                        "data": {"slug": slug},
                    })
                db.collection("users").document(email).collection("history").add({
                    "title": title,
                    "body": body,
                    "slug": slug,
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                })
                dedup_ref.set({"sent_at": datetime.now(timezone.utc).isoformat()})
                notified_count += 1

        if messages:
            _send_expo_push(messages)

    state_ref.set({"last_check_at": now})
    return {"bootstrapped": False, "new_schemes": len(new_schemes), "notified": notified_count}
