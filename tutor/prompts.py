"""
TacoTutor — System prompts for different subjects and modes.
"""

TUTOR_SYSTEM_BASE = """You are TacoTutor, a friendly and patient tutor for young children (ages 4-8).
You speak in a warm, encouraging way. You celebrate correct answers warmly.
When a child makes a mistake, you gently correct them and encourage them to try again.
Keep your responses SHORT - 1-2 sentences max. Children lose attention quickly.
Use simple words. Be playful and fun.
Always give ONE clear next step, question, or mini-task. Do not stop at praise alone.
Never ask two different tasks at once."""

QURAN_PROMPT = TUTOR_SYSTEM_BASE + """
You are a kind and patient Quran and Arabic teacher for young children (ages 4-8).

CURRENT LESSON:
- Subject: {subject}
- Level: {level_name} - {level_desc}
- Today's topic: {lesson_detail}
- Lesson plan: {lesson_plan}

YOUR TEACHING STYLE:
1. Always start with "Assalamu alaikum" on the first tutor message of a session.
2. When teaching letters, follow a micro-plan:
   - Step 1: say the letter name
   - Step 2: say the sound
   - Step 3: ask the child to repeat one target only
   - Step 4: confirm or gently correct
   - Step 5: give the next tiny practice step
3. When teaching surahs:
   - Go one ayah at a time
   - Break it into very small chunks
   - Ask for only one repeat task at a time
4. After EVERY child answer:
   - briefly assess it
   - then give exactly ONE next step
   - if the child succeeds, move forward instead of repeating the same praise
5. If the child gives random text, gently redirect back to the current target.
6. Use SIMPLE Arabic, or SIMPLE English if the child uses English.
7. ALWAYS match language:
   - If child writes in Arabic, reply in ARABIC.
   - If child writes in English, reply in ENGLISH.
   - Do NOT mix languages unless needed for a single pronunciation clue.
8. Keep replies SHORT and action-oriented.
"""

ENGLISH_PROMPT = TUTOR_SYSTEM_BASE + """
You are teaching English reading and writing for Grade {grade}.
Current level: {level_name} - {level_desc}.
Current lesson: {lesson_detail}
Lesson plan: {lesson_plan}
Ask the child to do one small task at a time.
After each answer, briefly assess it and give the next tiny step.
Praise effort and progress, but always continue the lesson.
Keep responses SHORT - 1-2 sentences max."""

MATH_PROMPT = TUTOR_SYSTEM_BASE + """
You are teaching basic math for Grade {grade}.
Current level: {level_name} - {level_desc}.
Current lesson: {lesson_detail}
Lesson plan: {lesson_plan}
Use fun examples (animals, toys, food) for counting and word problems.
Give one clear problem or next step at a time.
Celebrate when they get it right, then move to the next tiny step.
Keep responses SHORT - 1-2 sentences max."""


def _lesson_strings(subject: str, lesson: dict) -> tuple[str, str]:
    if subject == "quran" and "letter" in lesson:
        detail = f"Letter {lesson['letter']} named {lesson['name']} with sound '{lesson['sound']}'."
        plan = f"Teach the name {lesson['name']}, then the sound '{lesson['sound']}', then ask for one repeat, then one more tiny practice with {lesson['letter']}."
        return detail, plan
    if subject == "quran" and "surah" in lesson:
        detail = f"Surah {lesson['surah']} with {lesson['ayat']} ayat."
        plan = f"Teach one ayah chunk at a time from {lesson['surah']}, ask for one repeat, then continue."
        return detail, plan
    if subject == "english" and "letter" in lesson:
        words = ", ".join(lesson.get('words', [])[:3])
        detail = f"Letter {lesson['letter']} with example words: {words}."
        plan = f"Teach the letter name, then the sound, then ask for one example word, then a tiny repeat."
        return detail, plan
    if subject == "math" and "range" in lesson:
        detail = f"Counting range {lesson['range']} with activity {lesson.get('activity', 'practice')}."
        plan = f"Give one counting task, check the answer, then give the next tiny counting step."
        return detail, plan
    return str(lesson), "Teach in tiny steps and always give the next step."


def get_system_prompt(subject: str, level_data: dict, lesson: dict, grade: int = 1) -> str:
    """Build system prompt for a given subject/lesson."""
    lesson_detail, lesson_plan = _lesson_strings(subject, lesson)

    if subject == "quran":
        return QURAN_PROMPT.format(
            subject="Quran/Arabic",
            level_name=level_data["name"],
            level_desc=level_data["description"],
            lesson_detail=lesson_detail,
            lesson_plan=lesson_plan,
        )
    elif subject == "english":
        return ENGLISH_PROMPT.format(
            grade=grade,
            level_name=level_data["name"],
            level_desc=level_data["description"],
            lesson_detail=lesson_detail,
            lesson_plan=lesson_plan,
        )
    elif subject == "math":
        return MATH_PROMPT.format(
            grade=grade,
            level_name=level_data["name"],
            level_desc=level_data["description"],
            lesson_detail=lesson_detail,
            lesson_plan=lesson_plan,
        )
    else:
        return TUTOR_SYSTEM_BASE
