"""
TacoTutor - Seed data script for lessons and initial data.
Run: python -c "from backend.seed import seed_lessons; seed_lessons()"
"""

from sqlalchemy.orm import Session
from backend.core.database import SessionLocal
from backend.models import Lesson

QURAN_LESSONS = [
    {
        "subject": "quran",
        "level": 1,
        "title": "Arabic Letter: Alif (ا)",
        "description": "Learn to recognize and pronounce the Arabic letter Alif",
        "lesson_type": "letter",
        "content": {"letter": "ا", "name": "Alif", "sound": "a", "words": ["أب", "أم"]},
        "order_index": 1,
    },
    {
        "subject": "quran",
        "level": 1,
        "title": "Arabic Letter: Ba (ب)",
        "description": "Learn to recognize and pronounce the Arabic letter Ba",
        "lesson_type": "letter",
        "content": {"letter": "ب", "name": "Ba", "sound": "ba", "words": ["باب", "بيت"]},
        "order_index": 2,
    },
    {
        "subject": "quran",
        "level": 1,
        "title": "Arabic Letter: Ta (ت)",
        "description": "Learn to recognize and pronounce the Arabic letter Ta",
        "lesson_type": "letter",
        "content": {"letter": "ت", "name": "Ta", "sound": "ta", "words": ["تفاح", "تمر"]},
        "order_index": 3,
    },
    {
        "subject": "quran",
        "level": 2,
        "title": "Surah Al-Fatiha (1:1-7)",
        "description": "Memorize and recite Surah Al-Fatiha, the opening chapter of the Quran",
        "lesson_type": "surah",
        "content": {
            "surah": "Al-Fatiha",
            "surah_number": 1,
            "ayat": [1, 2, 3, 4, 5, 6, 7],
            "ayahs": [
                "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
                "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
                "الرَّحْمَٰنِ الرَّحِيمِ",
                "مَالِكِ يَوْمِ الدِّينِ",
                "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
                "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
                "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
            ],
        },
        "order_index": 4,
    },
    {
        "subject": "quran",
        "level": 2,
        "title": "Surah Al-Ikhlas (112:1-4)",
        "description": "Memorize and recite Surah Al-Ikhlas, the chapter on the Oneness of Allah",
        "lesson_type": "surah",
        "content": {
            "surah": "Al-Ikhlas",
            "surah_number": 112,
            "ayat": [1, 2, 3, 4],
            "ayahs": [
                "قُلْ هُوَ اللَّهُ أَحَدٌ",
                "اللَّهُ الصَّمَدُ",
                "لَمْ يَلِدْ وَلَمْ يُولَدْ",
                "وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ",
            ],
        },
        "order_index": 5,
    },
    {
        "subject": "quran",
        "level": 3,
        "title": "Surah Al-Falaq (113:1-5)",
        "description": "Memorize and recite Surah Al-Falaq, seeking refuge in the Lord of daybreak",
        "lesson_type": "surah",
        "content": {
            "surah": "Al-Falaq",
            "surah_number": 113,
            "ayat": [1, 2, 3, 4, 5],
            "ayahs": [
                "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ",
                "مِنْ شَرِّ مَا خَلَقَ",
                "وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ",
                "وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ",
                "وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ",
            ],
        },
        "order_index": 6,
    },
    {
        "subject": "quran",
        "level": 3,
        "title": "Surah An-Nas (114:1-6)",
        "description": "Memorize and recite Surah An-Nas, seeking refuge in the Lord of mankind",
        "lesson_type": "surah",
        "content": {
            "surah": "An-Nas",
            "surah_number": 114,
            "ayat": [1, 2, 3, 4, 5, 6],
            "ayahs": [
                "قُلْ أَعُوذُ بِرَبِّ النَّاسِ",
                "مَلِكِ النَّاسِ",
                "إِلَٰهِ النَّاسِ",
                "مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ",
                "الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ",
                "مِنَ الْجِنَّةِ وَالنَّاسِ",
            ],
        },
        "order_index": 7,
    },
]

ENGLISH_LESSONS = [
    {
        "subject": "english",
        "level": 1,
        "title": "Letter A",
        "description": "Learn the letter A, its sound, and example words",
        "lesson_type": "phonics",
        "content": {"letter": "A", "sound": "/æ/", "words": ["apple", "ant", "alligator"]},
        "order_index": 1,
    },
    {
        "subject": "english",
        "level": 1,
        "title": "Letter B",
        "description": "Learn the letter B, its sound, and example words",
        "lesson_type": "phonics",
        "content": {"letter": "B", "sound": "/b/", "words": ["ball", "bat", "book"]},
        "order_index": 2,
    },
]

MATH_LESSONS = [
    {
        "subject": "math",
        "level": 1,
        "title": "Counting 1-5",
        "description": "Learn to count from 1 to 5",
        "lesson_type": "counting",
        "content": {"range": "1-5", "objects": ["apple", "star", "ball"]},
        "order_index": 1,
    },
]


def seed_lessons(db: Session = None):
    if db is None:
        db = SessionLocal()

    all_lessons = QURAN_LESSONS + ENGLISH_LESSONS + MATH_LESSONS

    for lesson_data in all_lessons:
        existing = db.query(Lesson).filter(
            Lesson.subject == lesson_data["subject"],
            Lesson.title == lesson_data["title"],
        ).first()

        if not existing:
            lesson = Lesson(**lesson_data)
            db.add(lesson)

    db.commit()
    print(f"Seeded {len(all_lessons)} lessons")


if __name__ == "__main__":
    seed_lessons()
