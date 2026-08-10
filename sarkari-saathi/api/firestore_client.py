"""
firestore_client.py — Firestore access for push tokens, synced eligibility
profiles, notification history, session tokens, and the notify-check cursor.

Render's free tier has no persistent disk (state resets on every idle
spin-down), so anything that must survive a restart lives here instead of
in-memory or on-disk. Credentials come from FIREBASE_SERVICE_ACCOUNT_JSON
(the full service-account JSON, pasted as one env var value — same pattern
as BREVO_API_KEY, no file upload needed on Render).
"""
import json
import os

import firebase_admin
from firebase_admin import credentials, firestore

_db = None


def get_db():
    global _db
    if _db is not None:
        return _db

    if not firebase_admin._apps:
        raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        if not raw:
            raise RuntimeError("Notifications are not configured on the server")
        cred = credentials.Certificate(json.loads(raw))
        firebase_admin.initialize_app(cred)

    _db = firestore.client()
    return _db
