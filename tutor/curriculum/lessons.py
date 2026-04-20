"""
TacoTutor Curriculum — structured lessons for Quran, English, Math, Writing.
"""

QURAN_LEVELS = {
    1: {
        "name": "Arabic Letters — Level 1",
        "description": "Learn to recognize and pronounce Arabic letters",
        "lessons": [
            {"letter": "ا", "name": "Alif", "sound": "a"},
            {"letter": "ب", "name": "Ba", "sound": "ba"},
            {"letter": "ت", "name": "Ta", "sound": "ta"},
            {"letter": "ث", "name": "Tha", "sound": "tha"},
            {"letter": "ج", "name": "Jim", "sound": "ja"},
        ],
    },
    2: {
        "name": "Arabic Letters — Level 2",
        "description": "Continue learning Arabic letters",
        "lessons": [
            {"letter": "ح", "name": "Ha", "sound": "ha"},
            {"letter": "خ", "name": "Kha", "sound": "kha"},
            {"letter": "د", "name": "Dal", "sound": "da"},
            {"letter": "ذ", "name": "Dhal", "sound": "dha"},
            {"letter": "ر", "name": "Ra", "sound": "ra"},
        ],
    },
    3: {
        "name": "Short Surahs",
        "description": "Memorize short surahs starting with Al-Fatiha",
        "lessons": [
            {"surah": "Al-Fatiha", "ayat": 7, "reference": "Quran 1"},
            {"surah": "Al-Ikhlas", "ayat": 4, "reference": "Quran 112"},
            {"surah": "Al-Falaq", "ayat": 5, "reference": "Quran 113"},
            {"surah": "An-Nas", "ayat": 6, "reference": "Quran 114"},
        ],
    },
}

ENGLISH_LEVELS = {
    1: {
        "name": "Phonics — Letters A-Z",
        "description": "Learn letter sounds and recognition",
        "lessons": [
            {"letter": "A", "words": ["apple", "ant", "alligator"]},
            {"letter": "B", "words": ["ball", "bat", "book"]},
            {"letter": "C", "words": ["cat", "cup", "car"]},
        ],
    },
    2: {
        "name": "Sight Words — Grade 1",
        "description": "Common sight words for early readers",
        "lessons": [
            {"words": ["the", "and", "is", "it", "in"]},
            {"words": ["to", "was", "for", "you", "they"]},
            {"words": ["he", "she", "we", "can", "see"]},
        ],
    },
    3: {
        "name": "Simple Sentences",
        "description": "Read and write simple sentences",
        "lessons": [
            {"pattern": "I see a ___", "examples": ["I see a cat.", "I see a dog."]},
            {"pattern": "The ___ is ___.", "examples": ["The cat is big.", "The dog is red."]},
            {"pattern": "I can ___.", "examples": ["I can run.", "I can jump."]},
        ],
    },
}

MATH_LEVELS = {
    1: {
        "name": "Counting 1-20",
        "description": "Learn to count and recognize numbers",
        "lessons": [
            {"range": "1-5", "activity": "count_objects"},
            {"range": "6-10", "activity": "count_objects"},
            {"range": "11-20", "activity": "count_objects"},
        ],
    },
    2: {
        "name": "Addition",
        "description": "Simple addition within 10",
        "lessons": [
            {"type": "addition", "range": "1+1 to 5+5"},
            {"type": "addition", "range": "1+1 to 10+10"},
            {"type": "word_problems", "examples": ["I have 2 apples. I get 3 more. How many?"]},
        ],
    },
    3: {
        "name": "Subtraction",
        "description": "Simple subtraction within 10",
        "lessons": [
            {"type": "subtraction", "range": "5-1 to 10-5"},
            {"type": "subtraction", "range": "10-1 to 20-10"},
            {"type": "word_problems", "examples": ["I have 5 cookies. I eat 2. How many left?"]},
        ],
    },
}


def get_curriculum(subject: str):
    """Return curriculum data for a subject."""
    curricula = {
        "quran": QURAN_LEVELS,
        "english": ENGLISH_LEVELS,
        "math": MATH_LEVELS,
    }
    if subject not in curricula:
        raise ValueError(f"Unknown subject: {subject}. Available: {list(curricula.keys())}")
    return curricula[subject]
