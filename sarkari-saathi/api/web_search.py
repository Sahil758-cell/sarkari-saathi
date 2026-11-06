"""
web_search.py — Live search restricted to official Indian government
(.gov.in) websites, used by api/rag.py as a supplementary tool the LLM can
call when the local scheme dataset doesn't cover a question, and by
api/live_search.py to find schemes missing from the dataset.

Two providers, tried in order:
  1. Tavily (TAVILY_API_KEY): free credits renew monthly.
  2. Exa (EXA_API_KEY): free credits renew monthly.
If Tavily has no key, is out of credits, or finds nothing, Exa answers, so one
provider hitting its free limit doesn't take search down.
"""
import logging
import os
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

def search_gov_sites(query: str, max_results: int = 3, deep: bool = False) -> list[dict]:
    """Search gov.in sites for `query`. Returns [] on any failure (no API
    key, network error, rate limit) rather than raising — this is a
    supplementary tool, not a hard dependency of the assistant.
    `deep=True` asks for longer page extracts (used by live search, which
    needs enough text to extract a full scheme record)."""
    # Each provider has its own free quota; the first one that returns
    # results answers, so when Tavily runs out Exa takes over.
    for search in (_search_tavily, _search_exa):
        results = search(query, max_results, deep)
        if results:
            return results
    return []


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
