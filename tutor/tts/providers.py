"""
TacoTutor TTS Provider — unified interface for text-to-speech backends.
"""

import os
import asyncio
import base64
import logging
import re
import wave
from abc import ABC, abstractmethod
from pathlib import Path

import yaml

log = logging.getLogger(__name__)
CONFIG_PATH = Path(__file__).resolve().parents[2] / "config" / "providers.yaml"


def load_config():
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)


class TTSProvider(ABC):
    @abstractmethod
    async def speak(self, text: str, language: str = "en", output_path: str = "") -> str:
        """Convert text to speech, return path to audio file."""
        ...


class EdgeTTSProvider(TTSProvider):
    """Microsoft Edge TTS — free, no API key, 30+ languages."""

    def __init__(self, cfg: dict):
        self.voices = {
            "en": cfg.get("voice_en", "en-US-DavisNeural"),
            "ar": cfg.get("voice_ar", "ar-SA-HamedNeural"),
        }

    async def speak(self, text: str, language: str = "en", output_path: str = "") -> str:
        import edge_tts
        if not output_path:
            output_path = f"/tmp/tacotutor_tts_{hash(text) % 10000}.mp3"
        elif not Path(output_path).suffix:
            output_path = str(Path(output_path).with_suffix(".mp3"))
        voice = self.voices.get(language, self.voices["en"])
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(output_path)
        return output_path


class GeminiTTSProvider(TTSProvider):
    """Google Gemini TTS — needs API key, very natural voices."""

    def __init__(self, cfg: dict):
        self.api_key = os.environ.get(cfg["api_key_env"], "")
        if not self.api_key:
            raise ValueError(f"Missing env var: {cfg['api_key_env']}")
        self.voices = {
            "en": cfg.get("voice_en", "Puck"),
            "ar": cfg.get("voice_ar", "Puck"),
        }
        self.model = cfg.get("model", "gemini-3.1-flash-tts-preview")

    async def speak(self, text: str, language: str = "en", output_path: str = "") -> str:
        import httpx

        if not output_path:
            output_path = f"/tmp/tacotutor_tts_{hash(text) % 10000}.wav"
        elif Path(output_path).suffix.lower() != ".wav":
            output_path = str(Path(output_path).with_suffix(".wav"))

        voice = self.voices.get(language, self.voices["en"])
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

        payload = {
            "contents": [{"parts": [{"text": text}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}},
            },
        }

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            inline = data["candidates"][0]["content"]["parts"][0]["inlineData"]
            audio_b64 = inline["data"]
            mime_type = inline.get("mimeType", "")
            raw_audio = base64.b64decode(audio_b64)

            if mime_type.startswith("audio/l16"):
                sample_rate_match = re.search(r"rate=(\d+)", mime_type)
                channels_match = re.search(r"channels=(\d+)", mime_type)
                sample_rate = int(sample_rate_match.group(1)) if sample_rate_match else 24000
                channels = int(channels_match.group(1)) if channels_match else 1
                with wave.open(output_path, "wb") as wav_file:
                    wav_file.setnchannels(channels)
                    wav_file.setsampwidth(2)
                    wav_file.setframerate(sample_rate)
                    wav_file.writeframes(raw_audio)
            else:
                with open(output_path, "wb") as f:
                    f.write(raw_audio)
        return output_path


TTS_PROVIDERS = {
    "edge": EdgeTTSProvider,
    "gemini": GeminiTTSProvider,
}


def get_tts(provider_name: str | None = None) -> TTSProvider:
    config = load_config()
    name = provider_name or config["active"]["tts"]
    if name not in TTS_PROVIDERS:
        raise ValueError(f"Unknown TTS provider: {name}. Available: {list(TTS_PROVIDERS.keys())}")
    cfg = config["tts"][name]
    return TTS_PROVIDERS[name](cfg)
