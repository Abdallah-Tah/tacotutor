"""
TacoTutor Backend - Quran text matching and scoring.
"""

from typing import List, Tuple
import difflib


class QuranMatcher:
    """Compare child recitation with expected Quran text and score accuracy."""

    @staticmethod
    def normalize_arabic(text: str) -> str:
        """Normalize Arabic text for comparison."""
        text = text.strip()
        # Remove tashkeel (diacritics)
        tashkeel = "ًٌٍَُِّْٰ"
        for char in tashkeel:
            text = text.replace(char, "")
        return text

    @staticmethod
    def word_match_score(expected: str, recognized: str) -> float:
        """Calculate similarity score between two words (0-100)."""
        expected_norm = QuranMatcher.normalize_arabic(expected)
        recognized_norm = QuranMatcher.normalize_arabic(recognized)

        if expected_norm == recognized_norm:
            return 100.0

        # Use difflib for fuzzy matching
        similarity = difflib.SequenceMatcher(None, expected_norm, recognized_norm).ratio()
        return similarity * 100

    @staticmethod
    def match_ayah(expected_text: str, recognized_text: str) -> dict:
        """
        Match a full ayah and return detailed results.

        Returns:
            {
                "accuracy": float (0-100),
                "words_matched": int,
                "total_words": int,
                "mistakes": [
                    {
                        "position": int,
                        "expected": str,
                        "recognized": str,
                        "type": "substitution" | "omission" | "insertion",
                    }
                ]
            }
        """
        expected_words = expected_text.split()
        recognized_words = recognized_text.split()

        mistakes = []
        matched = 0
        total = len(expected_words)

        for i, expected_word in enumerate(expected_words):
            if i < len(recognized_words):
                score = QuranMatcher.word_match_score(expected_word, recognized_words[i])
                if score >= 80:
                    matched += 1
                else:
                    mistakes.append({
                        "position": i,
                        "expected": expected_word,
                        "recognized": recognized_words[i],
                        "type": "substitution",
                    })
            else:
                mistakes.append({
                    "position": i,
                    "expected": expected_word,
                    "recognized": "",
                    "type": "omission",
                })

        # Check for insertions (extra words)
        if len(recognized_words) > len(expected_words):
            for i in range(len(expected_words), len(recognized_words)):
                mistakes.append({
                    "position": i,
                    "expected": "",
                    "recognized": recognized_words[i],
                    "type": "insertion",
                })

        accuracy = (matched / total * 100) if total > 0 else 0

        return {
            "accuracy": accuracy,
            "words_matched": matched,
            "total_words": total,
            "mistakes": mistakes,
        }

    @staticmethod
    def get_word_level_feedback(ayah_text: str) -> List[dict]:
        """Get per-word metadata for the ayah."""
        words = ayah_text.split()
        return [
            {
                "word": word,
                "position": i,
                "difficulty": "easy" if len(word) <= 4 else "medium" if len(word) <= 7 else "hard",
            }
            for i, word in enumerate(words)
        ]
