"""
Shared secret loading for TacoTutor providers.

Lookup order:
1. Process environment variables
2. Repo-local .env file
3. OpenClaw secrets file at ~/.config/openclaw/secrets.env
4. Literal fallback when a config value is itself the key
"""

import os
from functools import lru_cache
from pathlib import Path


OPENCLAW_SECRETS_PATH = Path.home() / ".config" / "openclaw" / "secrets.env"
REPO_ENV_PATH = Path(__file__).resolve().parents[1] / ".env"


def _parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    with open(path) as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values


@lru_cache(maxsize=1)
def _load_repo_env() -> dict[str, str]:
    return _parse_env_file(REPO_ENV_PATH)


@lru_cache(maxsize=1)
def _load_openclaw_secrets() -> dict[str, str]:
    return _parse_env_file(OPENCLAW_SECRETS_PATH)


def get_secret(name: str, default: str = "") -> str:
    value = os.environ.get(name)
    if value:
        return value
    value = _load_repo_env().get(name)
    if value:
        return value
    return _load_openclaw_secrets().get(name, default)


def resolve_secret(config_value: str, *, required: bool = True) -> str:
    """
    Resolve a configured secret value.

    The provider config can contain either:
    - an env var name, such as GEMINI_API_KEY
    - a literal key value (legacy compatibility)
    """
    value = (config_value or "").strip()
    if not value:
        if required:
            raise ValueError("Missing secret configuration value")
        return ""

    resolved = get_secret(value)
    if resolved:
        return resolved

    # Backward compatibility for configs that stored the key value directly.
    if value.startswith(("AIza", "sk-", "hf_", "dg_", "gsk_", "xai-")):
        return value

    if required:
        raise ValueError(
            f"Missing secret: {value}. Set it in the environment or ~/.config/openclaw/secrets.env"
        )
    return ""


def get_gemini_api_key(required: bool = True) -> str:
    for name in ("GOOGLE_API_KEY", "GEMINI_API_KEY"):
        value = get_secret(name)
        if value:
            return value
    if required:
        raise ValueError(
            "Missing Gemini API key. Set GOOGLE_API_KEY or GEMINI_API_KEY in the environment or ~/.config/openclaw/secrets.env"
        )
    return ""


def get_hf_api_key(required: bool = True) -> str:
    for name in ("HF_API_KEY", "HF_TOKEN", "HUGGINGFACEHUB_API_TOKEN"):
        value = get_secret(name)
        if value:
            return value
    if required:
        raise ValueError(
            "Missing Hugging Face API key. Set HF_API_KEY, HF_TOKEN, or HUGGINGFACEHUB_API_TOKEN in the environment or ~/.config/openclaw/secrets.env"
        )
    return ""
