"""
TacoTutor — Main voice agent using Pipecat.
Real-time voice conversation with kids for Quran, English, and Math tutoring.

Usage:
    python bot.py                     # Interactive voice session
    python bot.py --subject quran     # Start with specific subject
    python bot.py --child Ali         # Load child's progress
    python bot.py --text              # Text mode (no mic/speaker)
"""

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from tutor.llm.providers import get_llm
from tutor.tts.providers import get_tts
from tutor.stt.providers import get_stt
from tutor.curriculum.lessons import get_curriculum
from tutor.prompts import get_system_prompt
from tutor.progress import ProgressTracker

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
log = logging.getLogger("tacotutor")


class TacoTutorAgent:
    def __init__(self, subject: str = "quran", child_name: str = "student",
                 text_mode: bool = False):
        self.subject = subject
        self.child_name = child_name
        self.text_mode = text_mode
        self.llm = get_llm()
        self.tts = get_tts()
        self.stt = get_stt()
        self.progress = ProgressTracker()
        self.history: list[dict] = []
        self._init_session()

    def _init_session(self):
        """Load child's progress and set up the lesson."""
        p = self.progress.get_progress(self.child_name)
        subj = p["subjects"].get(self.subject, {"level": 1, "lesson_index": 0})
        self.level = subj["level"]
        self.lesson_index = subj["lesson_index"]

        curriculum = get_curriculum(self.subject)
        level_data = curriculum.get(self.level)
        if not level_data:
            log.warning(f"Level {self.level} not found, defaulting to 1")
            self.level = 1
            level_data = curriculum[1]

        lessons = level_data["lessons"]
        if self.lesson_index >= len(lessons):
            self.lesson_index = 0  # Loop back or advance level

        self.current_lesson = lessons[self.lesson_index]
        self.level_data = level_data

        system_prompt = get_system_prompt(
            self.subject, level_data, self.current_lesson, grade=1
        )
        self.history = [{"role": "system", "content": system_prompt}]
        log.info(f"Session: {self.child_name} | {self.subject} L{self.level} I{self.lesson_index}")

    async def respond(self, user_text: str) -> str:
        """Get LLM response to user input."""
        self.history.append({"role": "user", "content": user_text})
        reply = await self.llm.chat(self.history)
        self.history.append({"role": "assistant", "content": reply})
        return reply

    async def speak(self, text: str, language: str = "en") -> str:
        """Convert text to speech."""
        return await self.tts.speak(text, language=language)

    async def listen(self, audio_path: str, language: str = "auto") -> str:
        """Transcribe audio to text."""
        return await self.stt.transcribe(audio_path, language=language)

    async def text_chat(self):
        """Interactive text chat mode."""
        print(f"\n🌮 TacoTutor — {self.subject.upper()} (child: {self.child_name})")
        print(f"   Level {self.level}: {self.level_data['name']}")
        print("   Type 'quit' to exit, 'next' to advance lesson\n")

        # Initial greeting
        greeting = await self.respond("Greet the student and start the lesson.")
        print(f"🌮 Tutor: {greeting}\n")

        while True:
            user_input = input("👶 Student: ").strip()
            if not user_input:
                continue
            if user_input.lower() == "quit":
                self.progress.update_progress(
                    self.child_name, self.subject, self.level, self.lesson_index
                )
                print("🌮 Goodbye! See you next time! 👋")
                break
            if user_input.lower() == "next":
                self.lesson_index += 1
                self.progress.complete_lesson(
                    self.child_name, self.subject, self.level, self.lesson_index - 1
                )
                self._init_session()
                print(f"\n📚 Advanced to next lesson!")
                greeting = await self.respond("Start the new lesson.")
                print(f"🌮 Tutor: {greeting}\n")
                continue

            reply = await self.respond(user_input)
            print(f"🌮 Tutor: {reply}\n")


async def main():
    parser = argparse.ArgumentParser(description="TacoTutor — Voice Tutor for Kids")
    parser.add_argument("--subject", default="quran", choices=["quran", "english", "math"],
                        help="Subject to teach")
    parser.add_argument("--child", default="student", help="Child's name for progress tracking")
    parser.add_argument("--text", action="store_true", help="Text mode (no voice)")
    args = parser.parse_args()

    agent = TacoTutorAgent(
        subject=args.subject,
        child_name=args.child,
        text_mode=args.text,
    )

    if args.text:
        await agent.text_chat()
    else:
        # TODO: Pipecat voice pipeline (Phase 1 — next step)
        print("🎤 Voice mode coming soon! Use --text for now.")
        await agent.text_chat()


if __name__ == "__main__":
    asyncio.run(main())
