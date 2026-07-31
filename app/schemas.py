"""
Request models for each StudyMate AI feature.
Keeping these separate makes it easy to add validation (e.g. min/max
question count) without touching route logic in main.py.
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class NotesRequest(BaseModel):
    subject: str = Field(..., examples=["Physics"])
    topic: str = Field(..., examples=["Newton's Laws of Motion"])
    depth: Optional[str] = Field(
        "medium", description="short | medium | detailed"
    )


class QuizRequest(BaseModel):
    subject: str
    topic: str
    num_questions: int = Field(5, ge=1, le=20)
    difficulty: Optional[str] = Field("medium", description="easy | medium | hard")


class FlashcardsRequest(BaseModel):
    subject: str
    topic: str
    count: int = Field(10, ge=1, le=30)


class SummaryRequest(BaseModel):
    subject: str
    topic: str
    source_text: Optional[str] = Field(
        None, description="Optional pasted notes to summarize instead of generating from scratch"
    )


class PlannerRequest(BaseModel):
    subjects: List[str] = Field(..., examples=[["Physics", "Chemistry", "Maths"]])
    exam_date: str = Field(..., examples=["2026-09-15"])
    hours_per_day: float = Field(..., ge=0.5, le=16)
    weak_subjects: Optional[List[str]] = Field(default_factory=list)


class Eli10Request(BaseModel):
    topic: str
    subject: Optional[str] = None


class DoubtRequest(BaseModel):
    question: str
    subject: Optional[str] = None
    context: Optional[str] = Field(
        None, description="Any extra notes/context the student wants the AI to consider"
    )

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    email: str
    password: str


class SaveHistoryRequest(BaseModel):
    section: str
    subject: Optional[str] = None
    topic: Optional[str] = None
    text: str


class TrackProgressRequest(BaseModel):
    activity_type: str