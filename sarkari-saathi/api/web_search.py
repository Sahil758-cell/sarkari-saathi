"""
web_search.py — Live search restricted to official Indian government
(.gov.in) websites, used by api/rag.py as a supplementary tool the LLM can
call when the local scheme dataset doesn't cover a question.
"""
import os
from urllib.parse import urlparse

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


def search_gov_sites(query: str, max_results: int = 3, deep: bool = False) -> list[dict]:
    """Search gov.in sites for `query`. Returns [] on any failure (no API
    key, network error, rate limit) rather than raising — this is a
    supplementary tool, not a hard dependency of the assistant.
    `deep=True` asks Tavily for longer page extracts (used by live search,
    which needs enough text to extract a full scheme record)."""
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
