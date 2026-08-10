"""
main.py — FastAPI backend for the Sarkari Saathi mobile app. Wraps
bot/matcher.py, which is pure rule-based and Telegram-agnostic already.
The Telegram bot keeps running unmodified alongside this.
"""
import sys
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
sys.path.insert(0, str(BASE_DIR / "bot"))
import matcher  # noqa: E402

from cerebras.cloud.sdk import RateLimitError  # noqa: E402
from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from api import email_otp, rag  # noqa: E402
from api.schemas import (  # noqa: E402
    AskRequest,
    AskResponse,
    EligibilityOut,
    MatchResponse,
    ProfileIn,
    QuestionOut,
    SchemeOut,
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRequest,
    VerifyOtpResponse,
)

app = FastAPI(title="Sarkari Saathi API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _to_scheme_out(scheme: dict) -> dict:
    out = dict(scheme)
    out["slug"] = out.pop("_slug", None)
    out["portal_url"] = matcher.get_portal_url(scheme)
    return out


@app.get("/health")
def health():
    return {"status": "ok", "schemes_loaded": len(matcher.load_schemes())}


@app.post("/match", response_model=MatchResponse)
def post_match(profile: ProfileIn, limit: int = 30):
    results = matcher.match(profile.model_dump(exclude_none=True), limit=limit)
    return {"count": len(results), "results": [_to_scheme_out(s) for s in results]}


@app.get("/schemes/{slug}", response_model=SchemeOut)
def get_scheme(slug: str):
    scheme = matcher.get_scheme_by_slug(slug)
    if scheme is None:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return _to_scheme_out(scheme)


@app.get("/search", response_model=MatchResponse)
def get_search(q: str, limit: int = 10):
    results = matcher.search_by_name(q, limit=limit)
    return {"count": len(results), "results": [_to_scheme_out(s) for s in results]}


@app.post("/schemes/{slug}/eligibility", response_model=EligibilityOut)
def post_eligibility(slug: str, profile: ProfileIn):
    scheme = matcher.get_scheme_by_slug(slug)
    if scheme is None:
        raise HTTPException(status_code=404, detail="Scheme not found")
    result = matcher.check_eligibility(scheme, profile.model_dump(exclude_none=True))
    reasons = [
        {"field": f, "expected": e, "actual": a} for f, e, a in result["reasons"]
    ]
    return {"eligible": result["eligible"], "reasons": reasons}


@app.get("/schemes/{slug}/questions", response_model=list[QuestionOut])
def get_questions(slug: str):
    scheme = matcher.get_scheme_by_slug(slug)
    if scheme is None:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return matcher.build_question_queue(scheme)


@app.post("/assistant/ask", response_model=AskResponse)
def post_ask(body: AskRequest):
    try:
        result = rag.ask(body.query)
    except RateLimitError:
        raise HTTPException(status_code=429, detail="Assistant is busy, try again in a moment")
    return {
        "answer": result["answer"],
        "sources": [_to_scheme_out(s) for s in result["sources"]],
        "web_sources": result["web_sources"],
    }


@app.post("/auth/send-otp", response_model=SendOtpResponse)
def post_send_otp(body: SendOtpRequest):
    try:
        email_otp.send_otp(body.email)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"session_id": body.email}


@app.post("/auth/verify-otp", response_model=VerifyOtpResponse)
def post_verify_otp(body: VerifyOtpRequest):
    return {"verified": email_otp.verify_otp(body.session_id, body.otp)}
