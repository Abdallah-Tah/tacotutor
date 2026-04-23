"""
TacoTutor Backend - Pydantic schemas.
"""

from datetime import datetime, date
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, EmailStr, ConfigDict


# Auth
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserSignup(BaseModel):
    email: EmailStr
    password: str
    display_name: Optional[str] = None


class GoogleAuth(BaseModel):
    token: str


# Users
class UserBase(BaseModel):
    email: EmailStr
    display_name: Optional[str] = None
    role: str = "parent"


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime


# Children
class ChildBase(BaseModel):
    name: str
    age: Optional[int] = None
    avatar_color: str = "#6C63FF"
    gender: Optional[str] = None  # "male" or "female"


class ChildCreate(ChildBase):
    pass


class ChildResponse(ChildBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    parent_id: UUID
    created_at: datetime


# Student Profiles
class StudentProfileBase(BaseModel):
    current_level: int = 1
    learning_pace: str = "medium"
    correction_style: str = "gentle"
    encouragement_style: str = "warm"


class StudentProfileUpdate(BaseModel):
    current_level: Optional[int] = None
    learning_pace: Optional[str] = None
    correction_style: Optional[str] = None
    encouragement_style: Optional[str] = None
    instruction_file_id: Optional[UUID] = None


class StudentProfileResponse(StudentProfileBase):
    model_config = ConfigDict(from_attributes=True)

    child_id: UUID
    instruction_file_id: Optional[UUID] = None


# Lessons
class LessonBase(BaseModel):
    subject: str
    level: int
    title: str
    description: Optional[str] = None
    lesson_type: Optional[str] = None
    content: dict
    order_index: int = 0


class LessonCreate(LessonBase):
    pass


class LessonResponse(LessonBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime


# Lesson Assignments
class LessonAssignmentBase(BaseModel):
    status: str = "pending"


class LessonAssignmentCreate(BaseModel):
    child_id: UUID
    lesson_id: UUID


class LessonAssignmentResponse(LessonAssignmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_id: UUID
    lesson_id: UUID
    assigned_at: datetime
    completed_at: Optional[datetime] = None
    lesson: Optional[LessonResponse] = None


# Sessions
class SessionBase(BaseModel):
    lesson_id: Optional[UUID] = None
    duration_seconds: int = 0
    total_turns: int = 0
    correct_count: int = 0
    mistake_count: int = 0


class SessionCreate(BaseModel):
    child_id: UUID
    lesson_id: Optional[UUID] = None


class SessionResponse(SessionBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_id: UUID
    started_at: datetime
    ended_at: Optional[datetime] = None


# Progress
class ProgressBase(BaseModel):
    subject: str
    level: int = 1
    current_lesson_index: int = 0
    mastery_score: float = 0.0
    streak_days: int = 0
    last_practice_date: Optional[date] = None


class ProgressResponse(ProgressBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_id: UUID
    updated_at: Optional[datetime] = None


# Mistakes
class MistakeLogBase(BaseModel):
    subject: str
    mistake_type: str
    context: Optional[str] = None
    frequency: int = 1


class MistakeLogResponse(MistakeLogBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_id: UUID
    last_seen_at: datetime


# Rewards
class RewardBase(BaseModel):
    reward_type: str
    reward_data: dict = {}


class RewardResponse(RewardBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_id: UUID
    earned_at: datetime


# Instruction Files
class InstructionFileBase(BaseModel):
    name: str
    content: str
    child_id: Optional[UUID] = None
    lesson_id: Optional[UUID] = None
    is_active: bool = True


class InstructionFileCreate(BaseModel):
    name: str
    content: str
    child_id: Optional[UUID] = None
    lesson_id: Optional[UUID] = None


class InstructionFileResponse(InstructionFileBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime


# Dashboard
class ParentDashboard(BaseModel):
    children: List[ChildResponse]
    recent_sessions: List[SessionResponse]
    progress_summaries: List[ProgressResponse]


class KidDashboard(BaseModel):
    child: ChildResponse
    current_lesson: Optional[LessonAssignmentResponse] = None
    streak_days: int = 0
    rewards: List[RewardResponse]
    progress: List[ProgressResponse]


# Real-time Session
class SessionState(BaseModel):
    session_id: str
    child_id: UUID
    lesson_id: Optional[UUID] = None
    current_ayah: Optional[str] = None
    position: int = 0
    score: float = 0.0
    mistakes: List[dict] = []
