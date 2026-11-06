"""
live_search.py — Fallback for /search when a scheme isn't in the local
dataset: search official gov.in websites, have the LLM turn what was found
into the same structured scheme record the rest of the app uses, and cache it
so the normal scheme detail / eligibility endpoints work for it.

Found schemes get a "web-" slug prefix. They are kept apart from the curated
data/extracted/ dataset (so they never show up in /match, whose scoring
assumes carefully extracted rules) but ARE searchable by name and have their
own detail page.

Persistence: a local folder (data/live_cache/) serves requests, and every new
scheme is also saved to Firestore in the background (collection
"live_schemes", flagged verified=False for review). Render's free tier wipes
the disk on every restart, so sync_from_firestore() refills the folder at
startup — the dataset keeps growing with every search that finds something new.
"""
import difflib
import json
import logging
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


COLLECTION = "live_schemes"
log = logging.getLogger("live_search")


def _lookup_cache(query: str) -> Optional[dict]:
    hits = matcher.search_live_cache(query, limit=1, lang="en")
    return hits[0] if hits else None


def _same_scheme_in_dataset(name: str) -> Optional[dict]:
    """The curated dataset may already have this scheme under a slightly
    different search term — never store a duplicate of it."""
    target = name.strip().lower()
    for candidate in matcher.search_by_name(name, limit=5):
        existing = candidate["scheme_name"].strip().lower()
        if existing == target or difflib.SequenceMatcher(None, existing, target).ratio() >= 0.92:
            return candidate
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
        "description": (
            "Search results from official Indian government websites. "
            "Formatting rules for the output: each other_conditions item must be ONE short line "
            "(at most 12 words) stating a single eligibility criterion — who qualifies or what "
            "they must have/do. Do NOT put benefit amounts, how the benefit is paid, or "
            "explanations in other_conditions (those belong in benefits_summary). "
            "At most 8 items; skip anything minor."
        ),
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

    duplicate = _same_scheme_in_dataset(data["scheme_name"])
    if duplicate is not None:
        return duplicate  # already in the curated dataset — use that record

    data["application_link"] = results[0]["url"]  # always an official gov.in page
    data["verified"] = False  # LLM-read from web pages; flip to True after a manual review
    data["source"] = "web"
    data["searched_as"] = [query.lower()]  # so the same wording hits the cache next time
    data["source_urls"] = [r["url"] for r in results]
    data["date_added"] = datetime.now(timezone.utc).isoformat()

    slug = "web-" + slugify(data["scheme_name"])
    try:
        _write_local(slug, data)
    except OSError:
        pass  # caching is best-effort; the result is still returned

    data["_slug"] = slug
    data["_new"] = True  # tells the endpoint to also save it to Firestore
    return data


def _storable(scheme: dict) -> dict:
    return {k: v for k, v in scheme.items() if not k.startswith("_")}


def persist_to_firestore(scheme: dict) -> None:
    """Save a newly found scheme to the permanent database. Runs as a
    background task after the response was sent; never raises."""
    try:
        from firebase_admin import firestore

        from api.firestore_client import get_db

        slug = scheme["_slug"]
        ref = get_db().collection(COLLECTION).document(slug)
        queries = scheme.get("searched_as") or []
        if ref.get().exists:
            # Keep the stored (possibly reviewed) record; just remember the new wording.
            if queries:
                ref.update({"searched_as": firestore.ArrayUnion(queries)})
        else:
            ref.set(_storable(scheme))
        log.info("live scheme saved to Firestore: %s", slug)
    except Exception as e:  # noqa: BLE001 — background best-effort
        log.warning("could not save live scheme to Firestore: %s", e)


def _write_local(slug: str, data: dict) -> None:
    matcher.LIVE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with open(matcher.LIVE_CACHE_DIR / f"{slug}.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def sync_from_firestore() -> int:
    """Refill the local folder from Firestore (called in a background thread
    at startup, since the disk is empty after every restart). Returns how many
    schemes were loaded; never raises."""
    try:
        from api.firestore_client import get_db

        count = 0
        for doc in get_db().collection(COLLECTION).stream():
            _write_local(doc.id, doc.to_dict())
            count += 1
        log.info("loaded %d live schemes from Firestore", count)
        return count
    except Exception as e:  # noqa: BLE001
        log.warning("could not load live schemes from Firestore: %s", e)
        return 0


def load_from_firestore(slug: str) -> bool:
    """Fetch one scheme (e.g. a shared detail link opened before the startup
    sync finished) into the local folder. Returns True if found."""
    try:
        from api.firestore_client import get_db

        doc = get_db().collection(COLLECTION).document(slug).get()
        if not doc.exists:
            return False
        _write_local(slug, doc.to_dict())
        return True
    except Exception as e:  # noqa: BLE001
        log.warning("could not load %s from Firestore: %s", slug, e)
        return False


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
