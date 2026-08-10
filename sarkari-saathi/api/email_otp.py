"""
email_otp.py — OTP delivery via Brevo's HTTPS transactional email API.

Render's free tier blocks all outbound SMTP ports (25, 465, 587), so Gmail
SMTP cannot work there — this uses Brevo's HTTP API (port 443) instead.
There's no external session concept — the code + expiry are held in-memory
here, keyed by email. A backend restart mid-flow just means the user needs
to request a new code, an acceptable tradeoff at this scale.
"""
import os
import random
import time

import httpx

CODE_TTL_SECONDS = 10 * 60
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

_pending: dict[str, tuple[str, float]] = {}


def send_otp(email: str) -> None:
    api_key = os.environ.get("BREVO_API_KEY")
    sender_email = os.environ.get("EMAIL_FROM_ADDRESS")
    if not api_key or not sender_email:
        raise RuntimeError("Email OTP is not configured on the server")

    code = f"{random.randint(0, 999999):06d}"
    _pending[email] = (code, time.time() + CODE_TTL_SECONDS)

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
    del _pending[email]
    if time.time() > expires_at:
        return False
    return code == stored_code
