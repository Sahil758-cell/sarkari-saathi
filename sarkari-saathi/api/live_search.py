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
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import llm
import matcher
from api import web_search

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "pipeline"))
import extract as extract_pipeline  # noqa: E402
from utils import slugify  # noqa: E402

MAX_CONTEXT_CHARS = 12000
# At least this share of the query's distinctive words must appear in the
# fetched pages, otherwise the pages are about something else and are ignored.
MIN_TOKEN_COVERAGE = 0.6
_STOP_WORDS = {"the", "and", "for", "scheme", "yojana", "yojna", "under", "pradhan", "mantri"}


def _tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", text.lower()) if len(t) > 2}


COLLECTION = "live_schemes"
log = logging.getLogger("live_search")


def _lookup_cache(query: str) -> list[dict]:
    return matcher.search_live_cache(query, limit=5, lang="en")


def _same_scheme_in_dataset(name: str, states: Optional[list[str]] = None) -> Optional[dict]:
    """The curated dataset may already have this scheme under a slightly
    different search term — never store a duplicate of it. Same-named schemes of
    different states (e.g. "Mukhyamantri Annapurna Yojana") are NOT duplicates."""
    target = name.strip().lower()
    wanted = {x.lower() for x in (states or []) if x}
    for candidate in matcher.search_by_name(name, limit=5):
        existing = candidate["scheme_name"].strip().lower()
        if existing != target and difflib.SequenceMatcher(None, existing, target).ratio() < 0.92:
            continue
        theirs = {x.lower() for x in (candidate.get("state") or []) if x}
        if wanted and theirs and not (wanted & theirs):
            continue  # same name, different state
        return candidate
    return None


# News portals report a scheme's approval but aren't where anyone applies or
# reads the rules, so they're the last choice for the "official page" link.
_NEWS_HOSTS = ("newsonair.gov.in", "ddnews.gov.in", "prasarbharati.gov.in", "airnews", "indiaculture")


def _best_source_url(results: list[dict], states: Optional[list[str]] = None) -> str:
    """The most useful official page among the search results: one about the
    scheme's own state first (so a same-named scheme of another state is never
    linked), then a scheme / ministry page, press releases and PDFs next, news
    portals last."""
    names = [s.lower() for s in (states or []) if s]

    def rank(r: dict) -> tuple[int, int]:
        text = f"{r['title']} {r['content']} {r['url']}".lower()
        wrong_state = 1 if names and not any(n in text for n in names) else 0
        host = urlparse(r["url"]).netloc.lower()
        if any(h in host for h in _NEWS_HOSTS):
            kind = 2
        elif host.endswith("pib.gov.in") or r["url"].lower().endswith(".pdf"):
            kind = 1
        else:
            kind = 0
        return wrong_state, kind

    return min(results, key=rank)["url"]  # min() is stable: ties keep search order


_APPLY_WORDS = ("apply", "application", "registration", "register", "enrol", "login", "portal")


def _find_apply_link(scheme_name: str) -> Optional[str]:
    """Look for the page where people actually apply for the scheme (a portal /
    application / registration page). Returns None when there isn't one —
    many central schemes (funding to states, infrastructure, statistics) have
    no application at all, and a news page must never be passed off as one."""
    results = web_search.search_gov_sites(
        f"{scheme_name} apply online application registration portal", max_results=6
    )
    name_words = _tokens(scheme_name) - _STOP_WORDS
    best, best_score = None, 0
    for r in results:
        url, host = r["url"], urlparse(r["url"]).netloc.lower()
        if any(h in host for h in _NEWS_HOSTS) or host.endswith("pib.gov.in"):
            continue
        # The page must be about this scheme, not just any apply page.
        page_words = _tokens(r["title"] + " " + r["content"] + " " + url)
        if name_words and len(name_words & page_words) / len(name_words) < MIN_TOKEN_COVERAGE:
            continue
        score = 2 * sum(w in url.lower() for w in _APPLY_WORDS)
        score += sum(w in r["title"].lower() for w in _APPLY_WORDS)
        if url.lower().endswith(".pdf"):
            score -= 3  # a booklet, not the place to apply
        if any(w in url.lower() for w in ("status", "check", "faq", "guideline")):
            score -= 2
        # A website dedicated to the scheme (pmvishwakarma.gov.in): its home
        # page is the portal to apply from.
        site = host.replace("www.", "").split(".")[0]
        if len(site) >= 6 and any(w in site for w in name_words if len(w) >= 5):
            url, score = f"https://{host}/", score + 6
        if score > best_score:
            best, best_score = url, score
    return best


_STATES = {
    "andhra pradesh": "Andhra Pradesh", "arunachal": "Arunachal Pradesh", "assam": "Assam",
    "bihar": "Bihar", "chhattisgarh": "Chhattisgarh", "goa": "Goa", "gujarat": "Gujarat",
    "haryana": "Haryana", "himachal": "Himachal Pradesh", "jharkhand": "Jharkhand",
    "karnataka": "Karnataka", "kerala": "Kerala", "madhya pradesh": "Madhya Pradesh",
    "maharashtra": "Maharashtra", "manipur": "Manipur", "meghalaya": "Meghalaya",
    "mizoram": "Mizoram", "nagaland": "Nagaland", "odisha": "Odisha", "orissa": "Odisha",
    "punjab": "Punjab", "rajasthan": "Rajasthan", "sikkim": "Sikkim", "tamil nadu": "Tamil Nadu",
    "telangana": "Telangana", "tripura": "Tripura", "uttar pradesh": "Uttar Pradesh",
    "uttarakhand": "Uttarakhand", "west bengal": "West Bengal", "westbengal": "West Bengal",
    "jammu": "Jammu and Kashmir", "ladakh": "Ladakh", "puducherry": "Puducherry",
}
MAX_GROUPS = 3


def _page_state(r: dict) -> Optional[str]:
    """Which state a search result is about (None for central / unknown)."""
    text = f"{urlparse(r['url']).netloc} {r['title']} {r['content'][:500]}".lower()
    counts: dict[str, int] = {}
    for alias, state in _STATES.items():
        n = len(re.findall(rf"(?<![a-z]){re.escape(alias)}(?![a-z])", text))
        if n:
            counts[state] = counts.get(state, 0) + n
    return max(counts, key=counts.get) if counts else None


def _coverage(wanted: set[str], r: dict) -> float:
    page = _tokens(f"{r['title']} {r['content']} {r['url']}")
    return len(wanted & page) / len(wanted) if wanted else 1.0


def _group_by_scheme(query: str, results: list[dict]) -> list[list[dict]]:
    """Split the search results into one group per distinct scheme. Several
    states can have a scheme with the same name, and mixing their pages would
    produce a record that is wrong for all of them, so each state's pages are
    read separately. Pages that name the whole query come first; pages that
    only share part of it are used only when nothing matches the full name."""
    wanted = _tokens(query) - _STOP_WORDS
    full = [r for r in results if _coverage(wanted, r) >= 1.0]
    results = full or [r for r in results if _coverage(wanted, r) >= 0.5]

    groups: dict[Optional[str], list[dict]] = {}
    for r in results:
        groups.setdefault(_page_state(r), []).append(r)
    unknown = groups.pop(None, [])
    if not groups:
        return [unknown] if unknown else []
    ordered = sorted(groups.values(), key=len, reverse=True)[:MAX_GROUPS]
    ordered[0] = ordered[0] + unknown  # pages with no state: most likely the main scheme
    return ordered


def _extract_group(client, query: str, results: list[dict]) -> Optional[dict]:
    text = "\n\n".join(f"Source: {r['title']} ({r['url']})\n{r['content']}" for r in results)
    text = text[:MAX_CONTEXT_CHARS]

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
            "At most 8 items; skip anything minor. "
            "All sources are about ONE scheme; if one of them is clearly about a different "
            "scheme, ignore it and never mix facts. Prefer the sources that describe the "
            "scheme most completely (official launch notices, guidelines) over short notices."
        ),
        "eligibility_text": text,
        "benefits": "",
        "application_link": "",
        "state_or_ministry": "",
    }
    extracted, error = extract_pipeline.extract_scheme(client, raw)
    if extracted is None:
        if error and error.startswith("API error"):
            raise RuntimeError(error)  # provider problem, not "no such scheme"
        return None

    data = extracted.model_dump()
    if not data.get("state"):
        state = _page_state(results[0])
        data["state"] = [state] if state else None

    duplicate = _same_scheme_in_dataset(data["scheme_name"], data.get("state"))
    if duplicate is not None:
        return duplicate  # already in the curated dataset — use that record

    # application_link is ONLY a real apply/registration page (or None);
    # source_url is the official page the details were read from.
    data["application_link"] = _find_apply_link(data["scheme_name"])
    data["source_url"] = _best_source_url(results, data.get("state"))
    data["verified"] = False  # LLM-read from web pages; flip to True after a manual review
    data["source"] = "web"
    data["searched_as"] = [query.lower()]  # so the same wording hits the cache next time
    data["source_urls"] = [r["url"] for r in results]
    data["date_added"] = datetime.now(timezone.utc).isoformat()

    # State in the slug: two states can have a scheme with the same name.
    slug = "web-" + slugify(data["scheme_name"])
    if data.get("state"):
        slug += "-" + slugify(data["state"][0])
    try:
        _write_local(slug, data)
    except OSError:
        pass  # caching is best-effort; the result is still returned

    data["_slug"] = slug
    data["_new"] = True  # tells the endpoint to also save it to Firestore
    return data


def _fetch_and_extract(query: str) -> list[dict]:
    results = web_search.search_gov_sites(
        f"{query} scheme eligibility benefits how to apply", max_results=8, deep=True
    )
    groups = _group_by_scheme(query, results)
    if not groups:
        return []  # nothing found is actually about this scheme

    client = llm.get_client()
    if client is None:
        raise RuntimeError("NVIDIA_API_KEY not configured")

    with ThreadPoolExecutor(max_workers=len(groups)) as pool:
        found = list(pool.map(lambda g: _extract_group(client, query, g), groups))
    schemes, seen = [], set()
    for sc in found:
        if sc is not None and sc["_slug"] not in seen:
            seen.add(sc["_slug"])
            schemes.append(sc)
    return schemes


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


def find_schemes(query: str, lang: str = "en") -> list[dict]:
    """Schemes (each with `_slug`) matching a query: earlier live finds first,
    otherwise a fresh search of official sites — one scheme per state when
    several states share the name. [] if nothing relevant was found. Raises
    RuntimeError / openai errors if the LLM provider fails."""
    query = query.strip()
    if len(query) < 3:
        return []

    schemes = _lookup_cache(query) or _fetch_and_extract(query)
    if lang == "hi":
        return [matcher.ensure_translated(sc, sc["_slug"]) for sc in schemes]
    return schemes
