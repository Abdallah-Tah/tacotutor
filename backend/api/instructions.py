"""
TacoTutor Backend - Instruction file endpoints.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.api.auth import get_current_parent
from backend.models import User, InstructionFile, Child
from backend.schemas import InstructionFileCreate, InstructionFileResponse

router = APIRouter(tags=["instructions"])


@router.post("", response_model=InstructionFileResponse)
def create_instruction(
    data: InstructionFileCreate,
    db: Session = Depends(get_db),
    parent: User = Depends(get_current_parent)
):
    if data.child_id:
        child = db.query(Child).filter(Child.id == data.child_id, Child.parent_id == parent.id).first()
        if not child:
            raise HTTPException(status_code=404, detail="Child not found")

    instruction = InstructionFile(
        name=data.name,
        content=data.content,
        child_id=data.child_id,
        lesson_id=data.lesson_id,
    )
    db.add(instruction)
    db.commit()
    db.refresh(instruction)
    return instruction


@router.get("", response_model=List[InstructionFileResponse])
def list_instructions(
    child_id: Optional[str] = None,
    lesson_id: Optional[str] = None,
    db: Session = Depends(get_db),
    parent: User = Depends(get_current_parent)
):
    query = db.query(InstructionFile)
    if child_id:
        child = db.query(Child).filter(Child.id == child_id, Child.parent_id == parent.id).first()
        if not child:
            raise HTTPException(status_code=404, detail="Child not found")
        query = query.filter(InstructionFile.child_id == child_id)
    if lesson_id:
        query = query.filter(InstructionFile.lesson_id == lesson_id)
    return query.order_by(InstructionFile.created_at.desc()).all()


@router.get("/{instruction_id}", response_model=InstructionFileResponse)
def get_instruction(
    instruction_id: str,
    db: Session = Depends(get_db),
    parent: User = Depends(get_current_parent)
):
    instruction = db.query(InstructionFile).filter(InstructionFile.id == instruction_id).first()
    if not instruction:
        raise HTTPException(status_code=404, detail="Instruction not found")
    if instruction.child_id:
        child = db.query(Child).filter(Child.id == instruction.child_id).first()
        if not child or child.parent_id != parent.id:
            raise HTTPException(status_code=403, detail="Access denied")
    return instruction


@router.patch("/{instruction_id}", response_model=InstructionFileResponse)
def update_instruction(
    instruction_id: str,
    data: InstructionFileCreate,
    db: Session = Depends(get_db),
    parent: User = Depends(get_current_parent)
):
    instruction = db.query(InstructionFile).filter(InstructionFile.id == instruction_id).first()
    if not instruction:
        raise HTTPException(status_code=404, detail="Instruction not found")

    instruction.name = data.name
    instruction.content = data.content
    if data.child_id is not None:
        instruction.child_id = data.child_id
    if data.lesson_id is not None:
        instruction.lesson_id = data.lesson_id
    db.commit()
    db.refresh(instruction)
    return instruction


@router.delete("/{instruction_id}")
def delete_instruction(
    instruction_id: str,
    db: Session = Depends(get_db),
    parent: User = Depends(get_current_parent)
):
    instruction = db.query(InstructionFile).filter(InstructionFile.id == instruction_id).first()
    if not instruction:
        raise HTTPException(status_code=404, detail="Instruction not found")
    db.delete(instruction)
    db.commit()
    return {"deleted": True}
