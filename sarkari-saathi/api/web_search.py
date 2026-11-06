"""
web_search.py — Live search restricted to official Indian government
(.gov.in) websites, used by api/rag.py as a supplementary tool the LLM can
call when the local scheme dataset doesn't cover a question, and by
api/live_search.py to find schemes missing from the dataset.

Two providers, tried in order:
  1. Serper (Google results, SERPER_API_KEY): finds the pages with Google's
     ranking, then we download and read each page ourselves.
  2. Tavily (TAVILY_API_KEY): returns ready-made page text; free credits renew monthly.
  3. Exa (EXA_API_KEY): returns page text; free credits renew monthly.
If one has no key, is out of credits, or finds nothing, the next one is
used, so one provider hitting its free limit doesn't take search down.
"""
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

import httpx

from tavily import TavilyClient

_client = None


def _get_client():
    global _client
    if _client is None:
        api_key = os.environ.get("TAVILY_API_KEY")
        if not api_key:
            return None
        _client = TavilyClient(api_key=api_key)
    return _client


def _is_gov_in(url: str) -> bool:
    """Tavily's include_domains only prioritizes matching domains, it
    doesn't strictly filter to them — this is the actual enforcement of
    the gov.in-only restriction."""
    host = urlparse(url).netloc.lower()
    return host == "gov.in" or host.endswith(".gov.in")


# Some gov.in pages (myScheme.gov.in in particular) are single-page apps
# that render a generic error/session state instead of actual content when
# fetched without a browser session — Tavily still returns that text as if
# it were real page content. Feeding this to the LLM as "official" context
# was observed to reliably confuse it into malformed output, so it's
# filtered out here rather than left for the model to sort out.
_ERROR_PAGE_MARKERS = ("something went wrong", "are you sure you want to sign out")


def _looks_like_error_page(content: str) -> bool:
    lowered = content.lower()
    return any(marker in lowered for marker in _ERROR_PAGE_MARKERS)


log = logging.getLogger("web_search")

_BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; SarkariSaathiBot/1.0; +https://sarkari-saathi.onrender.com)",
    "Accept": "text/html,application/xhtml+xml",
}
_MAX_PAGE_BYTES = 1_500_000


def _page_text(html: str) -> str:
    """Main readable text of an HTML page (menus, footers etc. removed)."""
    try:
        import trafilatura

        text = trafilatura.extract(html, include_comments=False, include_tables=True)
        if text:
            return text
    except Exception:  # noqa: BLE001 — fall back to the plain stripper below
        pass
    import re

    html = re.sub(r"(?is)<(script|style|nav|footer|header)[^>]*>.*?</\1>", " ", html)
    return re.sub(r"\s+", " ", re.sub(r"(?s)<[^>]+>", " ", html)).strip()


def _fetch_page(url: str, max_chars: int) -> str:
    """Download a gov.in page and return its text ("" on any problem: PDF,
    slow/blocked site, redirect away from gov.in). Only URLs that Google
    returned *and* that pass _is_gov_in are ever fetched."""
    try:
        r = httpx.get(url, headers=_BROWSER_HEADERS, timeout=8.0, follow_redirects=True)
        if r.status_code != 200 or not _is_gov_in(str(r.url)):
            return ""
        if "html" not in r.headers.get("content-type", "").lower():
            return ""
        return _page_text(r.content[:_MAX_PAGE_BYTES].decode(r.encoding or "utf-8", errors="ignore"))[:max_chars]
    except Exception:  # noqa: BLE001
        return ""


def _search_serper(query: str, max_results: int, deep: bool) -> list[dict]:
    """Google results (restricted to gov.in) via Serper, with each page's text
    downloaded so the result looks like Tavily's: title, url, content."""
    api_key = os.environ.get("SERPER_API_KEY")
    if not api_key:
        return []
    try:
        resp = httpx.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
            json={"q": f"{query} site:gov.in", "num": max_results + 4, "gl": "in", "hl": "en"},
            timeout=10.0,
        )
        resp.raise_for_status()
        organic = resp.json().get("organic", [])
    except Exception as e:  # noqa: BLE001 — out of credits, network, bad key…
        log.warning("serper search failed: %s", e)
        return []

    hits, seen = [], set()
    for item in organic:
        url = item.get("link", "")
        if url and url not in seen and _is_gov_in(url):
            seen.add(url)
            hits.append(item)
        if len(hits) == max_results:
            break

    cap = 6000 if deep else 3000
    with ThreadPoolExecutor(max_workers=max(1, len(hits))) as pool:
        pages = list(pool.map(lambda h: _fetch_page(h["link"], cap), hits))

    results = []
    for item, page in zip(hits, pages):
        # Fall back to Google's snippet when the page couldn't be read (PDF…).
        content = page if len(page) > 200 else (item.get("snippet", "") or page)
        if content and not _looks_like_error_page(content):
            results.append({"title": item.get("title", ""), "url": item["link"], "content": content})
    return results


def search_gov_sites(query: str, max_results: int = 3, deep: bool = False) -> list[dict]:
    """Search gov.in sites for `query`. Returns [] on any failure (no API
    key, network error, rate limit) rather than raising — this is a
    supplementary tool, not a hard dependency of the assistant.
    `deep=True` asks for longer page extracts (used by live search, which
    needs enough text to extract a full scheme record)."""
    # Providers in order of preference. Each has its own free quota, so when one
    # runs out (returns nothing) the next one answers.
    fallback: list[dict] = []
    for search in (_search_serper, _search_tavily, _search_exa):
        results = search(query, max_results, deep)
        if any(len(r["content"]) >= 500 for r in results):
            return results  # at least one page's text came through in full
        fallback = fallback or results  # only short snippets: keep as a last resort
    return fallback


def _search_exa(query: str, max_results: int, deep: bool) -> list[dict]:
    """Exa (EXA_API_KEY): free credits that renew every month; returns page text."""
    api_key = os.environ.get("EXA_API_KEY")
    if not api_key:
        return []
    try:
        resp = httpx.post(
            "https://api.exa.ai/search",
            headers={"x-api-key": api_key, "Content-Type": "application/json"},
            json={
                "query": query,
                "numResults": max_results,
                "includeDomains": ["gov.in"],
                "contents": {"text": {"maxCharacters": 6000 if deep else 3000}},
            },
            timeout=20.0,
        )
        resp.raise_for_status()
        items = resp.json().get("results", [])
    except Exception as e:  # noqa: BLE001
        log.warning("exa search failed: %s", e)
        return []
    return [
        {"title": r.get("title") or "", "url": r.get("url", ""), "content": r.get("text") or ""}
        for r in items
        if _is_gov_in(r.get("url", "")) and not _looks_like_error_page(r.get("text") or "")
    ]


def _search_tavily(query: str, max_results: int, deep: bool) -> list[dict]:
    client = _get_client()
    if client is None:
        return []
    try:
        response = client.search(
            query=query,
            include_domains=["gov.in"],
            max_results=max_results,
            search_depth="advanced" if deep else "basic",
        )
    except Exception:
        return []
    return [
        {"title": r.get("title", ""), "url": r.get("url", ""), "content": r.get("content", "")}
        for r in response.get("results", [])
        if _is_gov_in(r.get("url", "")) and not _looks_like_error_page(r.get("content", ""))
    ]
