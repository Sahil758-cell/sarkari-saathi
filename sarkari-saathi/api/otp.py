"""
otp.py — Phone number OTP login via 2Factor.in's SMS API. The API key stays
server-side (never shipped to the mobile app); the mobile app only ever
talks to our own /auth/send-otp and /auth/verify-otp endpoints.
"""
import os

import httpx

BASE = "https://2factor.in/API/V1"


def _api_key() -> str:
    key = os.environ.get("TWOFACTOR_API_KEY")
    if not key:
        raise RuntimeError("OTP login is not configured on the server")
    return key


def send_otp(phone_10_digit: str) -> str:
    """Sends an OTP to +91<phone_10_digit> and returns the 2Factor.in
    session id needed to verify it. Raises RuntimeError with a message
    safe to show the user on any failure."""
    url = f"{BASE}/{_api_key()}/SMS/+91{phone_10_digit}/AUTOGEN"
    resp = httpx.get(url, timeout=10)
    data = resp.json()
    if data.get("Status") != "Success":
        raise RuntimeError(data.get("Details", "Could not send OTP"))
    return data["Details"]


def verify_otp(session_id: str, code: str) -> bool:
    url = f"{BASE}/{_api_key()}/SMS/VERIFY/{session_id}/{code}"
    resp = httpx.get(url, timeout=10)
    data = resp.json()
    return data.get("Status") == "Success"
