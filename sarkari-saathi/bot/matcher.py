"""
matcher.py — Loads extracted scheme JSON files and filters/ranks them
against a citizen's profile. Pure rule-based matching over the structured
fields extract.py produced — no AI call needed at match time, so this works
instantly and for free regardless of LLM rate limits.
"""
import difflib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent
EXTRACTED_DIR = BASE_DIR / "data" / "extracted"
EXTRACTED_HI_DIR = BASE_DIR / "data" / "extracted_hi"
RAW_NORMALIZED_PATH = BASE_DIR / "data" / "raw" / "schemes_normalized.json"

sys.path.insert(0, str(BASE_DIR / "pipeline"))
from utils import slugify  # noqa: E402
import llm  # noqa: E402  (shared LLM client — NVIDIA by default)
import extract as extract_pipeline  # noqa: E402  (reused for on-demand single-scheme extraction)
import translate as translate_pipeline  # noqa: E402  (reused for on-demand single-scheme translation)

_LOCALIZABLE_FIELDS = ("scheme_name", "benefits_summary", "other_conditions", "documents_required")

_portal_slug_lookup: Optional[dict] = None
_raw_schemes_cache: Optional[list] = None
_raw_trigram_index: Optional[list] = None


def load_schemes() -> list:
    """Load every extracted scheme JSON file. Called per-match (not cached
    at import time) so newly-extracted schemes show up without a restart —
    the extraction job keeps adding files in the background."""
    schemes = []
    if not EXTRACTED_DIR.exists():
        return schemes
    for path in EXTRACTED_DIR.glob("*.json"):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            data["_slug"] = path.stem
            schemes.append(data)
        except (json.JSONDecodeError, OSError):
            continue  # skip unreadable files rather than crash the bot
    return schemes


def _localize(scheme: dict, slug: str, lang: str) -> dict:
    """Overlay Hindi text onto an (always-English) scheme record when
    lang == 'hi' and a translation exists yet — data/extracted_hi/ fills in
    gradually via pipeline/translate.py, same rollout shape as extraction
    itself, so an untranslated scheme just falls back to English rather
    than erroring. Only the four display-text fields are ever overlaid —
    every field used for eligibility scoring (age/gender/state/category/
    income/etc.) stays untouched, so this is always safe to apply after
    matching/filtering has already happened on the English data."""
    if lang != "hi":
        return scheme
    hi_path = EXTRACTED_HI_DIR / f"{slug}.json"
    if not hi_path.exists():
        return scheme
    try:
        with open(hi_path, "r", encoding="utf-8") as f:
            hi_data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return scheme
    localized = dict(scheme)
    for field in _LOCALIZABLE_FIELDS:
        if field in hi_data:
            localized[field] = hi_data[field]
    return localized


def get_latest_schemes(limit: int = 20, lang: str = "en") -> list:
    """Schemes sorted newest-first by date_added. Schemes missing the field
    (pre-dating the backfill, shouldn't happen after it runs) sort last."""
    schemes = load_schemes()
    schemes.sort(key=lambda s: s.get("date_added") or "", reverse=True)
    top = schemes[:limit]
    return [_localize(s, s["_slug"], lang) for s in top]


def _income_bracket_max(bracket: Optional[str]) -> Optional[int]:
    """Map a chosen income bracket to its upper bound in INR, for comparing
    against a scheme's max_annual_income. None means 'skipped / unknown'."""
    return {
        "below_1l": 100_000,
        "1_2l": 200_000,
        "2_5l": 500_000,
        "5_8l": 800_000,
        "above_8l": None,  # no upper bound we can compare against
    }.get(bracket)


def _score_scheme(scheme: dict, profile: dict) -> Optional[int]:
    """Return a match score (higher = more specifically matched) if the
    scheme is a valid candidate for this profile, or None if disqualified
    by a hard mismatch on a field the scheme explicitly restricts."""
    score = 0

    age = profile.get("age")
    if age is not None:
        if scheme.get("age_min") is not None and age < scheme["age_min"]:
            return None
        if scheme.get("age_max") is not None and age > scheme["age_max"]:
            return None
        if scheme.get("age_min") is not None or scheme.get("age_max") is not None:
            score += 1

    gender = profile.get("gender")
    scheme_gender = scheme.get("gender")
    if scheme_gender not in (None, "any"):
        if gender != scheme_gender:
            return None
        score += 1

    state = profile.get("state")
    scheme_states = scheme.get("state")
    if state and scheme_states and not profile.get("_relax_state"):
        if not any(state.lower() == s.lower() for s in scheme_states):
            return None
        score += 1
    elif state and scheme_states and any(state.lower() == s.lower() for s in scheme_states):
        score += 1  # relaxed pass still scores if it happens to match

    category = profile.get("category")
    scheme_categories = scheme.get("category")
    if category and category != "general" and scheme_categories:
        if not any(category.lower() == c.lower() for c in scheme_categories):
            return None
        score += 1

    income_bracket = profile.get("income_bracket")
    max_income = _income_bracket_max(income_bracket)
    if max_income is not None and scheme.get("max_annual_income") is not None:
        if max_income > scheme["max_annual_income"]:
            return None
        score += 1

    if scheme.get("is_bpl_required"):
        if not profile.get("is_bpl"):
            return None
        score += 1

    if scheme.get("is_disabled_targeted"):
        if not profile.get("is_disabled"):
            return None
        score += 1

    residency = profile.get("residency")
    scheme_residency = scheme.get("residency")
    if scheme_residency not in (None, "any") and residency:
        if residency != scheme_residency:
            return None
        score += 1

    occupation = profile.get("occupation")
    scheme_occupations = scheme.get("occupation")
    if occupation and occupation != "other" and scheme_occupations:
        occ_lower = occupation.lower()
        if any(occ_lower in o.lower() or o.lower() in occ_lower for o in scheme_occupations):
            score += 1
        # No hard disqualification here — the extracted vocabulary is
        # free-text, not a controlled taxonomy, so a miss is not reliable
        # evidence of ineligibility.

    return score


def match(profile: dict, limit: Optional[int] = None, lang: str = "en") -> list:
    """Return every scheme that matches the profile, ranked by how
    specifically they match (most criteria matched first) — or the top
    `limit` if one is given. The caller (the bot) is responsible for
    paginating a long result list rather than this function silently
    truncating it. Falls back to relaxing the state filter if a strict pass
    finds nothing, since the dataset may not yet have state-specific
    coverage for every state (extraction is still filling in)."""
    schemes = load_schemes()

    scored = []
    for scheme in schemes:
        s = _score_scheme(scheme, profile)
        if s is not None:
            scored.append((s, scheme))

    if not scored and profile.get("state"):
        relaxed_profile = {**profile, "_relax_state": True}
        for scheme in schemes:
            s = _score_scheme(scheme, relaxed_profile)
            if s is not None:
                scored.append((s, scheme))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    results = [scheme for _, scheme in scored[:limit]]
    return [_localize(s, s["_slug"], lang) for s in results]


def search_by_name(query: str, limit: int = 10, lang: str = "en") -> list:
    """Case-insensitive substring search over *extracted* scheme names —
    used by the /search flow to find a specific scheme by (partial) name.
    Only searches data/extracted/, so a scheme the bulk extraction job
    hasn't reached yet won't show up here — see search_raw_by_name /
    ensure_extracted for the fallback that covers the full dataset.
    Matching always runs against the English name regardless of `lang`
    (Hindi-query fuzzy search is a separate, harder feature) — lang only
    affects which language the *returned* results are displayed in."""
    query_lower = query.strip().lower()
    if not query_lower:
        return []
    schemes = load_schemes()
    matches = [s for s in schemes if query_lower in s["scheme_name"].lower()]
    # Prefer closer matches: shorter names containing the query are more
    # likely to be what the user meant than a long name that happens to
    # contain it as a substring somewhere in the middle.
    matches.sort(key=lambda s: len(s["scheme_name"]))
    results = matches[:limit]
    return [_localize(s, s["_slug"], lang) for s in results]


def _load_raw_schemes() -> list:
    """All ~3400 rows from data/raw/schemes_normalized.json — the full
    dataset regardless of extraction progress. Cached: this file doesn't
    change at runtime (only data/extracted/ keeps growing)."""
    global _raw_schemes_cache
    if _raw_schemes_cache is not None:
        return _raw_schemes_cache
    if not RAW_NORMALIZED_PATH.exists():
        _raw_schemes_cache = []
    else:
        with open(RAW_NORMALIZED_PATH, "r", encoding="utf-8") as f:
            _raw_schemes_cache = json.load(f)
    return _raw_schemes_cache


def _trigrams(s: str) -> set:
    s = "".join(s.lower().split())  # squash whitespace so word boundaries don't cost matches
    if len(s) < 3:
        return {s} if s else set()
    return {s[i:i + 3] for i in range(len(s) - 2)}


def _load_raw_trigram_index() -> list:
    """[(trigram_set, scheme_record), ...] for every raw scheme, built once
    and cached. Trigram-set overlap (cheap set intersection) is used as a
    fast pre-filter so the expensive sliding-window fuzzy comparison in
    _fuzzy_name_score only has to run against a short candidate list instead
    of all ~3400 schemes — that comparison alone was measured at ~10s for a
    full sweep, far too slow for an interactive bot reply."""
    global _raw_trigram_index
    if _raw_trigram_index is not None:
        return _raw_trigram_index
    _raw_trigram_index = [(_trigrams(s["scheme_name"]), s) for s in _load_raw_schemes()]
    return _raw_trigram_index


def _window_ratio(query_l: str, name_l: str) -> float:
    """Best SequenceMatcher ratio of query_l against name_l as a whole, or
    against any similarly-sized window within it — real scheme names are
    often much longer than what a user types (e.g. 'Mukhyamantri - Majhi
    Ladki Bahin Yojana'), so comparing only the full strings would unfairly
    dilute a strong match buried inside a longer name."""
    best = difflib.SequenceMatcher(None, query_l, name_l).ratio()
    window_len = len(query_l)
    if len(name_l) > window_len:
        step = max(1, window_len // 3)
        for start in range(0, len(name_l) - window_len + 1, step):
            ratio = difflib.SequenceMatcher(None, query_l, name_l[start:start + window_len]).ratio()
            if ratio > best:
                best = ratio
    return best


def _fuzzy_name_score(query: str, scheme_name: str) -> float:
    """Fuzzy similarity tolerant of spelling/transliteration variants (e.g.
    'Ladaki bahini jogana' vs 'Ladki Bahin Yojana') that plain substring
    search would miss. Also tries contiguous sub-phrases of the query (not
    just the whole thing), since a user-appended qualifier the scheme's
    literal database name doesn't contain (e.g. '... Maharashtra' when the
    stored name is just 'Mukhyamantri - Majhi Ladki Bahin Yojana') would
    otherwise drag the whole-query score down and let an unrelated scheme
    that happens to literally contain that qualifier word outrank it.
    A pure bag-of-words "does any word match" approach was tried first and
    rejected: long scheme names with many generic words (yojana, sahayata,
    se, ke...) racked up false-positive matches purely from having more
    words to coincidentally match against, unrelated to actual relevance."""
    query_l = query.lower().strip()
    name_l = scheme_name.lower().strip()
    if not query_l or not name_l:
        return 0.0

    best = _window_ratio(query_l, name_l)
    words = query_l.split()
    n = len(words)
    for length in range(n - 1, 1, -1):  # sub-phrases from n-1 words down to 2
        for start in range(0, n - length + 1):
            score = _window_ratio(" ".join(words[start:start + length]), name_l)
            if score > best:
                best = score
    return best


def search_raw_by_name(query: str, limit: int = 5) -> list:
    """Search the full ~3400-row raw dataset (not just what's been
    extracted so far): exact substring match first, then fuzzy word-level
    match as a fallback for misspellings/transliteration variants. Returns
    raw normalized records (scheme_name, description, eligibility_text,
    etc.) — NOT the structured extracted schema; caller must extract before
    this can be used for eligibility checking (see ensure_extracted)."""
    query_lower = query.strip().lower()
    if not query_lower:
        return []
    raw_schemes = _load_raw_schemes()

    exact = [s for s in raw_schemes if query_lower in s["scheme_name"].lower()]
    if exact:
        exact.sort(key=lambda s: len(s["scheme_name"]))
        return exact[:limit]

    # Cheap trigram-overlap pre-filter to shortlist candidates before the
    # expensive sliding-window fuzzy comparison — see _load_raw_trigram_index.
    query_trigrams = _trigrams(query_lower)
    if not query_trigrams:
        return []
    candidates = []  # (overlap_count, scheme)
    for trigrams, scheme in _load_raw_trigram_index():
        if not trigrams:
            continue
        overlap = len(query_trigrams & trigrams)
        if overlap / len(query_trigrams) >= 0.3:
            candidates.append((overlap, scheme))
    candidates.sort(key=lambda pair: pair[0], reverse=True)
    shortlist = [scheme for _, scheme in candidates[:60]]

    scored = [(_fuzzy_name_score(query, s["scheme_name"]), s) for s in shortlist]
    scored = [(score, s) for score, s in scored if score >= 0.6]
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [s for _, s in scored[:limit]]


def _get_llm_client():
    return llm.get_client()


def ensure_extracted(raw_record: dict) -> Optional[dict]:
    """If `raw_record` (from schemes_normalized.json) hasn't been extracted
    yet, extract it right now with a single on-demand LLM call — so a
    user searching for a specific scheme doesn't have to wait for the bulk
    background job to reach it days later. Result is cached to disk exactly
    like the bulk job's output, so it benefits every future search too.
    Blocking/synchronous (the LLM SDK call is sync) — call via
    asyncio.to_thread from the bot so it doesn't stall the event loop.
    Returns the extracted scheme dict, or None if extraction wasn't
    possible (no API key) or failed."""
    name = raw_record.get("scheme_name")
    if not name:
        return None
    slug = slugify(name)

    existing = get_scheme_by_slug(slug)
    if existing is not None:
        return existing

    client = _get_llm_client()
    if client is None:
        return None

    result, _error = extract_pipeline.extract_scheme(client, raw_record)
    if result is None:
        return None

    EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)
    out_path = EXTRACTED_DIR / f"{slug}.json"
    payload = result.model_dump()
    payload["date_added"] = datetime.now(timezone.utc).isoformat()
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    data = dict(payload)
    data["_slug"] = slug
    return data


def ensure_translated(scheme_en: dict, slug: str) -> Optional[dict]:
    """If `scheme_en` (an already-extracted English record) hasn't been
    translated to Hindi yet, translate it right now with a single on-demand
    LLM call — mirrors ensure_extracted()'s on-demand-vs-bulk-job
    pattern. Result is cached to disk exactly like the bulk translate job's
    output, so it benefits every future Hindi request for this scheme too.
    Blocking/synchronous — call via asyncio.to_thread from the bot so it
    doesn't stall the event loop. Returns the localized scheme dict, or the
    unmodified English dict if translation wasn't possible (no API key) or
    failed."""
    hi_path = EXTRACTED_HI_DIR / f"{slug}.json"
    if hi_path.exists():
        return _localize(scheme_en, slug, "hi")

    client = _get_llm_client()
    if client is None:
        return scheme_en

    result, _error = translate_pipeline.translate_scheme(client, scheme_en)
    if result is None:
        return scheme_en

    EXTRACTED_HI_DIR.mkdir(parents=True, exist_ok=True)
    with open(hi_path, "w", encoding="utf-8") as f:
        json.dump(result.model_dump(), f, ensure_ascii=False, indent=2)

    return _localize(scheme_en, slug, "hi")


# Scheme field -> the question to ask about it, if that field states a
# restriction. Used by the /search flow to ask only what's actually needed
# to determine eligibility for a *specific* scheme, instead of the full
# generic profile form. Occupation is deliberately excluded — it's a soft/
# non-disqualifying signal in scoring (see _score_scheme), so asking about
# it here couldn't change the eligible/not-eligible verdict anyway.
def build_question_queue(scheme: dict) -> list:
    """Return an ordered list of {"key", "type", ...} question specs
    describing exactly what to ask for this scheme. An empty list means the
    scheme states no restrictions the bot can check — the user is
    (as far as extraction found) eligible by default."""
    queue = []
    if scheme.get("age_min") is not None or scheme.get("age_max") is not None:
        queue.append({"key": "age", "type": "text"})
    if scheme.get("gender") not in (None, "any"):
        queue.append({"key": "gender", "type": "buttons"})
    if scheme.get("state"):
        queue.append({"key": "state_confirm", "type": "yesno", "states": scheme["state"]})
    if scheme.get("category"):
        queue.append({"key": "category", "type": "buttons"})
    if scheme.get("max_annual_income") is not None:
        queue.append({"key": "income_bracket", "type": "buttons"})
    if scheme.get("is_bpl_required"):
        queue.append({"key": "is_bpl", "type": "yesno"})
    if scheme.get("is_disabled_targeted"):
        queue.append({"key": "is_disabled", "type": "yesno"})
    if scheme.get("residency") not in (None, "any"):
        queue.append({"key": "residency_confirm", "type": "yesno", "residency": scheme["residency"]})
    return queue


def check_eligibility(scheme: dict, profile: dict) -> dict:
    """Detailed single-scheme eligibility check that explains *why* the
    profile doesn't qualify (not just whether it does) — used by the
    /search flow, where the user asked about one specific scheme rather
    than browsing many. Only checks fields build_question_queue actually
    asked about, since profile keys for unasked fields are simply absent."""
    reasons: list = []

    age = profile.get("age")
    if age is not None:
        if scheme.get("age_min") is not None and age < scheme["age_min"]:
            reasons.append(("age_min", scheme["age_min"], age))
        if scheme.get("age_max") is not None and age > scheme["age_max"]:
            reasons.append(("age_max", scheme["age_max"], age))

    if scheme.get("gender") not in (None, "any") and profile.get("gender") != scheme["gender"]:
        reasons.append(("gender", scheme["gender"], profile.get("gender")))

    if scheme.get("state") and profile.get("state") == "_NOT_LISTED_":
        reasons.append(("state", scheme["state"], None))

    category = profile.get("category")
    if scheme.get("category") and category and category != "general":
        if not any(category.lower() == c.lower() for c in scheme["category"]):
            reasons.append(("category", scheme["category"], category))

    max_income = _income_bracket_max(profile.get("income_bracket"))
    if max_income is not None and scheme.get("max_annual_income") is not None:
        if max_income > scheme["max_annual_income"]:
            reasons.append(("income", scheme["max_annual_income"], None))

    if scheme.get("is_bpl_required") and not profile.get("is_bpl"):
        reasons.append(("bpl", None, None))

    if scheme.get("is_disabled_targeted") and not profile.get("is_disabled"):
        reasons.append(("disability", None, None))

    if scheme.get("residency") not in (None, "any") and profile.get("residency") == "_MISMATCH_":
        reasons.append(("residency", scheme["residency"], None))

    return {"eligible": len(reasons) == 0, "reasons": reasons}


def get_scheme_by_slug(slug: str, lang: str = "en") -> Optional[dict]:
    path = EXTRACTED_DIR / f"{slug}.json"
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    data["_slug"] = slug
    return _localize(data, slug, lang)


def _load_portal_slug_lookup() -> dict:
    """Maps our file slug (slugify(scheme_name)) -> the source portal's own
    URL slug (e.g. myScheme.gov.in), so we can offer a real link even for
    schemes whose eligibility text didn't state one. Loaded once and cached
    — data/raw/schemes_normalized.json (~3400 rows) doesn't change at
    runtime, unlike data/extracted/ which keeps growing."""
    global _portal_slug_lookup
    if _portal_slug_lookup is not None:
        return _portal_slug_lookup

    lookup = {}
    if RAW_NORMALIZED_PATH.exists():
        with open(RAW_NORMALIZED_PATH, "r", encoding="utf-8") as f:
            raw_schemes = json.load(f)
        for s in raw_schemes:
            name = s.get("scheme_name")
            portal_slug = s.get("portal_slug")
            if name and portal_slug:
                lookup[slugify(name)] = portal_slug

    _portal_slug_lookup = lookup
    return lookup


def get_portal_url(scheme: dict) -> Optional[str]:
    """Best-effort link to the scheme's page on myScheme.gov.in, used as a
    fallback when the LLM-extracted application_link is null."""
    slug = scheme.get("_slug")
    if not slug:
        return None
    portal_slug = _load_portal_slug_lookup().get(slug)
    return f"https://www.myscheme.gov.in/schemes/{portal_slug}" if portal_slug else None
