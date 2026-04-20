"""
OpenClaw integration helpers for TacoTutor.
- Loads an OpenClaw skill prompt from disk.
- Persists lightweight per-child memory snippets.
"""

import json
import re
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SKILL_PATH = REPO_ROOT / "skills" / "openclaw" / "SKILL.md"
DEFAULT_MEMORY_PATH = REPO_ROOT / "data" / "openclaw_memory.json"


FALLBACK_SKILL = """OPENCLAW SKILL (fallback):
- Be concise, warm, and child-safe.
- Ask one question at a time.
- Use previous child preferences and strengths from memory context.
- Keep answers age-appropriate for ages 4-8.
"""


class OpenClawMemory:
    """Simple JSON-backed memory store for per-child learning context."""

    def __init__(self, path: Path | str | None = None, max_notes: int = 12):
        self.path = Path(path) if path else DEFAULT_MEMORY_PATH
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.max_notes = max_notes
        self.data = self._load()

    def _load(self) -> dict:
        if self.path.exists():
            with open(self.path) as f:
                return json.load(f)
        return {"children": {}}

    def _save(self) -> None:
        with open(self.path, "w") as f:
            json.dump(self.data, f, indent=2)

    def _subject_node(self, child: str, subject: str) -> dict:
        children = self.data.setdefault("children", {})
        child_node = children.setdefault(child, {"subjects": {}, "updated": None})
        subjects = child_node.setdefault("subjects", {})
        subj_node = subjects.setdefault(subject, {"notes": []})
        return subj_node

    def add_note(self, child: str, subject: str, note: str) -> None:
        note = (note or "").strip()
        if not note:
            return
        subj = self._subject_node(child, subject)
        notes = subj.setdefault("notes", [])
        if note in notes:
            return
        notes.append(note)
        if len(notes) > self.max_notes:
            del notes[0 : len(notes) - self.max_notes]
        self.data["children"][child]["updated"] = datetime.utcnow().isoformat()
        self._save()

    def remember_turn(self, child: str, subject: str, user_message: str, assistant_reply: str) -> None:
        """Extract lightweight memory facts from a turn and persist them."""
        text = (user_message or "").strip()
        if not text:
            return

        # Preference patterns
        preference_patterns = [
            r"\b(?:i like|i love|my favorite is)\s+([^.,!?]+)",
            r"\b(?:i want to learn|teach me)\s+([^.,!?]+)",
            r"\bmy name is\s+([^.,!?]+)",
        ]
        for pattern in preference_patterns:
            for match in re.findall(pattern, text, flags=re.IGNORECASE):
                self.add_note(child, subject, f"Child said: {match.strip()}")

        # Keep a short rolling sample of child utterances for continuity.
        preview = text[:100]
        self.add_note(child, subject, f"Recent child response: {preview}")

        # Track recent tutor strategy for continuity.
        if assistant_reply:
            strategy = assistant_reply[:100]
            self.add_note(child, subject, f"Recent tutor guidance: {strategy}")

    def get_context_block(self, child: str, subject: str, max_items: int = 8) -> str:
        subj = self._subject_node(child, subject)
        notes = subj.get("notes", [])[-max_items:]
        if not notes:
            return "OPENCLAW MEMORY:\n- No prior memory yet."
        lines = "\n".join(f"- {n}" for n in notes)
        return f"OPENCLAW MEMORY:\n{lines}"


def load_openclaw_skill(path: Path | str | None = None) -> str:
    skill_path = Path(path) if path else DEFAULT_SKILL_PATH
    if skill_path.exists():
        return skill_path.read_text().strip()
    return FALLBACK_SKILL.strip()


def compose_openclaw_prompt(base_prompt: str, skill_text: str, memory_block: str) -> str:
    return (
        f"{base_prompt.strip()}\n\n"
        "Use the following OpenClaw skill rules and memory context while tutoring.\n\n"
        f"{skill_text.strip()}\n\n"
        f"{memory_block.strip()}"
    )
