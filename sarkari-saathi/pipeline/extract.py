"""
extract.py — Convert free-text eligibility criteria into structured JSON
using the LLM configured in pipeline/llm.py (NVIDIA by default), for every
scheme in the normalized dataset (set MAX_SCHEMES env var to limit this for a
quick test run).

Resumable: schemes whose output file already exists are skipped. This is
a long-running job for the full dataset, paced by REQUEST_INTERVAL_SECONDS to
stay under the provider's rate limit (safely interruptible and resumable).
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

import llm  # noqa: E402
from llm import RateLimitError  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_PATH = BASE_DIR / "data" / "raw" / "schemes_normalized.json"
EXTRACTED_DIR = BASE_DIR / "data" / "extracted"
FAILURES_PATH = EXTRACTED_DIR / "_failures.jsonl"

# Optional cap for quick test runs, e.g. MAX_SCHEMES=20 python pipeline/extract.py
MAX_SCHEMES = int(os.environ.get("MAX_SCHEMES", "0")) or None
# NVIDIA's free hosted tier allows roughly 40 requests/minute; 2s spacing
# (~30/min) stays comfortably under that. Override with LLM_REQUEST_INTERVAL.
REQUEST_INTERVAL_SECONDS = float(os.environ.get("LLM_REQUEST_INTERVAL", "2.0"))
RATE_LIMIT_BACKOFF_SECONDS = [30, 60, 120, 240, 240]  # on 429s beyond the SDK's own retries

SYSTEM_PROMPT = (
    "You convert Indian government scheme eligibility text into structured JSON. "
    "You never guess or infer values that are not explicitly stated in the source text — "
    "if a field is not mentioned, it means 'no restriction' and must be null."
)

# Strict JSON Schema for structured outputs — every property present, correct
# types, so occupation/gender/etc. are expressed as nullable rather than
# optional. (Responses are still validated with pydantic below.)
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
Level (raw): {scheme.get('state_or_ministry') or ''}

Rules:
- state: list of Indian states/Union Territories the scheme is limited to. Set it whenever the text says applicants must be residents / natives / domiciled in a state or UT (e.g. "resident of Jharkhand", "native of the Union Territory of Pondicherry"), or the scheme is clearly run by a single state. Use the standard state name. null only for all-India/central schemes.
- gender: "female" if the scheme is only for women/girls, "male" if only for men/boys, "any" if explicitly open to all, otherwise null.
- age_min / age_max: set whenever an age limit or age range is stated, in years.
- occupation: list the occupations/worker types the scheme targets (e.g. farmer, student, construction worker) when stated; null if open to everyone.
- category: null unless the text restricts the scheme to specific social/caste categories; if it is open to all categories, use null (not "general"). ONLY social/caste category (SC, ST, OBC, EWS, general). Never put marital status, occupation, gender, or any other eligibility criterion here, even if the source text calls it a "category" — those belong in other_conditions instead.
- benefits_summary: 1-2 lines summarizing the benefit.
- other_conditions: anything eligibility-related that doesn't fit the other fields (marital status, family structure, employment status, etc.), in plain English. Empty list if none.
- documents_required: only documents explicitly mentioned in the text. Empty list if none.
- Every other field: null unless the source text explicitly states a restriction. Never guess."""


def call_llm(client, messages: list) -> str:
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
                model=llm.get_model(),
                messages=messages,
                temperature=0,
                max_tokens=2048,
                extra_body=llm.EXTRA_BODY,
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


def extract_scheme(client, scheme: dict) -> Tuple[Optional[SchemeEligibility], Optional[str]]:
    """Call the LLM, validate the response, retry once on failure. Returns
    (result, error) — exactly one is None."""
    prompt = build_prompt(scheme)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    try:
        raw = call_llm(client, messages)
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
        raw2 = call_llm(client, messages)
        return parse_and_validate(raw2), None
    except (json.JSONDecodeError, ValidationError) as e:
        return None, f"Validation failed after retry: {e}"
    except Exception as e:
        return None, f"API error on retry: {e}"


def main() -> int:
    load_dotenv()
    client = llm.get_client()
    if client is None:
        print("NVIDIA_API_KEY not set. Copy .env.example to .env and add your key.")
        return 1

    if not RAW_PATH.exists():
        print(f"Normalized dataset not found at {RAW_PATH}. Run pipeline/download.py first.")
        return 1

    with open(RAW_PATH, "r", encoding="utf-8") as f:
        schemes = json.load(f)

    if MAX_SCHEMES is not None:
        schemes = schemes[:MAX_SCHEMES]
    EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)

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
