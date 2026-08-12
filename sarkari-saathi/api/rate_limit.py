"""
rate_limit.py — small in-memory sliding-window rate limiter.

Same tradeoff as api/email_otp.py's in-memory OTP store: state doesn't
survive a restart, which is fine here (Render's free tier is a single
instance, and a reset just means the limit window restarts — a
generous-not-strict failure mode, not an unsafe one).
"""
import time

_calls: dict[str, list[float]] = {}


def check_rate_limit(key: str, max_calls: int, window_seconds: float) -> bool:
    """Records a call under `key` and returns True if it's within the
    allowed rate, False if `key` has already hit `max_calls` within the
    last `window_seconds`. Call once per request attempt."""
    now = time.time()
    cutoff = now - window_seconds
    calls = [t for t in _calls.get(key, []) if t > cutoff]

    if len(calls) >= max_calls:
        _calls[key] = calls
        return False

    calls.append(now)
    _calls[key] = calls
    return True
