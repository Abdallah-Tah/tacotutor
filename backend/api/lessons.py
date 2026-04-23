"""
TacoTutor Backend - Lessons and assignments endpoints.
"""

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
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@router.delete("/{lesson_id}")
def delete_lesson(lesson_id: str, db: Session = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
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
    child = db.query(Child).filter(Child.id == data.child_id, Child.parent_id == parent.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    existing = db.query(LessonAssignment).filter(
        LessonAssignment.child_id == data.child_id,
        LessonAssignment.lesson_id == data.lesson_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Lesson already assigned to this child")

    assignment = LessonAssignment(child_id=data.child_id, lesson_id=data.lesson_id)
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
    child = db.query(Child).filter(Child.id == child_id, Child.parent_id == parent.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    query = db.query(LessonAssignment).filter(LessonAssignment.child_id == child_id)
    if status:
        query = query.filter(LessonAssignment.status == status)
    return query.order_by(LessonAssignment.assigned_at.desc()).all()


@router.delete("/assignments/{assignment_id}")
def unassign_lesson(
    assignment_id: str,
    db: Session = Depends(get_db),
    parent: User = Depends(get_current_parent)
):
    import uuid
    try:
        aid = uuid.UUID(assignment_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid assignment ID")
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
    assignment = db.query(LessonAssignment).filter(LessonAssignment.id == assignment_id).first()
    if not assignment or assignment.child.parent_id != parent.id:
        raise HTTPException(status_code=404, detail="Assignment not found")
    assignment.status = status
    if status == "completed":
        from datetime import datetime
        assignment.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(assignment)
    return assignment
