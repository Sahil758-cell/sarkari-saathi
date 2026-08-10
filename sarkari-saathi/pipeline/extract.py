"""
extract.py — Convert free-text eligibility criteria into structured JSON
using the Cerebras API (free tier), for every scheme in the normalized
dataset (set MAX_SCHEMES env var to limit this for a quick test run).

Resumable: schemes whose output file already exists are skipped. This is
a long-running job for the full dataset — Cerebras' free tier caps requests
at 5/minute AND 150/hour AND 2400/day, so completing ~3400 schemes takes
roughly 1-2 days of (safely interruptible and resumable) background running.
Failures are logged, not fatal.
"""
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Literal, Optional, Tuple

from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).resolve().parent))
from utils import slugify  # noqa: E402

from cerebras.cloud.sdk import Cerebras, RateLimitError

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_PATH = BASE_DIR / "data" / "raw" / "schemes_normalized.json"
EXTRACTED_DIR = BASE_DIR / "data" / "extracted"
FAILURES_PATH = EXTRACTED_DIR / "_failures.jsonl"

MODEL = "gpt-oss-120b"
# Optional cap for quick test runs, e.g. MAX_SCHEMES=20 python pipeline/extract.py
MAX_SCHEMES = int(os.environ.get("MAX_SCHEMES", "0")) or None
# Cerebras free tier caps requests at 5/minute AND 150/hour. 5/min alone
# would be 300/hour, blowing past the hourly cap — 24s spacing (150/hour)
# is the binding constraint for a long sustained run.
REQUEST_INTERVAL_SECONDS = 24.0
RATE_LIMIT_BACKOFF_SECONDS = [30, 60, 120, 240, 240]  # on 429s beyond the SDK's own retries

SYSTEM_PROMPT = (
    "You convert Indian government scheme eligibility text into structured JSON. "
    "You never guess or infer values that are not explicitly stated in the source text — "
    "if a field is not mentioned, it means 'no restriction' and must be null."
)

# Strict JSON Schema for Cerebras structured outputs — the API guarantees the
# response conforms to this exactly (every property present, correct types),
# so occupation/gender/etc. are expressed as nullable rather than optional.
RESPONSE_JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "scheme_name", "occupation", "gender", "age_min", "age_max",
        "max_annual_income", "category", "state", "is_bpl_required",
        "is_disabled_targeted", "residency", "other_conditions",
        "benefits_summary", "documents_required", "application_link",
    ],
    "properties": {
        "scheme_name": {"type": "string"},
        "occupation": {"type": ["array", "null"], "items": {"type": "string"}},
        "gender": {"type": ["string", "null"], "enum": ["male", "female", "any", None]},
        "age_min": {"type": ["integer", "null"]},
        "age_max": {"type": ["integer", "null"]},
        "max_annual_income": {"type": ["integer", "null"]},
        "category": {
            "type": ["array", "null"],
            "items": {"type": "string", "enum": ["SC", "ST", "OBC", "EWS", "general"]},
        },
        "state": {"type": ["array", "null"], "items": {"type": "string"}},
        "is_bpl_required": {"type": ["boolean", "null"]},
        "is_disabled_targeted": {"type": ["boolean", "null"]},
        "residency": {"type": ["string", "null"], "enum": ["rural", "urban", "any", None]},
        "other_conditions": {"type": "array", "items": {"type": "string"}},
        "benefits_summary": {"type": "string"},
        "documents_required": {"type": "array", "items": {"type": "string"}},
        "application_link": {"type": ["string", "null"]},
    },
}


class SchemeEligibility(BaseModel):
    scheme_name: str
    occupation: Optional[List[str]] = None
    gender: Optional[Literal["male", "female", "any"]] = None
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    max_annual_income: Optional[int] = None
    category: Optional[List[Literal["SC", "ST", "OBC", "EWS", "general"]]] = None
    state: Optional[List[str]] = None
    is_bpl_required: Optional[bool] = None
    is_disabled_targeted: Optional[bool] = None
    residency: Optional[Literal["rural", "urban", "any"]] = None
    other_conditions: List[str] = Field(default_factory=list)
    benefits_summary: str
    documents_required: List[str] = Field(default_factory=list)
    application_link: Optional[str] = None


_last_call_time = 0.0


def _rate_limit() -> None:
    """Block until at least REQUEST_INTERVAL_SECONDS has passed since the
    previous API call, to stay under the free-tier request cap."""
    global _last_call_time
    elapsed = time.monotonic() - _last_call_time
    if elapsed < REQUEST_INTERVAL_SECONDS:
        time.sleep(REQUEST_INTERVAL_SECONDS - elapsed)
    _last_call_time = time.monotonic()


def build_prompt(scheme: dict) -> str:
    return f"""Convert this Indian government scheme's eligibility information into the required JSON schema.

Scheme name: {scheme.get('scheme_name') or ''}
Description: {scheme.get('description') or ''}
Eligibility text: {scheme.get('eligibility_text') or ''}
Benefits (raw, may overlap with eligibility text): {scheme.get('benefits') or ''}
Application link (raw): {scheme.get('application_link') or ''}

Rules:
- category: ONLY social/caste category (SC, ST, OBC, EWS, general). Never put marital status, occupation, gender, or any other eligibility criterion here, even if the source text calls it a "category" — those belong in other_conditions instead.
- benefits_summary: 1-2 lines summarizing the benefit.
- other_conditions: anything eligibility-related that doesn't fit the other fields (marital status, family structure, employment status, etc.), in plain English. Empty list if none.
- documents_required: only documents explicitly mentioned in the text. Empty list if none.
- Every other field: null unless the source text explicitly states a restriction. Never guess."""


def call_cerebras(client: Cerebras, messages: list) -> str:
    """Call the API with our own rate-limit pacing plus a backoff loop for
    429s that slip through despite it (the SDK's own max_retries=2 isn't
    enough ground for an hours-long unattended run)."""
    last_error: Optional[Exception] = None
    for backoff in [None, *RATE_LIMIT_BACKOFF_SECONDS]:
        if backoff is not None:
            time.sleep(backoff)
        _rate_limit()
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "scheme_eligibility",
                        "strict": True,
                        "schema": RESPONSE_JSON_SCHEMA,
                    },
                },
            )
            return response.choices[0].message.content.strip()
        except RateLimitError as e:
            last_error = e
            continue
    raise last_error


def strip_markdown_fence(text: str) -> str:
    """Defensive cleanup in case the model wraps its JSON in ``` fences."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


def parse_and_validate(raw_text: str) -> SchemeEligibility:
    cleaned = strip_markdown_fence(raw_text)
    data = json.loads(cleaned)
    return SchemeEligibility.model_validate(data)


def extract_scheme(client: Cerebras, scheme: dict) -> Tuple[Optional[SchemeEligibility], Optional[str]]:
    """Call Cerebras, validate the response, retry once on failure. Returns
    (result, error) — exactly one is None."""
    prompt = build_prompt(scheme)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    try:
        raw = call_cerebras(client, messages)
        return parse_and_validate(raw), None
    except (json.JSONDecodeError, ValidationError) as e:
        first_error = str(e)
    except Exception as e:
        # Network / API errors — don't retry with error-context, just report
        # and move on so one bad request can't crash the whole run.
        return None, f"API error: {e}"

    messages.append({"role": "assistant", "content": raw})
    messages.append({
        "role": "user",
        "content": (
            "Your previous response was not valid JSON matching the schema. "
            f"Error: {first_error}\n\n"
            "Respond again with the corrected JSON object."
        ),
    })
    try:
        raw2 = call_cerebras(client, messages)
        return parse_and_validate(raw2), None
    except (json.JSONDecodeError, ValidationError) as e:
        return None, f"Validation failed after retry: {e}"
    except Exception as e:
        return None, f"API error on retry: {e}"


def main() -> int:
    load_dotenv()
    api_key = os.environ.get("CEREBRAS_API_KEY")
    if not api_key:
        print("CEREBRAS_API_KEY not set. Copy .env.example to .env and add your key.")
        return 1

    if not RAW_PATH.exists():
        print(f"Normalized dataset not found at {RAW_PATH}. Run pipeline/download.py first.")
        return 1

    with open(RAW_PATH, "r", encoding="utf-8") as f:
        schemes = json.load(f)

    if MAX_SCHEMES is not None:
        schemes = schemes[:MAX_SCHEMES]
    EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)

    client = Cerebras(api_key=api_key)

    succeeded = 0
    failed = 0
    skipped = 0

    for scheme in tqdm(schemes, desc="Extracting schemes"):
        name = scheme.get("scheme_name") or "unknown-scheme"
        slug = slugify(name)
        out_path = EXTRACTED_DIR / f"{slug}.json"

        if out_path.exists():
            skipped += 1
            continue

        result, error = extract_scheme(client, scheme)

        if result is not None:
            payload = result.model_dump()
            payload["date_added"] = datetime.now(timezone.utc).isoformat()
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
            succeeded += 1
        else:
            failed += 1
            with open(FAILURES_PATH, "a", encoding="utf-8") as f:
                f.write(json.dumps({"scheme_name": name, "slug": slug, "error": error}, ensure_ascii=False) + "\n")

    print("\n" + "=" * 40)
    print("Extraction summary")
    print("=" * 40)
    print(f"Succeeded: {succeeded}")
    print(f"Failed:    {failed}")
    print(f"Skipped (already done): {skipped}")
    print(f"Total processed this run: {succeeded + failed}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
