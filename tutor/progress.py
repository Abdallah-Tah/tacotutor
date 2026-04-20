"""
TacoTutor — Session progress tracker.
Saves per-child progress so lessons resume where they left off.
"""

import json
import os
from pathlib import Path
from datetime import datetime

DEFAULT_PATH = Path(__file__).resolve().parents[1] / "data" / "progress.json"


class ProgressTracker:
    def __init__(self, path: Path | str | None = None):
        self.path = Path(path) if path else DEFAULT_PATH
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.data = self._load()

    def _load(self) -> dict:
        if self.path.exists():
            with open(self.path) as f:
                return json.load(f)
        return {"children": {}}

    def _save(self):
        with open(self.path, "w") as f:
            json.dump(self.data, f, indent=2)

    def get_progress(self, child_name: str) -> dict:
        """Get progress for a child, creating default if new."""
        if child_name not in self.data["children"]:
            self.data["children"][child_name] = {
                "created": datetime.now().isoformat(),
                "subjects": {
                    "quran": {"level": 1, "lesson_index": 0, "completed": []},
                    "english": {"level": 1, "lesson_index": 0, "completed": []},
                    "math": {"level": 1, "lesson_index": 0, "completed": []},
                },
                "total_sessions": 0,
                "last_session": None,
            }
            self._save()
        return self.data["children"][child_name]

    def update_progress(self, child_name: str, subject: str, level: int, lesson_index: int):
        """Update child's progress in a subject."""
        progress = self.get_progress(child_name)
        progress["subjects"][subject] = {
            "level": level,
            "lesson_index": lesson_index,
            "completed": progress["subjects"][subject].get("completed", []),
        }
        progress["total_sessions"] += 1
        progress["last_session"] = datetime.now().isoformat()
        self._save()

    def complete_lesson(self, child_name: str, subject: str, level: int, lesson_index: int):
        """Mark a lesson as completed and advance."""
        progress = self.get_progress(child_name)
        subj = progress["subjects"][subject]
        key = f"L{level}-I{lesson_index}"
        if key not in subj["completed"]:
            subj["completed"].append(key)
        subj["lesson_index"] = lesson_index + 1
        progress["total_sessions"] += 1
        progress["last_session"] = datetime.now().isoformat()
        self._save()
