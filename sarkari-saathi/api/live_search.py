"""
live_search.py — Fallback for /search when a scheme isn't in the local
dataset: search official gov.in websites, have the LLM turn what was found
into the same structured scheme record the rest of the app uses, and cache it
so the normal scheme detail / eligibility endpoints work for it.

Found schemes get a "web-" slug prefix and are stored in data/live_cache/
(kept apart from the curated data/extracted/, so they never show up in /match
or the regular search). The cache is a plain folder: on Render's free tier it
resets when the service restarts, which just means the scheme is looked up
again next time it's searched.
"""
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import llm
import matcher
from api import web_search

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "pipeline"))
import extract as extract_pipeline  # noqa: E402
from utils import slugify  # noqa: E402

MAX_CONTEXT_CHARS = 8000
# At least this share of the query's distinctive words must appear in the
# fetched pages, otherwise the pages are about something else and are ignored.
MIN_TOKEN_COVERAGE = 0.6
_STOP_WORDS = {"the", "and", "for", "scheme", "yojana", "yojna", "under", "pradhan", "mantri"}


def _tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", text.lower()) if len(t) > 2}


def _lookup_cache(query: str) -> Optional[dict]:
    q = query.strip().lower()
    if not matcher.LIVE_CACHE_DIR.exists():
        return None
    for path in matcher.LIVE_CACHE_DIR.glob("*.json"):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError):
            continue
        name = (data.get("scheme_name") or "").lower()
        if q in (data.get("searched_as") or []) or (
            name and (q in name or (len(name) >= 8 and name in q))
        ):
            data["_slug"] = path.stem
            return data
    return None


def _fetch_and_extract(query: str) -> Optional[dict]:
    results = web_search.search_gov_sites(
        f"{query} scheme eligibility benefits how to apply", max_results=4, deep=True
    )
    if not results:
        return None

    text = "\n\n".join(f"Source: {r['title']} ({r['url']})\n{r['content']}" for r in results)
    text = text[:MAX_CONTEXT_CHARS]

    wanted = _tokens(query) - _STOP_WORDS
    if wanted and len(wanted & _tokens(text)) / len(wanted) < MIN_TOKEN_COVERAGE:
        return None  # the pages found aren't about this scheme

    client = llm.get_client()
    if client is None:
        raise RuntimeError("NVIDIA_API_KEY not configured")

    raw = {
        # The user may have typed an acronym or partial name ("PM-VBRY"); the
        # record must carry the scheme's full official name from the sources.
        "scheme_name": f'(use the scheme\'s full official name from the sources; the user searched for "{query}")',
        "description": "Search results from official Indian government websites.",
        "eligibility_text": text,
        "benefits": "",
        "application_link": results[0]["url"],
        "state_or_ministry": "",
    }
    extracted, error = extract_pipeline.extract_scheme(client, raw)
    if extracted is None:
        if error and error.startswith("API error"):
            raise RuntimeError(error)  # provider problem, not "no such scheme"
        return None

    data = extracted.model_dump()
    data["application_link"] = results[0]["url"]  # always an official gov.in page
    data["source"] = "web"
    data["searched_as"] = [query.lower()]  # so the same wording hits the cache next time
    data["source_urls"] = [r["url"] for r in results]
    data["date_added"] = datetime.now(timezone.utc).isoformat()

    slug = "web-" + slugify(data["scheme_name"])
    try:
        matcher.LIVE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with open(matcher.LIVE_CACHE_DIR / f"{slug}.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except OSError:
        pass  # caching is best-effort; the result is still returned

    data["_slug"] = slug
    return data


def find_scheme(query: str, lang: str = "en") -> Optional[dict]:
    """Returns a scheme dict (with `_slug`) or None if nothing relevant was
    found. Raises RuntimeError / openai errors if the LLM provider fails."""
    query = query.strip()
    if len(query) < 3:
        return None

    scheme = _lookup_cache(query) or _fetch_and_extract(query)
    if scheme is None:
        return None
    if lang == "hi":
        return matcher.ensure_translated(scheme, scheme["_slug"])
    return scheme
