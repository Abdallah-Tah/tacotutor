"""
TacoTutor Backend - Session manager for real-time tutoring.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session as DBSession

from backend.models import SessionHistory, RecitationAttempt


class SessionManager:
    """Manages tutoring sessions: create, update, track, persist."""

    def __init__(self, db: DBSession):
        self.db = db

    def create_session(self, child_id: str, lesson_id: Optional[str] = None) -> SessionHistory:
        session = SessionHistory(child_id=child_id, lesson_id=lesson_id)
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def end_session(self, session_id: str) -> SessionHistory:
        session = self.db.query(SessionHistory).filter(SessionHistory.id == session_id).first()
        if not session:
            raise ValueError(f"Session {session_id} not found")

        session.ended_at = datetime.utcnow()
        if session.started_at:
            delta = session.ended_at - session.started_at
            session.duration_seconds = int(delta.total_seconds())

        self.db.commit()
        self.db.refresh(session)
        return session

    def record_turn(self, session_id: str, correct: bool = True) -> None:
        session = self.db.query(SessionHistory).filter(SessionHistory.id == session_id).first()
        if not session:
            return

        session.total_turns = (session.total_turns or 0) + 1
        if correct:
            session.correct_count = (session.correct_count or 0) + 1
        else:
            session.mistake_count = (session.mistake_count or 0) + 1

        self.db.commit()

    def record_recitation(
        self,
        session_id: str,
        ayah_id: str,
        expected_text: str,
        recognized_text: str,
        accuracy_score: float,
        mistakes: list,
    ) -> RecitationAttempt:
        attempt = RecitationAttempt(
            session_id=session_id,
            ayah_id=ayah_id,
            expected_text=expected_text,
            recognized_text=recognized_text,
            accuracy_score=accuracy_score,
            mistakes=mistakes,
        )
        self.db.add(attempt)
        self.db.commit()
        self.db.refresh(attempt)
        return attempt

    def get_session(self, session_id: str) -> Optional[SessionHistory]:
        return self.db.query(SessionHistory).filter(SessionHistory.id == session_id).first()
