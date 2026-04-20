"""
TacoTutor LLM Provider — unified interface for multiple LLM backends.
Swap providers via config/providers.yaml without changing pipeline code.
"""

import os
import yaml
import json
import logging
from abc import ABC, abstractmethod
from pathlib import Path

log = logging.getLogger(__name__)

CONFIG_PATH = Path(__file__).resolve().parents[1] / "config" / "providers.yaml"


def load_config():
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)


def _get_key(env_var: str) -> str:
    key = os.environ.get(env_var, "")
    if not key:
        raise ValueError(f"Missing env var: {env_var}")
    return key


class LLMProvider(ABC):
    @abstractmethod
    async def chat(self, messages: list[dict], **kwargs) -> str:
        """Send messages and return assistant text."""
        ...


class OllamaProvider(LLMProvider):
    def __init__(self, cfg: dict):
        import httpx
        self.base_url = cfg.get("base_url", "http://localhost:11434")
        self.model = cfg["model"]
        self.temperature = cfg.get("temperature", 0.7)
        self.max_tokens = cfg.get("max_tokens", 512)
        self.client = httpx.AsyncClient(timeout=120)

    async def chat(self, messages: list[dict], **kwargs) -> str:
        resp = await self.client.post(
            f"{self.base_url}/api/chat",
            json={
                "model": self.model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": kwargs.get("temperature", self.temperature),
                    "num_predict": kwargs.get("max_tokens", self.max_tokens),
                },
            },
        )
        resp.raise_for_status()
        return resp.json()["message"]["content"]


class OpenAIProvider(LLMProvider):
    def __init__(self, cfg: dict):
        try:
            from openai import AsyncOpenAI
        except ImportError:
            raise ImportError("pip install openai")
        self.client = AsyncOpenAI(api_key=_get_key(cfg["api_key_env"]))
        self.model = cfg["model"]
        self.temperature = cfg.get("temperature", 0.7)
        self.max_tokens = cfg.get("max_tokens", 512)

    async def chat(self, messages: list[dict], **kwargs) -> str:
        resp = await self.client.chat.completions.create(
            model=kwargs.get("model", self.model),
            messages=messages,
            temperature=kwargs.get("temperature", self.temperature),
            max_tokens=kwargs.get("max_tokens", self.max_tokens),
        )
        return resp.choices[0].message.content


class AnthropicProvider(LLMProvider):
    def __init__(self, cfg: dict):
        try:
            from anthropic import AsyncAnthropic
        except ImportError:
            raise ImportError("pip install anthropic")
        self.client = AsyncAnthropic(api_key=_get_key(cfg["api_key_env"]))
        self.model = cfg["model"]
        self.temperature = cfg.get("temperature", 0.7)
        self.max_tokens = cfg.get("max_tokens", 512)

    async def chat(self, messages: list[dict], **kwargs) -> str:
        # Anthropic needs system separate
        system = ""
        chat_msgs = []
        for m in messages:
            if m["role"] == "system":
                system = m["content"]
            else:
                chat_msgs.append(m)

        resp = await self.client.messages.create(
            model=kwargs.get("model", self.model),
            max_tokens=kwargs.get("max_tokens", self.max_tokens),
            temperature=kwargs.get("temperature", self.temperature),
            system=system,
            messages=chat_msgs,
        )
        return resp.content[0].text


class GeminiProvider(LLMProvider):
    def __init__(self, cfg: dict):
        import httpx
        self.api_key = _get_key(cfg["api_key_env"])
        self.model = cfg["model"]
        self.temperature = cfg.get("temperature", 0.7)
        self.max_tokens = cfg.get("max_tokens", 512)
        self.client = httpx.AsyncClient(timeout=120)

    async def chat(self, messages: list[dict], **kwargs) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        # Convert to Gemini format
        contents = []
        for m in messages:
            role = "user" if m["role"] in ("user", "system") else "model"
            contents.append({"role": role, "parts": [{"text": m["content"]}]})

        resp = await self.client.post(url, json={
            "contents": contents,
            "generationConfig": {
                "temperature": kwargs.get("temperature", self.temperature),
                "maxOutputTokens": kwargs.get("max_tokens", self.max_tokens),
            },
        })
        resp.raise_for_status()
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"]


class OpenRouterProvider(LLMProvider):
    def __init__(self, cfg: dict):
        try:
            from openai import AsyncOpenAI
        except ImportError:
            raise ImportError("pip install openai")
        self.client = AsyncOpenAI(
            api_key=_get_key(cfg["api_key_env"]),
            base_url=cfg.get("base_url", "https://openrouter.ai/api/v1"),
        )
        self.model = cfg["model"]
        self.temperature = cfg.get("temperature", 0.7)
        self.max_tokens = cfg.get("max_tokens", 512)

    async def chat(self, messages: list[dict], **kwargs) -> str:
        resp = await self.client.chat.completions.create(
            model=kwargs.get("model", self.model),
            messages=messages,
            temperature=kwargs.get("temperature", self.temperature),
            max_tokens=kwargs.get("max_tokens", self.max_tokens),
        )
        return resp.choices[0].message.content


# MiniMax and GLM use OpenAI-compatible APIs
class MiniMaxProvider(OpenAIProvider):
    def __init__(self, cfg: dict):
        try:
            from openai import AsyncOpenAI
        except ImportError:
            raise ImportError("pip install openai")
        self.client = AsyncOpenAI(
            api_key=_get_key(cfg["api_key_env"]),
            base_url="https://api.minimax.chat/v1",
        )
        self.model = cfg["model"]
        self.temperature = cfg.get("temperature", 0.7)
        self.max_tokens = cfg.get("max_tokens", 512)


class GLMProvider(OpenAIProvider):
    def __init__(self, cfg: dict):
        try:
            from openai import AsyncOpenAI
        except ImportError:
            raise ImportError("pip install openai")
        self.client = AsyncOpenAI(
            api_key=_get_key(cfg["api_key_env"]),
            base_url="https://open.bigmodel.cn/api/paas/v4",
        )
        self.model = cfg["model"]
        self.temperature = cfg.get("temperature", 0.7)
        self.max_tokens = cfg.get("max_tokens", 512)


PROVIDERS = {
    "ollama": OllamaProvider,
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    "gemini": GeminiProvider,
    "minimax": MiniMaxProvider,
    "glm": GLMProvider,
    "openrouter": OpenRouterProvider,
}


def get_llm(provider_name: str | None = None) -> LLMProvider:
    """Get an LLM provider instance. Uses config default if no name given."""
    config = load_config()
    name = provider_name or config["active"]["llm"]
    if name not in PROVIDERS:
        raise ValueError(f"Unknown LLM provider: {name}. Available: {list(PROVIDERS.keys())}")
    cfg = config["llm"][name]
    log.info(f"Initializing LLM provider: {name} (model: {cfg.get('model', 'N/A')})")
    return PROVIDERS[name](cfg)
