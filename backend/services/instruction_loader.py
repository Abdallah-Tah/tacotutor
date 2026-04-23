"""
TacoTutor Backend - Markdown instruction file parser and loader.
"""

import re
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from backend.models import InstructionFile

DEFAULT_INSTRUCTIONS_DIR = Path(__file__).resolve().parents[2] / "instructions"


class InstructionParser:
    """Parse Markdown instruction files into structured teaching rules."""

    @staticmethod
    def parse(content: str) -> dict:
        result = {
            "metadata": {},
            "target_surah": None,
            "target_ayah": None,
            "goals": [],
            "teaching_rules": [],
            "correction_rules": [],
            "visual_guidance_rules": [],
            "parent_notes": [],
            "tutor_behavior": [],
        }

        lines = content.splitlines()
        current_section = None

        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue

            # Metadata key: value
            if ":" in stripped and not stripped.startswith("-") and not stripped.startswith("#"):
                key, val = stripped.split(":", 1)
                result["metadata"][key.strip().lower()] = val.strip()
                continue

            # Section headers
            lowered = stripped.lower()
            if "goal" in lowered and "#" in stripped:
                current_section = "goals"
                continue
            if "teach" in lowered and "#" in stripped:
                current_section = "teaching_rules"
                continue
            if "correct" in lowered and "#" in stripped:
                current_section = "correction_rules"
                continue
            if "visual" in lowered and "#" in stripped:
                current_section = "visual_guidance_rules"
                continue
            if "parent" in lowered and "#" in stripped:
                current_section = "parent_notes"
                continue
            if "tutor" in lowered and "#" in stripped:
                current_section = "tutor_behavior"
                continue
            if "target" in lowered and "#" in stripped:
                current_section = "target"
                continue

            # List items
            if stripped.startswith("-") or stripped.startswith("*"):
                item = stripped.lstrip("-* ").strip()
                if current_section and current_section in result:
                    result[current_section].append(item)
                continue

            # Target surah / ayah detection
            m = re.search(r"surah\s+(\d+|\w+)", stripped, re.IGNORECASE)
            if m:
                result["target_surah"] = m.group(1)
            m = re.search(r"ayah\s+(\d+[:\-]?\d*)", stripped, re.IGNORECASE)
            if m:
                result["target_ayah"] = m.group(1)

        return result

    @staticmethod
    def to_system_prompt(parsed: dict, child_name: str = "student") -> str:
        parts = [
            f"You are TacoTutor, a Quran tutor for {child_name}.",
            "",
        ]

        meta = parsed.get("metadata", {})
        if meta.get("level"):
            parts.append(f"Child Level: {meta['level']}")
        if meta.get("mode"):
            parts.append(f"Teaching Mode: {meta['mode']}")
        if meta.get("pace"):
            parts.append(f"Pacing: {meta['pace']}")
        if parsed.get("target_surah"):
            parts.append(f"Target Surah: {parsed['target_surah']}")
        if parsed.get("target_ayah"):
            parts.append(f"Target Ayah: {parsed['target_ayah']}")
        parts.append("")

        if parsed.get("goals"):
            parts.append("## Goals")
            for g in parsed["goals"]:
                parts.append(f"- {g}")
            parts.append("")

        if parsed.get("teaching_rules"):
            parts.append("## Teaching Rules")
            for r in parsed["teaching_rules"]:
                parts.append(f"- {r}")
            parts.append("")

        if parsed.get("correction_rules"):
            parts.append("## Correction Rules")
            for r in parsed["correction_rules"]:
                parts.append(f"- {r}")
            parts.append("")

        if parsed.get("visual_guidance_rules"):
            parts.append("## Visual Guidance")
            for r in parsed["visual_guidance_rules"]:
                parts.append(f"- {r}")
            parts.append("")

        if parsed.get("tutor_behavior"):
            parts.append("## Tutor Behavior")
            for r in parsed["tutor_behavior"]:
                parts.append(f"- {r}")
            parts.append("")

        if parsed.get("parent_notes"):
            parts.append("## Parent Notes")
            for r in parsed["parent_notes"]:
                parts.append(f"- {r}")
            parts.append("")

        return "\n".join(parts)


def load_instruction_file(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"Instruction file not found: {path}")
    return path.read_text(encoding="utf-8")


def get_instruction_for_child(
    db: Session,
    child_id: str,
    lesson_id: Optional[str] = None,
    fallback_path: Optional[Path] = None,
) -> str:
    """Get instruction content for a child, falling back to defaults."""
    query = db.query(InstructionFile).filter(InstructionFile.is_active == True)

    # Priority: child-specific > lesson-specific > default
    child_instruction = query.filter(InstructionFile.child_id == child_id).first()
    if child_instruction:
        return child_instruction.content

    if lesson_id:
        lesson_instruction = query.filter(InstructionFile.lesson_id == lesson_id).first()
        if lesson_instruction:
            return lesson_instruction.content

    if fallback_path and fallback_path.exists():
        return fallback_path.read_text(encoding="utf-8")

    return ""
