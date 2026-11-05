"""
translate.py — Translates each already-extracted scheme's display text
(scheme_name, benefits_summary, other_conditions, documents_required) into
Hindi, using the LLM configured in pipeline/llm.py (NVIDIA by default),
writing to data/extracted_hi/<slug>.json.

Mirrors pipeline/extract.py's pacing/resume/retry pattern exactly (same
rate limit, same skip-if-output-exists resumability, same failure log).
Set MAX_SCHEMES env var to limit a run for a quick test, e.g.
MAX_SCHEMES=5 python pipeline/translate.py

Critical: the output filename reuses the INPUT record's existing English
slug (the source filename's stem) — never re-slugify the Hindi text.
pipeline/utils.py's slugify() strips everything outside [a-z0-9], so
Devanagari text would collapse to "untitled-scheme" for every record.
"""
import json
import os
import sys
import time
from pathlib import Path
from typing import List, Optional, Tuple

from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).resolve().parent))
import llm  # noqa: E402
from llm import RateLimitError  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent.parent
EXTRACTED_DIR = BASE_DIR / "data" / "extracted"
EXTRACTED_HI_DIR = BASE_DIR / "data" / "extracted_hi"
FAILURES_PATH = EXTRACTED_HI_DIR / "_failures.jsonl"

MAX_SCHEMES = int(os.environ.get("MAX_SCHEMES", "0")) or None
# Same pacing as extract.py (NVIDIA free tier ~40 req/min).
REQUEST_INTERVAL_SECONDS = float(os.environ.get("LLM_REQUEST_INTERVAL", "2.0"))
RATE_LIMIT_BACKOFF_SECONDS = [30, 60, 120, 240, 240]

SYSTEM_PROMPT = (
    "You translate Indian government scheme descriptions from English to Hindi "
    "(Devanagari script). Keep the meaning precise — this is eligibility and "
    "benefits information citizens rely on. Keep numbers, currency amounts "
    "(₹), and proper nouns (scheme/organization names may stay transliterated "
    "if there's no common Hindi name) accurate. Do not add or omit information."
)

RESPONSE_JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["scheme_name", "benefits_summary", "other_conditions", "documents_required"],
    "properties": {
        "scheme_name": {"type": "string"},
        "benefits_summary": {"type": "string"},
        "other_conditions": {"type": "array", "items": {"type": "string"}},
        "documents_required": {"type": "array", "items": {"type": "string"}},
    },
}


class SchemeTranslation(BaseModel):
    scheme_name: str
    benefits_summary: str
    other_conditions: List[str] = Field(default_factory=list)
    documents_required: List[str] = Field(default_factory=list)


_last_call_time = 0.0


def _rate_limit() -> None:
    global _last_call_time
    elapsed = time.monotonic() - _last_call_time
    if elapsed < REQUEST_INTERVAL_SECONDS:
        time.sleep(REQUEST_INTERVAL_SECONDS - elapsed)
    _last_call_time = time.monotonic()


def build_prompt(scheme: dict) -> str:
    return f"""Translate this Indian government scheme's text fields into Hindi.

Scheme name: {scheme.get('scheme_name') or ''}
Benefits summary: {scheme.get('benefits_summary') or ''}
Other conditions: {json.dumps(scheme.get('other_conditions') or [], ensure_ascii=False)}
Documents required: {json.dumps(scheme.get('documents_required') or [], ensure_ascii=False)}

Return all four fields translated to Hindi, preserving list structure and item count."""


def strip_markdown_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


def call_llm(client, messages: list) -> str:
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
                        "name": "scheme_translation",
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


def parse_and_validate(raw_text: str) -> SchemeTranslation:
    cleaned = strip_markdown_fence(raw_text)
    data = json.loads(cleaned)
    return SchemeTranslation.model_validate(data)


def translate_scheme(client, scheme: dict) -> Tuple[Optional[SchemeTranslation], Optional[str]]:
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
        return None, f"API error: {e}"

    messages.append({"role": "assistant", "content": raw})
    messages.append({
        "role": "user",
        "content": (
            "Your previous response was not valid JSON matching the schema. "
            f"Error: {first_error}\n\nRespond again with the corrected JSON object."
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

    if not EXTRACTED_DIR.exists():
        print(f"{EXTRACTED_DIR} not found. Run pipeline/extract.py first.")
        return 1

    source_paths = sorted(EXTRACTED_DIR.glob("*.json"))
    if MAX_SCHEMES is not None:
        source_paths = source_paths[:MAX_SCHEMES]
    EXTRACTED_HI_DIR.mkdir(parents=True, exist_ok=True)

    succeeded = 0
    failed = 0
    skipped = 0

    for path in tqdm(source_paths, desc="Translating schemes"):
        slug = path.stem  # reuse the existing English slug — never re-slugify Hindi text
        out_path = EXTRACTED_HI_DIR / f"{slug}.json"

        if out_path.exists():
            skipped += 1
            continue

        with open(path, "r", encoding="utf-8") as f:
            scheme = json.load(f)

        result, error = translate_scheme(client, scheme)

        if result is not None:
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(result.model_dump(), f, ensure_ascii=False, indent=2)
            succeeded += 1
        else:
            failed += 1
            with open(FAILURES_PATH, "a", encoding="utf-8") as f:
                f.write(json.dumps({"slug": slug, "error": error}, ensure_ascii=False) + "\n")

    print("\n" + "=" * 40)
    print("Translation summary")
    print("=" * 40)
    print(f"Succeeded: {succeeded}")
    print(f"Failed:    {failed}")
    print(f"Skipped (already done): {skipped}")
    print(f"Total processed this run: {succeeded + failed}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
