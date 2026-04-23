"""
TacoTutor Backend - Real-time teaching loop engine.

LISTEN -> TRANSCRIBE -> MATCH -> DECIDE -> RESPOND -> REPEAT
"""

from dataclasses import dataclass, field
from typing import Optional, List
from enum import Enum


class TurnState(Enum):
    LISTENING = "listening"
    TRANSCRIBING = "transcribing"
    MATCHING = "matching"
    DECIDING = "deciding"
    RESPONDING = "responding"
    IDLE = "idle"


@dataclass
class SessionState:
    child_id: str
    lesson_id: Optional[str] = None
    current_ayah: Optional[str] = None
    position: int = 0
    score: float = 0.0
    mistakes: List[dict] = field(default_factory=list)
    turn_state: TurnState = TurnState.IDLE
    transcript_buffer: str = ""


class TutorEngine:
    """Core teaching loop for real-time Quran tutoring."""

    def __init__(self):
        self.sessions: dict[str, SessionState] = {}

    def create_session(self, child_id: str, lesson_id: Optional[str] = None) -> SessionState:
        session = SessionState(child_id=child_id, lesson_id=lesson_id)
        self.sessions[child_id] = session
        return session

    def get_session(self, child_id: str) -> Optional[SessionState]:
        return self.sessions.get(child_id)

    def process_audio(self, child_id: str, audio_data: bytes) -> dict:
        """Process incoming audio frame."""
        session = self.get_session(child_id)
        if not session:
            return {"error": "Session not found"}

        session.turn_state = TurnState.LISTENING
        return {"type": "partial_transcript", "text": "..."}

    def process_transcript(self, child_id: str, transcript: str) -> dict:
        """Process final transcript."""
        session = self.get_session(child_id)
        if not session:
            return {"error": "Session not found"}

        session.turn_state = TurnState.MATCHING
        session.transcript_buffer = transcript

        # TODO: Run QuranMatcher here
        accuracy = 0.0
        mistakes = []

        session.turn_state = TurnState.DECIDING

        if accuracy > 90:
            decision = "encourage"
        elif accuracy > 50:
            decision = "gentle_correction"
        else:
            decision = "stop_and_fix"

        session.turn_state = TurnState.RESPONDING

        return {
            "type": "matching_result",
            "accuracy": accuracy,
            "mistakes": mistakes,
            "decision": decision,
            "transcript": transcript,
        }

    def generate_response(self, child_id: str, decision: str) -> dict:
        """Generate tutor response based on decision."""
        responses = {
            "encourage": "Masha'Allah! Excellent recitation! Let's continue to the next word.",
            "gentle_correction": "Good try! Let's practice that word again. Listen carefully...",
            "stop_and_fix": "Let's take it slow. I'll show you how to say it. Repeat after me...",
        }

        text = responses.get(decision, "Let's keep practicing!")

        return {
            "type": "assistant_sentence",
            "text": text,
        }

    def handle_barge_in(self, child_id: str) -> dict:
        """Handle child interrupting tutor."""
        session = self.get_session(child_id)
        if session:
            session.turn_state = TurnState.LISTENING

        return {
            "type": "turn_complete",
            "reason": "barge_in",
        }
