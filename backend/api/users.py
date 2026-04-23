"""
TacoTutor Backend - Users and children endpoints.
"""

from typing import List

import uuid as _uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.api.auth import get_current_parent, get_current_user
from backend.models import User, Child, StudentProfile, ProgressRecord
from backend.schemas import (
    ChildCreate, ChildResponse, StudentProfileUpdate, StudentProfileResponse,
    ProgressResponse
)

def _uuid_or_404(value: str) -> _uuid.UUID:
    try:
        return _uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")


router = APIRouter(tags=["users"])


@router.patch("/me")
def update_me(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if "display_name" in data and data["display_name"]:
        user.display_name = data["display_name"]
    db.commit()
    db.refresh(user)
    return user


# ─── Children ──────────────────────────────────────────

@router.post("/children", response_model=ChildResponse)
def create_child(data: ChildCreate, db: Session = Depends(get_db), parent: User = Depends(get_current_parent)):
    child = Child(
        parent_id=parent.id,
        name=data.name,
        age=data.age,
        avatar_color=data.avatar_color,
    )
    db.add(child)
    db.commit()
    db.refresh(child)

    # Create default profile
    profile = StudentProfile(child_id=child.id)
    db.add(profile)

    # Create default progress records
    for subject in ("quran", "english", "math"):
        prog = ProgressRecord(child_id=child.id, subject=subject)
        db.add(prog)

    db.commit()
    return child


@router.get("/children", response_model=List[ChildResponse])
def list_children(db: Session = Depends(get_db), parent: User = Depends(get_current_parent)):
    return db.query(Child).filter(Child.parent_id == parent.id).all()


@router.get("/children/{child_id}", response_model=ChildResponse)
def get_child(child_id: str, db: Session = Depends(get_db), parent: User = Depends(get_current_parent)):
    child = db.query(Child).filter(Child.id == _uuid_or_404(child_id), Child.parent_id == parent.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    return child


@router.patch("/children/{child_id}", response_model=ChildResponse)
def update_child(child_id: str, data: dict, db: Session = Depends(get_db), parent: User = Depends(get_current_parent)):
    child = db.query(Child).filter(Child.id == _uuid_or_404(child_id), Child.parent_id == parent.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if "name" in data and data["name"]:
        child.name = data["name"]
    if "age" in data:
        child.age = data["age"]
    if "gender" in data:
        child.gender = data["gender"]
    if "avatar_color" in data:
        child.avatar_color = data["avatar_color"]
    db.commit()
    db.refresh(child)
    return child


@router.delete("/children/{child_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_child(child_id: str, db: Session = Depends(get_db), parent: User = Depends(get_current_parent)):
    child = db.query(Child).filter(Child.id == _uuid_or_404(child_id), Child.parent_id == parent.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    db.delete(child)
    db.commit()


# ─── Student Profiles ──────────────────────────────────

@router.get("/children/{child_id}/profile", response_model=StudentProfileResponse)
def get_profile(child_id: str, db: Session = Depends(get_db), parent: User = Depends(get_current_parent)):
    child = db.query(Child).filter(Child.id == _uuid_or_404(child_id), Child.parent_id == parent.id).first()
    if not child or not child.profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return child.profile


@router.patch("/children/{child_id}/profile", response_model=StudentProfileResponse)
def update_profile(
    child_id: str,
    data: StudentProfileUpdate,
    db: Session = Depends(get_db),
    parent: User = Depends(get_current_parent)
):
    child = db.query(Child).filter(Child.id == _uuid_or_404(child_id), Child.parent_id == parent.id).first()
    if not child or not child.profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = child.profile
    if data.current_level is not None:
        profile.current_level = data.current_level
    if data.learning_pace is not None:
        profile.learning_pace = data.learning_pace
    if data.correction_style is not None:
        profile.correction_style = data.correction_style
    if data.encouragement_style is not None:
        profile.encouragement_style = data.encouragement_style
    if data.instruction_file_id is not None:
        profile.instruction_file_id = data.instruction_file_id
    db.commit()
    db.refresh(profile)
    return profile


# ─── Progress ──────────────────────────────────────────

@router.get("/children/{child_id}/progress", response_model=List[ProgressResponse])
def get_progress(child_id: str, db: Session = Depends(get_db), parent: User = Depends(get_current_parent)):
    child = db.query(Child).filter(Child.id == _uuid_or_404(child_id), Child.parent_id == parent.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    return db.query(ProgressRecord).filter(ProgressRecord.child_id == child_id).all()
