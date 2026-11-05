"""
rag.py — Retrieval-augmented generation over the scheme corpus: embed the
user's free-text question, retrieve the most relevant schemes from the
Chroma vector store built by pipeline/build_embeddings.py, then ask
the LLM to answer using only that retrieved context (grounded, with
citations back to the source schemes).
"""
import json
import re
import sys
from pathlib import Path
from typing import Optional

import chromadb
from chromadb.config import Settings

import i18n
import matcher
import llm  # on sys.path via matcher's own pipeline/ insert

from api import web_search

BASE_DIR = Path(__file__).resolve().parent.parent
VECTORDB_DIR = BASE_DIR / "data" / "vectordb"

# matcher's own import already puts pipeline/ on sys.path, but insert
# explicitly too rather than rely on that as a side effect.
sys.path.insert(0, str(BASE_DIR / "pipeline"))
from build_embeddings import build_document  # noqa: E402

_collection = None

# Provider, model and endpoint are configured in pipeline/llm.py (NVIDIA by
# default, overridable via env vars).


def _strip_thinking(text: str) -> str:
    """Drop any <think>...</think> block the model might still emit."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


SYSTEM_PROMPT = (
    "You are Sarkari Saathi, an assistant that helps Indian citizens understand "
    "government welfare schemes. Answer the user's question using ONLY the scheme "
    "information provided below — never invent schemes, benefits, or eligibility "
    "rules that aren't in the given context. Cite the specific scheme name(s) you "
    "used in your answer. If the provided local scheme context doesn't answer the "
    "question (for example the scheme asked about is not in the context), you MUST "
    "immediately call search_gov_website to look up official Indian government "
    "(.gov.in) websites — never ask the user for permission to search and never "
    "just offer to search. When you use information "
    "from a web search result, clearly attribute it as coming from an official "
    "government website rather than the local scheme database. Never invent "
    "information beyond what either source actually says. Write in plain "
    "conversational text: no markdown headings (#) and no bold/asterisk "
    "formatting; use short paragraphs or simple '-' bullet lines."
)

WEB_SEARCH_TOOL = {
    "type": "function",
    "function": {
        "name": "search_gov_website",
        "strict": True,
        "description": (
            "Search official Indian government (.gov.in) websites for information "
            "not covered by the local scheme context provided. Only use this when "
            "that context doesn't answer the question."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "What to search for"}
            },
            "required": ["query"],
            "additionalProperties": False,
        },
    },
}


def _get_collection():
    global _collection
    if _collection is None:
        client = chromadb.PersistentClient(
            path=str(VECTORDB_DIR), settings=Settings(anonymized_telemetry=False)
        )
        _collection = client.get_collection("schemes")
    return _collection


def _extract_hints(query: str) -> dict:
    """Pull structured filter hints (state, category) out of free text via
    word-boundary matching against the same vocabularies bot/i18n.py uses.
    Semantic embedding alone struggles to precisely rank a query combining
    several specific attributes (e.g. state + category) against thousands
    of similarly-worded schemes — when we can confidently detect these,
    matcher.match()'s exact rule logic is a far more reliable filter than
    embedding similarity for that part of the query."""
    query_lower = query.lower()
    hints: dict = {}

    for state_name, _ in i18n.STATES:
        if re.search(rf"\b{re.escape(state_name.lower())}\b", query_lower):
            hints["state"] = state_name
            break

    for code, label, _ in i18n.CATEGORY_OPTIONS:
        if code == "general":
            continue  # too common a word to reliably signal the category
        if re.search(rf"\b{re.escape(code.lower())}\b", query_lower) or re.search(
            rf"\b{re.escape(label.lower())}\b", query_lower
        ):
            hints["category"] = code
            break

    return hints


def retrieve(query: str, k: int = 5) -> list[dict]:
    """Combine semantic retrieval with a structured-rule boost: if the query
    confidently names a state/category, matcher.match() (exact, reused
    as-is) supplies those results first, topped up with semantic matches
    the embedding model found relevant more broadly."""
    result = _get_collection().query(query_texts=[query], n_results=k)
    semantic_slugs = (
        [meta["slug"] for meta in result["metadatas"][0]] if result["metadatas"] else []
    )

    hints = _extract_hints(query)
    boosted = matcher.match(hints, limit=5) if hints else []
    boosted_slugs = {s["_slug"] for s in boosted}

    schemes = list(boosted)
    for slug in semantic_slugs:
        if slug in boosted_slugs:
            continue
        scheme = matcher.get_scheme_by_slug(slug)
        if scheme is not None:
            schemes.append(scheme)
    return schemes


def _build_context(schemes: list[dict]) -> str:
    """Reuses build_document() (the same structured-fields-explicit text
    used for embedding, see pipeline/build_embeddings.py) rather than a
    separate hand-picked field list — the earlier version only passed
    scheme_name/benefits_summary/other_conditions to the LLM, silently
    dropping category/state/etc., so it had no way to know a scheme with
    category=null is open to every category (including whichever one the
    user asked about) — it could only see what was in front of it."""
    return "\n\n".join(f"Scheme: {build_document(s)}" for s in schemes)


def _looks_malformed(text: str) -> bool:
    """The model can occasionally leak raw tool-simulation scratchpad text
    (JSON-like fragments such as {"cursor": 0, "id": 0}) into the final
    answer channel instead of prose — this is a cheap heuristic to catch
    that so it can be retried rather than shown to the user."""
    stripped = text.strip()
    return stripped.startswith("{") or '"cursor"' in stripped[:80]


FALLBACK_ANSWER = (
    "I found some information but had trouble putting together a clear answer. "
    "Please try rephrasing your question, or check the sources below directly."
)


MAX_TOOL_ROUNDS = 2


def _clean_completion(client, messages: list[dict], tools: Optional[list[dict]], attempts: int = 3):
    """Call the LLM and retry (same messages, same temperature) if the
    response looks malformed. Observed directly while building this
    feature: when the model wants to search again but isn't offered the
    tool on that particular call, it sometimes fabricates fake tool-call/
    tool-result JSON as plain text instead of admitting it lacks info —
    retrying alone doesn't fix that (same root cause repeats), which is
    why generate_answer keeps offering `tools` across multiple rounds
    rather than dropping them after round one."""
    message = None
    for _ in range(attempts):
        kwargs = {
            "model": llm.get_model(),
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 2048,
            "extra_body": llm.EXTRA_BODY,
        }
        if tools is not None:
            kwargs["tools"] = tools
            kwargs["parallel_tool_calls"] = False
        response = client.chat.completions.create(**kwargs)
        message = response.choices[0].message
        message.content = _strip_thinking(message.content or "")
        if message.tool_calls or not _looks_malformed(message.content):
            return message
    return message  # last attempt even if malformed — caller decides what to do


def _translate_query_to_english(query: str, client) -> str:
    """Quick, unstructured translation used only to get a good English
    string for embedding retrieval + _extract_hints (both are English-
    vocabulary-sensitive) — not shown to the user. Falls back to the
    original query on any failure, since retrieval degrading gracefully
    beats the whole request failing."""
    try:
        response = client.chat.completions.create(
            model=llm.get_model(),
            messages=[
                {
                    "role": "system",
                    "content": "Translate the user's message to English. Respond with ONLY the translation, nothing else.",
                },
                {"role": "user", "content": query},
            ],
            temperature=0,
            max_tokens=256,
            extra_body=llm.EXTRA_BODY,
        )
        translated = _strip_thinking(response.choices[0].message.content or "")
        return translated or query
    except Exception:
        return query


def generate_answer(query: str, schemes: list[dict], lang: str = "en") -> dict:
    client = llm.get_client()
    if client is None:
        raise RuntimeError("NVIDIA_API_KEY not configured")

    context = _build_context(schemes) if schemes else "No matching schemes found locally."
    system_prompt = SYSTEM_PROMPT
    if lang == "hi":
        system_prompt += " Respond in Hindi (Devanagari script), regardless of what language the context is in."
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {query}"},
    ]
    web_sources: list[dict] = []

    for round_num in range(MAX_TOOL_ROUNDS):
        message = _clean_completion(client, messages, tools=[WEB_SEARCH_TOOL])

        if not message.tool_calls:
            answer = (message.content or "").strip()
            return {
                "answer": answer if not _looks_malformed(answer) else FALLBACK_ANSWER,
                "web_sources": web_sources,
            }

        # Rebuilt by hand (not model_dump) so only fields every
        # OpenAI-compatible server accepts are sent back.
        messages.append(
            {
                "role": "assistant",
                "content": message.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                    }
                    for tc in message.tool_calls
                ],
            }
        )
        for tool_call in message.tool_calls:
            args = json.loads(tool_call.function.arguments)
            results = web_search.search_gov_sites(args.get("query", query))
            web_sources.extend(results)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(results),
                }
            )

    # Exhausted the allotted search rounds and the model still wants more —
    # force a final answer from whatever's been gathered instead of letting
    # it keep going (or hallucinate further searches as plain text).
    messages.append(
        {
            "role": "user",
            "content": (
                "No more searches are available. Answer using only the information "
                "gathered so far, or say plainly that you don't have enough information."
            ),
        }
    )
    message = _clean_completion(client, messages, tools=None)
    answer = (message.content or "").strip()
    return {
        "answer": answer if not _looks_malformed(answer) else FALLBACK_ANSWER,
        "web_sources": web_sources,
    }


def ask(query: str, k: int = 5, lang: str = "en") -> dict:
    retrieval_query = query
    if lang == "hi":
        client = llm.get_client()
        if client is not None:
            # Both embedding retrieval and _extract_hints are English-
            # vocabulary-sensitive — translate first rather than build a
            # second Hindi vector index or bilingual hint matcher.
            retrieval_query = _translate_query_to_english(query, client)

    schemes = retrieve(retrieval_query, k=k)
    localized_schemes = (
        [matcher._localize(s, s["_slug"], lang) for s in schemes] if lang == "hi" else schemes
    )
    result = generate_answer(query, localized_schemes, lang=lang)
    # Multiple tool-call rounds can return overlapping URLs — dedupe while
    # keeping first-seen order.
    seen = set()
    web_sources = []
    for source in result["web_sources"]:
        if source["url"] not in seen:
            seen.add(source["url"])
            web_sources.append(source)
    return {"answer": result["answer"], "sources": localized_schemes, "web_sources": web_sources}
