"""
TacoTutor Backend - SQLAlchemy models.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime,
    ForeignKey, JSON, Date, UniqueConstraint, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(20), nullable=False, default="parent")
    google_id = Column(String(100), nullable=True, unique=True)
    display_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    children = relationship("Child", back_populates="parent", cascade="all, delete-orphan")


class Child(Base):
    __tablename__ = "children"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=True)
    avatar_color = Column(String(20), default="#6C63FF")
    gender = Column(String(10), nullable=True)  # "male" or "female"
    created_at = Column(DateTime, server_default=func.now())

    parent = relationship("User", back_populates="children")
    profile = relationship("StudentProfile", back_populates="child", uselist=False)
    progress_records = relationship("ProgressRecord", back_populates="child", cascade="all, delete-orphan")
    lesson_assignments = relationship("LessonAssignment", back_populates="child", cascade="all, delete-orphan")
    session_histories = relationship("SessionHistory", back_populates="child", cascade="all, delete-orphan")
    mistake_logs = relationship("MistakeLog", back_populates="child", cascade="all, delete-orphan")
    rewards = relationship("Reward", back_populates="child", cascade="all, delete-orphan")


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    child_id = Column(UUID(as_uuid=True), ForeignKey("children.id"), primary_key=True)
    current_level = Column(Integer, default=1)
    learning_pace = Column(String(20), default="medium")
    correction_style = Column(String(20), default="gentle")
    encouragement_style = Column(String(20), default="warm")
    instruction_file_id = Column(UUID(as_uuid=True), ForeignKey("instruction_files.id"), nullable=True)

    child = relationship("Child", back_populates="profile")
    instruction_file = relationship("InstructionFile")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject = Column(String(50), nullable=False)
    level = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    lesson_type = Column(String(50), nullable=True)
    content = Column(JSON, nullable=False)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    assignments = relationship("LessonAssignment", back_populates="lesson")


class LessonAssignment(Base):
    __tablename__ = "lesson_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id = Column(UUID(as_uuid=True), ForeignKey("children.id"), nullable=False)
    lesson_id = Column(UUID(as_uuid=True), ForeignKey("lessons.id"), nullable=False)
    status = Column(String(20), default="pending")
    assigned_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)

    __table_args__ = (UniqueConstraint("child_id", "lesson_id", name="uix_child_lesson"),)

    child = relationship("Child", back_populates="lesson_assignments")
    lesson = relationship("Lesson", back_populates="assignments")


class SessionHistory(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id = Column(UUID(as_uuid=True), ForeignKey("children.id"), nullable=False)
    lesson_id = Column(UUID(as_uuid=True), ForeignKey("lessons.id"), nullable=True)
    started_at = Column(DateTime, server_default=func.now())
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, default=0)
    total_turns = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    mistake_count = Column(Integer, default=0)

    child = relationship("Child", back_populates="session_histories")
    recitation_attempts = relationship("RecitationAttempt", back_populates="session", cascade="all, delete-orphan")


class RecitationAttempt(Base):
    __tablename__ = "recitation_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False)
    ayah_id = Column(String(50), nullable=True)
    expected_text = Column(Text, nullable=True)
    recognized_text = Column(Text, nullable=True)
    accuracy_score = Column(Float, nullable=True)
    mistakes = Column(JSON, default=list)
    created_at = Column(DateTime, server_default=func.now())

    session = relationship("SessionHistory", back_populates="recitation_attempts")


class ProgressRecord(Base):
    __tablename__ = "progress_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id = Column(UUID(as_uuid=True), ForeignKey("children.id"), nullable=False)
    subject = Column(String(50), nullable=False)
    level = Column(Integer, default=1)
    current_lesson_index = Column(Integer, default=0)
    mastery_score = Column(Float, default=0.0)
    streak_days = Column(Integer, default=0)
    last_practice_date = Column(Date, nullable=True)
    updated_at = Column(DateTime, onupdate=func.now())

    child = relationship("Child", back_populates="progress_records")


class MistakeLog(Base):
    __tablename__ = "mistake_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id = Column(UUID(as_uuid=True), ForeignKey("children.id"), nullable=False)
    subject = Column(String(50), nullable=False)
    mistake_type = Column(String(50), nullable=False)
    context = Column(Text, nullable=True)
    frequency = Column(Integer, default=1)
    last_seen_at = Column(DateTime, server_default=func.now())

    child = relationship("Child", back_populates="mistake_logs")


class Reward(Base):
    __tablename__ = "rewards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id = Column(UUID(as_uuid=True), ForeignKey("children.id"), nullable=False)
    reward_type = Column(String(50), nullable=False)
    reward_data = Column(JSON, default=dict)
    earned_at = Column(DateTime, server_default=func.now())

    child = relationship("Child", back_populates="rewards")


class InstructionFile(Base):
    __tablename__ = "instruction_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    child_id = Column(UUID(as_uuid=True), ForeignKey("children.id"), nullable=True)
    lesson_id = Column(UUID(as_uuid=True), ForeignKey("lessons.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    child = relationship("Child")
    lesson = relationship("Lesson")
    profiles = relationship("StudentProfile", back_populates="instruction_file")
