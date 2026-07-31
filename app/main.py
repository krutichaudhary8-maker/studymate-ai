import os
from dotenv import load_dotenv

# Load .env BEFORE importing gemini_service, since it reads the key at import time.
load_dotenv()

from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app import prompts
from app.gemini_service import stream_generate
from app.schemas import (
    NotesRequest,
    QuizRequest,
    FlashcardsRequest,
    SummaryRequest,
    PlannerRequest,
    Eli10Request,
    DoubtRequest,
    SignupRequest,
    LoginRequest,
    SaveHistoryRequest,
    TrackProgressRequest,
)
from app.database import Base, engine, get_db
from app.models import User, HistoryItem, ProgressItem, ActiveDay
from app.auth import hash_password, verify_password, create_token
from app.deps import get_current_user

# Create database tables if they don't exist yet
Base.metadata.create_all(bind=engine)

app = FastAPI(title="StudyMate AI API", version="1.0.0")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def stream_response(prompt: str) -> StreamingResponse:
    """Wraps any prompt into a streaming plain-text HTTP response."""
    return StreamingResponse(stream_generate(prompt), media_type="text/plain")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "StudyMate AI backend"}


# ---------- AI generation endpoints (unchanged) ----------

@app.post("/api/notes")
def generate_notes(req: NotesRequest):
    prompt = prompts.notes_prompt(req.subject, req.topic, req.depth)
    return stream_response(prompt)


@app.post("/api/quiz")
def generate_quiz(req: QuizRequest):
    prompt = prompts.quiz_prompt(req.subject, req.topic, req.num_questions, req.difficulty)
    return stream_response(prompt)


@app.post("/api/flashcards")
def generate_flashcards(req: FlashcardsRequest):
    prompt = prompts.flashcards_prompt(req.subject, req.topic, req.count)
    return stream_response(prompt)


@app.post("/api/summary")
def generate_summary(req: SummaryRequest):
    prompt = prompts.summary_prompt(req.subject, req.topic, req.source_text)
    return stream_response(prompt)


@app.post("/api/planner")
def generate_planner(req: PlannerRequest):
    prompt = prompts.planner_prompt(req.subjects, req.exam_date, req.hours_per_day, req.weak_subjects)
    return stream_response(prompt)


@app.post("/api/eli10")
def generate_eli10(req: Eli10Request):
    prompt = prompts.eli10_prompt(req.topic, req.subject)
    return stream_response(prompt)


@app.post("/api/doubt")
def solve_doubt(req: DoubtRequest):
    prompt = prompts.doubt_prompt(req.question, req.subject, req.context)
    return stream_response(prompt)


# ---------- Auth endpoints ----------

@app.post("/api/signup")
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user = User(
        name=req.name,
        email=req.email,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user.id)
    return {"token": token, "name": user.name, "email": user.email}


@app.post("/api/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_token(user.id)
    return {"token": token, "name": user.name, "email": user.email}


@app.get("/api/me")
def get_me(user: User = Depends(get_current_user)):
    return {"name": user.name, "email": user.email}


# ---------- History endpoints (per logged-in user) ----------

@app.post("/api/history")
def save_history(
    req: SaveHistoryRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = HistoryItem(
        user_id=user.id,
        section=req.section,
        subject=req.subject,
        topic=req.topic,
        text=req.text,
    )
    db.add(item)
    db.commit()

    # Keep only the latest 5 per section for this user
    items = (
        db.query(HistoryItem)
        .filter(HistoryItem.user_id == user.id, HistoryItem.section == req.section)
        .order_by(HistoryItem.created_at.desc())
        .all()
    )
    for old_item in items[5:]:
        db.delete(old_item)
    db.commit()

    return {"status": "saved"}


@app.get("/api/history/{section}")
def get_history(
    section: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = (
        db.query(HistoryItem)
        .filter(HistoryItem.user_id == user.id, HistoryItem.section == section)
        .order_by(HistoryItem.created_at.desc())
        .limit(5)
        .all()
    )
    return [
        {"label": i.topic or i.subject or "Untitled", "text": i.text}
        for i in items
    ]


# ---------- Progress endpoints (per logged-in user) ----------

@app.post("/api/progress")
def track_progress(
    req: TrackProgressRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(ProgressItem)
        .filter(ProgressItem.user_id == user.id, ProgressItem.activity_type == req.activity_type)
        .first()
    )
    if item:
        item.count += 1
    else:
        item = ProgressItem(user_id=user.id, activity_type=req.activity_type, count=1)
        db.add(item)

    today = datetime.utcnow().strftime("%Y-%m-%d")
    existing_day = (
        db.query(ActiveDay)
        .filter(ActiveDay.user_id == user.id, ActiveDay.date == today)
        .first()
    )
    if not existing_day:
        db.add(ActiveDay(user_id=user.id, date=today))

    db.commit()
    return {"status": "tracked"}


@app.get("/api/progress")
def get_progress(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.query(ProgressItem).filter(ProgressItem.user_id == user.id).all()
    counts = {i.activity_type: i.count for i in items}
    active_days = db.query(ActiveDay).filter(ActiveDay.user_id == user.id).count()
    return {"counts": counts, "active_days": active_days}


# Serve the frontend (static HTML/CSS/JS) from the same process.
# Mounted last so it never shadows the /api/* routes above.
app.mount("/", StaticFiles(directory="static", html=True), name="static")