"""
TacoTutor STT Provider — unified interface for speech-to-text backends.
"""

import os
import base64
import logging
import mimetypes
from abc import ABC, abstractmethod
from pathlib import Path

import yaml

log = logging.getLogger(__name__)
CONFIG_PATH = Path(__file__).resolve().parents[2] / "config" / "providers.yaml"


def load_config():
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)


class STTProvider(ABC):
    @abstractmethod
    async def transcribe(self, audio_path: str, language: str = "auto") -> str:
        """Transcribe audio file to text."""
        ...


class LocalWhisperProvider(STTProvider):
    """faster-whisper running locally — free, no API key."""

    def __init__(self, cfg: dict):
        self.model_size = cfg.get("model_size", "base")
        self.device = cfg.get("device", "cpu")
        self.default_language = cfg.get("language", "auto")
        self._model = None

    def _load_model(self):
        if self._model is None:
            from faster_whisper import WhisperModel
            log.info(f"Loading Whisper model: {self.model_size} on {self.device}")
            self._model = WhisperModel(self.model_size, device=self.device, compute_type="int8")
        return self._model

    async def transcribe(self, audio_path: str, language: str = "auto") -> str:
        model = self._load_model()
        lang = None if language == "auto" else language
        if lang is None and self.default_language != "auto":
            lang = self.default_language
        segments, info = model.transcribe(audio_path, language=lang)
        text = " ".join(s.text.strip() for s in segments)
        log.info(f"STT ({info.language}): {text[:100]}")
        return text


class DeepgramProvider(STTProvider):
    """Deepgram cloud STT — needs API key."""

    def __init__(self, cfg: dict):
        self.api_key = os.environ.get(cfg["api_key_env"], "")
        if not self.api_key:
            raise ValueError(f"Missing env var: {cfg['api_key_env']}")
        self.model = cfg.get("model", "nova-2")

    async def transcribe(self, audio_path: str, language: str = "auto") -> str:
        import httpx
        url = "https://api.deepgram.com/v1/listen"
        params = {"model": self.model, "smart_format": "true"}
        if language != "auto":
            params["language"] = language

        with open(audio_path, "rb") as f:
            audio_data = f.read()

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                url, params=params, content=audio_data,
                headers={"Authorization": f"Token {self.api_key}", "Content-Type": "audio/wav"},
            )
        resp.raise_for_status()
        return resp.json()["results"]["channels"][0]["alternatives"][0]["transcript"]


class GeminiSTTProvider(STTProvider):
    """Gemini multimodal STT using uploaded audio bytes."""

    def __init__(self, cfg: dict):
        self.api_key = os.environ.get(cfg["api_key_env"], "")
        if not self.api_key:
            raise ValueError(f"Missing env var: {cfg['api_key_env']}")
        self.model = cfg.get("model", "gemini-2.5-flash")

    async def transcribe(self, audio_path: str, language: str = "auto") -> str:
        import httpx

        mime_type = mimetypes.guess_type(audio_path)[0] or "audio/wav"
        with open(audio_path, "rb") as f:
            audio_b64 = base64.b64encode(f.read()).decode("utf-8")

        prompt = "Transcribe this child speech audio. Return only the exact transcript text, with no explanation. If the audio has no clear speech, return an empty string."
        if language != "auto":
            prompt += f" The language is likely {language}."

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {"inlineData": {"mimeType": mime_type, "data": audio_b64}},
                ],
            }],
            "generationConfig": {
                "temperature": 0,
                "maxOutputTokens": 256,
            },
        }

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        text = "".join(part.get("text", "") for part in parts).strip()
        return text


STT_PROVIDERS = {
    "local": LocalWhisperProvider,
    "deepgram": DeepgramProvider,
    "gemini": GeminiSTTProvider,
}


def get_stt(provider_name: str | None = None) -> STTProvider:
    config = load_config()
    name = provider_name or config["active"]["stt"]
    if name not in STT_PROVIDERS:
        raise ValueError(f"Unknown STT provider: {name}. Available: {list(STT_PROVIDERS.keys())}")
    cfg = config["stt"][name]
    return STT_PROVIDERS[name](cfg)
