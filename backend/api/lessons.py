"""
TacoTutor Backend - Lessons and assignments endpoints.
"""

import uuid as _uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.api.auth import get_current_parent
from backend.models import User, Lesson, LessonAssignment, Child
from backend.schemas import (
    LessonCreate, LessonResponse,
    LessonAssignmentCreate, LessonAssignmentResponse
)

router = APIRouter(tags=["lessons"])


def _uuid_or_404(value: str) -> _uuid.UUID:
    try:
        return _uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")


# ─── Lessons ───────────────────────────────────────────

@router.post("", response_model=LessonResponse)
def create_lesson(data: LessonCreate, db: Session = Depends(get_db)):
    lesson = Lesson(**data.model_dump())
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.get("", response_model=List[LessonResponse])
def list_lessons(
    subject: Optional[str] = None,
    level: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Lesson)
    if subject:
        query = query.filter(Lesson.subject == subject)
    if level:
        query = query.filter(Lesson.level == level)
    return query.order_by(Lesson.order_index).all()


@router.get("/{lesson_id}", response_model=LessonResponse)
def get_lesson(lesson_id: str, db: Session = Depends(get_db)):
    lid = _uuid_or_404(lesson_id)
    lesson = db.query(Lesson).filter(Lesson.id == lid).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@router.delete("/{lesson_id}")
def delete_lesson(lesson_id: str, db: Session = Depends(get_db)):
    lid = _uuid_or_404(lesson_id)
    lesson = db.query(Lesson).filter(Lesson.id == lid).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    db.delete(lesson)
    db.commit()
    return {"deleted": True}


# ─── Assignments ───────────────────────────────────────

@router.post("/assign", response_model=LessonAssignmentResponse)
def assign_lesson(
    data: LessonAssignmentCreate,
    db: Session = Depends(get_db),
    parent: User = Depends(get_current_parent)
):
    child_uuid = _uuid_or_404(str(data.child_id))
    lesson_uuid = _uuid_or_404(str(data.lesson_id))

    child = db.query(Child).filter(Child.id == child_uuid, Child.parent_id == parent.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    existing = db.query(LessonAssignment).filter(
        LessonAssignment.child_id == child_uuid,
        LessonAssignment.lesson_id == lesson_uuid
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Lesson already assigned to this child")

    assignment = LessonAssignment(child_id=child_uuid, lesson_id=lesson_uuid)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/child/{child_id}/assignments", response_model=List[LessonAssignmentResponse])
def get_child_assignments(
    child_id: str,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    parent: User = Depends(get_current_parent)
):
    cid = _uuid_or_404(child_id)
    child = db.query(Child).filter(Child.id == cid, Child.parent_id == parent.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    query = db.query(LessonAssignment).filter(LessonAssignment.child_id == cid)
    if status:
        query = query.filter(LessonAssignment.status == status)
    return query.order_by(LessonAssignment.assigned_at.desc()).all()


@router.delete("/assignments/{assignment_id}")
def unassign_lesson(
    assignment_id: str,
    db: Session = Depends(get_db),
    parent: User = Depends(get_current_parent)
):
    aid = _uuid_or_404(assignment_id)
    assignment = db.query(LessonAssignment).filter(LessonAssignment.id == aid).first()
    if not assignment or assignment.child.parent_id != parent.id:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
    return {"detail": "Unassigned"}


@router.patch("/assignments/{assignment_id}", response_model=LessonAssignmentResponse)
def update_assignment(
    assignment_id: str,
    status: str,
    db: Session = Depends(get_db),
    parent: User = Depends(get_current_parent)
):
    aid = _uuid_or_404(assignment_id)
    assignment = db.query(LessonAssignment).filter(LessonAssignment.id == aid).first()
    if not assignment or assignment.child.parent_id != parent.id:
        raise HTTPException(status_code=404, detail="Assignment not found")
    assignment.status = status
    if status == "completed":
        from datetime import datetime
        assignment.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(assignment)
    return assignment
