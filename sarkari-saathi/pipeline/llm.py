"""
llm.py — The one place that knows which LLM provider Sarkari Saathi uses.

Everything (the API's AI assistant, the Telegram bot's on-demand extraction/
translation, and the bulk pipeline scripts) goes through get_client(), an
OpenAI-compatible client pointed at NVIDIA's hosted API by default. Swap
provider/model with env vars, no code change:

    NVIDIA_API_KEY   required — https://build.nvidia.com
    LLM_MODEL        default nvidia/nemotron-3.5-lightning-30b-a3b
    LLM_BASE_URL     default https://integrate.api.nvidia.com/v1

Settings are read lazily (not at import) so a .env loaded after import still
takes effect.
"""
import os
from typing import Optional

from openai import APIError, OpenAI, RateLimitError  # noqa: F401  (re-exported)

DEFAULT_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b"
DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1"

# Thinking mode streams a long reasoning trace first; for short grounded
# answers and structured extraction it only adds latency, so it is switched off.
EXTRA_BODY = {"chat_template_kwargs": {"enable_thinking": False}}

_client: Optional[OpenAI] = None


def get_model() -> str:
    return os.environ.get("LLM_MODEL", DEFAULT_MODEL)


def get_client() -> Optional[OpenAI]:
    """Returns None when NVIDIA_API_KEY isn't configured."""
    global _client
    if _client is None:
        api_key = os.environ.get("NVIDIA_API_KEY")
        if not api_key:
            return None
        _client = OpenAI(
            base_url=os.environ.get("LLM_BASE_URL", DEFAULT_BASE_URL),
            api_key=api_key,
            timeout=90,
        )
    return _client
