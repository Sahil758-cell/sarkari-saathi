"""
email_otp.py — Fallback OTP delivery via email (Gmail SMTP), used once the
daily phone-OTP quota (see otp_quota.py) is used up. Unlike 2Factor.in's
phone flow, there's no external session concept — the code + expiry are
held in-memory here, keyed by email. A backend restart mid-flow just means
the user needs to request a new code, an acceptable tradeoff at this scale.
"""
import os
import random
import smtplib
import time
from email.mime.text import MIMEText

CODE_TTL_SECONDS = 10 * 60

_pending: dict[str, tuple[str, float]] = {}


def send_otp(email: str) -> None:
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_APP_PASSWORD")
    if not smtp_user or not smtp_pass:
        raise RuntimeError("Email OTP is not configured on the server")

    code = f"{random.randint(0, 999999):06d}"
    _pending[email] = (code, time.time() + CODE_TTL_SECONDS)

    message = MIMEText(f"Your Sarkari Saathi login code is {code}. It expires in 10 minutes.")
    message["Subject"] = "Your Sarkari Saathi login code"
    message["From"] = smtp_user
    message["To"] = email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, [email], message.as_string())


def verify_otp(email: str, code: str) -> bool:
    entry = _pending.get(email)
    if entry is None:
        return False
    stored_code, expires_at = entry
    del _pending[email]
    if time.time() > expires_at:
        return False
    return code == stored_code
