"""
email_otp.py — OTP delivery via Brevo's HTTPS transactional email API.

Render's free tier blocks all outbound SMTP ports (25, 465, 587), so Gmail
SMTP cannot work there — this uses Brevo's HTTP API (port 443) instead.
There's no external session concept — the code + expiry are held in-memory
here, keyed by email. A backend restart mid-flow just means the user needs
to request a new code, an acceptable tradeoff at this scale.
"""
import os
import secrets
import time

import httpx

CODE_TTL_SECONDS = 10 * 60
MAX_VERIFY_ATTEMPTS = 5
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

_pending: dict[str, tuple[str, float]] = {}
_attempts: dict[str, int] = {}


def send_otp(email: str) -> None:
    api_key = os.environ.get("BREVO_API_KEY")
    sender_email = os.environ.get("EMAIL_FROM_ADDRESS")
    if not api_key or not sender_email:
        raise RuntimeError("Email OTP is not configured on the server")

    code = f"{secrets.randbelow(1_000_000):06d}"
    _pending[email] = (code, time.time() + CODE_TTL_SECONDS)
    _attempts[email] = 0

    response = httpx.post(
        BREVO_API_URL,
        headers={
            "api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        json={
            "sender": {"email": sender_email, "name": "Sarkari Saathi"},
            "to": [{"email": email}],
            "subject": "Your Sarkari Saathi login code",
            "textContent": f"Your Sarkari Saathi login code is {code}. It expires in 10 minutes.",
        },
        timeout=15,
    )
    response.raise_for_status()


def verify_otp(email: str, code: str) -> bool:
    entry = _pending.get(email)
    if entry is None:
        return False
    stored_code, expires_at = entry

    if time.time() > expires_at:
        del _pending[email]
        _attempts.pop(email, None)
        return False

    if code == stored_code:
        del _pending[email]
        _attempts.pop(email, None)
        return True

    # Wrong code: count it and lock out after too many guesses, rather than
    # burning the code on the very first miss — a network timeout on a
    # correct guess used to silently consume it, forcing a spurious retry.
    attempts = _attempts.get(email, 0) + 1
    _attempts[email] = attempts
    if attempts >= MAX_VERIFY_ATTEMPTS:
        del _pending[email]
        _attempts.pop(email, None)
    return False
