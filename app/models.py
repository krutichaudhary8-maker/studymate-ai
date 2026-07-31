"""
SQLAlchemy models — the actual database tables.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    history_items = relationship("HistoryItem", back_populates="user", cascade="all, delete-orphan")
    progress_items = relationship("ProgressItem", back_populates="user", cascade="all, delete-orphan")


class HistoryItem(Base):
    __tablename__ = "history_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    section = Column(String, nullable=False)   # notes | quiz | summary | eli10
    subject = Column(String, nullable=True)
    topic = Column(String, nullable=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="history_items")


class ProgressItem(Base):
    __tablename__ = "progress_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    activity_type = Column(String, nullable=False)  # notes | quiz | flashcards | ...
    count = Column(Integer, default=0)

    user = relationship("User", back_populates="progress_items")


class ActiveDay(Base):
    __tablename__ = "active_days"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(String, nullable=False)  # "YYYY-MM-DD"