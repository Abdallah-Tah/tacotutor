"""
TacoTutor Backend - Session tracking endpoints.
"""

from datetime import datetime
from typing import List, Optional

import uuid as _uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.api.auth import get_current_parent, get_current_user
from backend.models import User, SessionHistory, RecitationAttempt, Child
from backend.schemas import SessionCreate, SessionResponse, SessionState

def _uuid_or_404(value: str) -> _uuid.UUID:
    try:
        return _uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")


router = APIRouter(tags=["sessions"])


@router.post("/start", response_model=SessionResponse)
def start_session(
    data: SessionCreate,
    db: Session = Depends(get_db),
    parent: User = Depends(get_current_parent)
):
    child = db.query(Child).filter(Child.id == _uuid_or_404(str(data.child_id)), Child.parent_id == parent.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    session = SessionHistory(child_id=data.child_id, lesson_id=data.lesson_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/{session_id}/end", response_model=SessionResponse)
def end_session(
    session_id: str,
    db: Session = Depends(get_db),
    parent: User = Depends(get_current_parent)
):
    session = db.query(SessionHistory).filter(SessionHistory.id == _uuid_or_404(session_id)).first()
    if not session or session.child.parent_id != parent.id:
        raise HTTPException(status_code=404, detail="Session not found")

    session.ended_at = datetime.utcnow()
    if session.started_at:
        delta = session.ended_at - session.started_at
        session.duration_seconds = int(delta.total_seconds())
    db.commit()
    db.refresh(session)
    return session


@router.get("/child/{child_id}", response_model=List[SessionResponse])
def list_sessions(
    child_id: str,
    db: Session = Depends(get_db),
    parent: User = Depends(get_current_parent)
):
    child = db.query(Child).filter(Child.id == _uuid_or_404(child_id), Child.parent_id == parent.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    return (
        db.query(SessionHistory)
        .filter(SessionHistory.child_id == child_id)
        .order_by(SessionHistory.started_at.desc())
        .all()
    )


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    parent: User = Depends(get_current_parent)
):
    session = db.query(SessionHistory).filter(SessionHistory.id == _uuid_or_404(session_id)).first()
    if not session or session.child.parent_id != parent.id:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


# ─── Dashboard ─────────────────────────────────────────

@router.get("/dashboard/parent")
def parent_dashboard(db: Session = Depends(get_db), parent: User = Depends(get_current_parent)):
    from backend.schemas import ParentDashboard
    from backend.models import ProgressRecord

    children = db.query(Child).filter(Child.parent_id == parent.id).all()
    child_ids = [c.id for c in children]

    recent_sessions = (
        db.query(SessionHistory)
        .filter(SessionHistory.child_id.in_(child_ids))
        .order_by(SessionHistory.started_at.desc())
        .limit(10)
        .all()
    )

    progress = (
        db.query(ProgressRecord)
        .filter(ProgressRecord.child_id.in_(child_ids))
        .all()
    )

    return ParentDashboard(
        children=children,
        recent_sessions=recent_sessions,
        progress_summaries=progress,
    )


@router.get("/dashboard/kid/{child_id}")
def kid_dashboard(
    child_id: str,
    db: Session = Depends(get_db),
    parent: User = Depends(get_current_parent)
):
    from backend.schemas import KidDashboard
    from backend.models import Reward, LessonAssignment, ProgressRecord

    child = db.query(Child).filter(Child.id == _uuid_or_404(child_id), Child.parent_id == parent.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    current_lesson = (
        db.query(LessonAssignment)
        .filter(LessonAssignment.child_id == child_id)
        .filter(LessonAssignment.status.in_(["pending", "in_progress"]))
        .order_by(LessonAssignment.assigned_at.desc())
        .first()
    )

    rewards = db.query(Reward).filter(Reward.child_id == child_id).order_by(Reward.earned_at.desc()).limit(10).all()
    progress = db.query(ProgressRecord).filter(ProgressRecord.child_id == child_id).all()

    streak = 0
    for p in progress:
        streak = max(streak, p.streak_days)

    return KidDashboard(
        child=child,
        current_lesson=current_lesson,
        streak_days=streak,
        rewards=rewards,
        progress=progress,
    )
