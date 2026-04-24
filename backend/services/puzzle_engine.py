"""
TacoTutor Puzzle Engine — generates and grades interactive Quran & Math puzzles.

Puzzle types
  Quran : recitation | fill_blank | word_order
  Math  : count | add | subtract
"""

import random
import re
import uuid
import difflib
from typing import Optional


# ─── Constants ───────────────────────────────────────────────────────────────

OBJECT_EMOJI: dict[str, str] = {
    "apple": "🍎", "star": "⭐", "duck": "🦆", "cat": "🐱",
    "dog": "🐶",  "fish": "🐟", "ball": "⚽", "flower": "🌸",
    "moon": "🌙", "sun": "☀️", "tree": "🌳", "heart": "❤️",
}

# Irregular English plurals used in math prompts
_PLURAL_MAP: dict[str, str] = {
    "fish": "fish", "sheep": "sheep", "deer": "deer",
}

_QURAN_PRAISE = [
    "أحسنت! ممتاز!",
    "ما شاء الله! رائع!",
    "بارك الله فيك!",
    "جميل جداً! أنت نجم!",
    "نعم! هذا صحيح تماماً!",
]
_QURAN_RETRY = [
    "حاول مرة أخرى، أنت تستطيع!",
    "قريب جداً! استمع مرة أخرى وحاول.",
    "لا بأس، جرّب ثانية — أنت قادر!",
]
_MATH_PRAISE = [
    "Amazing! You got it!",
    "Fantastic! You are a star!",
    "Super smart! That is exactly right!",
    "Wow, well done! High five!",
]
_MATH_RETRY = [
    "Almost! Try counting again.",
    "Good try! Look at the objects and count carefully.",
    "You can do it! Use your fingers if you need to.",
]


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _pid() -> str:
    return str(uuid.uuid4())


def _norm(s: str) -> str:
    """Strip Arabic diacritics (tashkeel) only — preserves base letters."""
    s = re.sub(
        r"[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۤۧۨ-ۭ]",
        "", s,
    )
    return re.sub(r"\s+", " ", s).strip()


def _fuzzy(a: str, b: str, threshold: float = 0.72) -> bool:
    return difflib.SequenceMatcher(None, a, b).ratio() >= threshold


def _pluralize(word: str) -> str:
    return _PLURAL_MAP.get(word, word + "s")


def _lcs_length(a: list[str], b: list[str]) -> int:
    """Longest common subsequence length with fuzzy word matching."""
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1] or _fuzzy(a[i - 1], b[j - 1]):
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]


# ─── Public generators ───────────────────────────────────────────────────────

def generate_quran_puzzle(ayah_text: str, puzzle_type: str, level: int = 1) -> dict:
    """Return a puzzle dict for the given ayah."""
    words = ayah_text.split()

    if puzzle_type == "fill_blank" and len(words) >= 3:
        idx = random.randint(1, len(words) - 2)
        blank_word = words[idx]
        masked = words.copy()
        masked[idx] = "___"
        return {
            "id": _pid(),
            "type": "fill_blank",
            "subject": "quran",
            "prompt_ar": "قل الكلمة الناقصة:",
            "prompt_en": "Say the missing word:",
            "display_text": " ".join(masked),
            "full_text": ayah_text,
            "expected_answer": blank_word,
            "blank_index": idx,
            "hints": [
                f"الكلمة تبدأ بـ: {blank_word[0] if blank_word else ''}",
                f"الكلمة هي: {blank_word}",
            ],
        }

    if puzzle_type == "word_order" and len(words) >= 3:
        shuffled = words.copy()
        for _ in range(10):
            random.shuffle(shuffled)
            if shuffled != words:
                break
        return {
            "id": _pid(),
            "type": "word_order",
            "subject": "quran",
            "prompt_ar": "رتّب الكلمات بالترتيب الصحيح:",
            "prompt_en": "Say the words in the correct order:",
            "display_words": shuffled,
            "expected_answer": ayah_text,
            "hints": [
                f"ابدأ بكلمة: {words[0]}",
                ayah_text,
            ],
        }

    # default / fallback: recitation
    return {
        "id": _pid(),
        "type": "recitation",
        "subject": "quran",
        "prompt_ar": "اقرأ هذه الآية:",
        "prompt_en": "Repeat this ayah after me:",
        "display_text": ayah_text,
        "expected_answer": ayah_text,
        "hints": [
            f"ابدأ بـ: {words[0]}" if words else "",
            " ".join(words[: max(1, len(words) // 2)]) + " ...",
            ayah_text,
        ],
    }


def generate_math_puzzle(
    puzzle_type: str,
    level: int = 1,
    objects: Optional[list] = None,
) -> dict:
    """Return a math puzzle dict."""
    obj_list = [o for o in (objects or ["apple", "star", "duck"]) if o in OBJECT_EMOJI] or ["star"]
    max_n = {1: 5, 2: 10}.get(level, 10)

    if puzzle_type == "add":
        half = max(1, max_n // 2)
        a, b = random.randint(1, half), random.randint(1, half)
        obj = random.choice(obj_list)
        emoji = OBJECT_EMOJI[obj]
        obj_pl = _pluralize(obj)
        return {
            "id": _pid(),
            "type": "add",
            "subject": "math",
            "prompt_en": f"You have {a} {obj_pl}, then you get {b} more. How many in total?",
            "operand_a": a,
            "operand_b": b,
            "operation": "add",
            "display_object": obj,
            "display_emoji": emoji,
            "expected_answer": str(a + b),
            "expected_number": a + b,
            "hints": [
                f"Hold up {a} fingers, then add {b} more — count them all!",
                f"{a} + {b} = ?",
                f"The answer is {a + b}!",
            ],
            "animation": "add",
        }

    if puzzle_type == "subtract":
        a = random.randint(2, max_n)
        b = random.randint(1, a - 1)
        obj = random.choice(obj_list)
        emoji = OBJECT_EMOJI[obj]
        obj_pl = _pluralize(obj)
        return {
            "id": _pid(),
            "type": "subtract",
            "subject": "math",
            "prompt_en": f"You have {a} {obj_pl}. {b} fly away! How many are left?",
            "operand_a": a,
            "operand_b": b,
            "operation": "subtract",
            "display_object": obj,
            "display_emoji": emoji,
            "expected_answer": str(a - b),
            "expected_number": a - b,
            "hints": [
                f"Start with {a}, then take away {b}.",
                f"Count what is left after removing {b}!",
                f"The answer is {a - b}!",
            ],
            "animation": "subtract",
        }

    # default: count
    count = random.randint(1, max_n)
    obj = random.choice(obj_list)
    emoji = OBJECT_EMOJI[obj]
    obj_pl = _pluralize(obj)
    return {
        "id": _pid(),
        "type": "count",
        "subject": "math",
        "prompt_en": f"Count the {obj_pl} and say the number out loud!",
        "display_count": count,
        "display_object": obj,
        "display_emoji": emoji,
        "expected_answer": str(count),
        "expected_number": count,
        "hints": [
            "Point to each one as you count: 1, 2, 3...",
            f"There are {count} {obj_pl}!",
        ],
        "animation": "count",
    }


def next_puzzle_type(subject: str, level: int, last_type: Optional[str] = None) -> str:
    """Pick the next puzzle type, rotating to keep variety."""
    if subject == "quran":
        pool = (
            ["recitation", "recitation", "fill_blank"]
            if level <= 1
            else ["recitation", "fill_blank", "word_order"]
        )
    elif subject == "math":
        pool = (
            ["count"]
            if level <= 1
            else ["count", "add", "subtract"]
        )
    else:
        return "recitation"

    choices = [t for t in pool if t != last_type] or pool
    return random.choice(choices)


# ─── Grading ─────────────────────────────────────────────────────────────────

def grade_puzzle(puzzle: dict, transcript: str) -> dict:
    """Grade a puzzle against the child's voice transcript."""
    is_quran = puzzle.get("subject", "quran") == "quran"
    result = _grade_quran(puzzle, transcript) if is_quran else _grade_math(puzzle, transcript)
    praise = _QURAN_PRAISE if is_quran else _MATH_PRAISE
    retry  = _QURAN_RETRY  if is_quran else _MATH_RETRY
    result["encouragement"] = random.choice(praise if result["is_correct"] else retry)
    result["is_arabic"]     = is_quran
    return result


def get_puzzle_hint(puzzle: dict, hint_num: int = 1) -> str:
    """Return the nth progressive hint (1-indexed). Clamped to valid range."""
    hints = puzzle.get("hints", [])
    if not hints:
        return ""
    idx = max(0, min(hint_num - 1, len(hints) - 1))
    return hints[idx]


# ─── Private graders ─────────────────────────────────────────────────────────

def _grade_quran(puzzle: dict, transcript: str) -> dict:
    ptype    = puzzle.get("type", "recitation")
    expected = puzzle.get("expected_answer", "")
    exp_n    = _norm(expected)
    rec_n    = _norm(transcript)

    if ptype == "recitation":
        # Bag-of-words: each expected word must appear somewhere in transcript
        exp_words = exp_n.split()
        rec_words = rec_n.split()
        correct   = sum(
            1 for ew in exp_words
            if any(ew == rw or _fuzzy(ew, rw) for rw in rec_words)
        )
        accuracy = round(correct / len(exp_words) * 100) if exp_words else 0
        return {
            "is_correct": accuracy >= 70,
            "accuracy": accuracy,
            "details": {
                "expected": expected,
                "recognized": transcript,
                "correct_words": correct,
                "total_words": len(exp_words),
            },
        }

    if ptype == "word_order":
        # Order-sensitive: use LCS so words in wrong sequence score lower
        exp_words = exp_n.split()
        rec_words = rec_n.split()
        in_order  = _lcs_length(exp_words, rec_words)
        accuracy  = round(in_order / len(exp_words) * 100) if exp_words else 0
        return {
            "is_correct": accuracy >= 70,
            "accuracy": accuracy,
            "details": {
                "expected": expected,
                "recognized": transcript,
                "correct_words": in_order,
                "total_words": len(exp_words),
            },
        }

    if ptype == "fill_blank":
        ok = exp_n in rec_n or _fuzzy(exp_n, rec_n)
        return {
            "is_correct": ok,
            "accuracy": 100 if ok else 0,
            "details": {"expected": expected, "recognized": transcript},
        }

    return {"is_correct": False, "accuracy": 0, "details": {}}


def _grade_math(puzzle: dict, transcript: str) -> dict:
    expected   = puzzle.get("expected_number", 0)
    recognized = _extract_number(transcript)
    ok = recognized == expected
    return {
        "is_correct": ok,
        "accuracy": 100 if ok else 0,
        "details": {"expected": expected, "recognized": recognized, "transcript": transcript},
    }


_WORD_NUMS: dict[str, int] = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
    "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
    "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
    "nineteen": 19, "twenty": 20,
}

# Pre-sorted longest-first so "fourteen" is checked before "four", etc.
_WORD_NUMS_SORTED = sorted(_WORD_NUMS.items(), key=lambda kv: -len(kv[0]))


def _extract_number(text: str) -> Optional[int]:
    """Extract the first number from transcript (digit or English word)."""
    t = text.lower().strip()
    m = re.search(r"\b(\d+)\b", t)
    if m:
        return int(m.group(1))
    # Use whole-word boundaries; check longest words first to avoid
    # "four" matching inside "fourteen".
    for word, num in _WORD_NUMS_SORTED:
        if re.search(rf"\b{re.escape(word)}\b", t):
            return num
    return None
