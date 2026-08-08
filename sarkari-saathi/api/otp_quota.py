"""
otp_quota.py — Tracks how many phone OTPs have been sent today, persisted
to a small JSON file (no DB in this project, matching the read/write idiom
already used for data/*.json in bot/matcher.py). Once the daily cap is
hit, main.py switches new OTP requests to the email fallback (email_otp.py)
instead of phone (otp.py), since phone SMS delivery for India otherwise
needs paid billing or business DLT registration.
"""
import json
from datetime import date
from pathlib import Path

PHONE_OTP_DAILY_LIMIT = 9

BASE_DIR = Path(__file__).resolve().parent.parent
QUOTA_PATH = BASE_DIR / "data" / "otp_quota.json"


def _load() -> dict:
    try:
        with open(QUOTA_PATH, "r", encoding="utf-8") as f:
            state = json.load(f)
    except (OSError, json.JSONDecodeError):
        state = {}
    if state.get("date") != str(date.today()):
        state = {"date": str(date.today()), "count": 0}
    return state


def _save(state: dict) -> None:
    QUOTA_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(QUOTA_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f)


def get_mode() -> str:
    """Returns 'phone' or 'email' depending on today's phone-OTP count."""
    state = _load()
    return "phone" if state["count"] < PHONE_OTP_DAILY_LIMIT else "email"


def record_phone_send() -> None:
    state = _load()
    state["count"] += 1
    _save(state)
