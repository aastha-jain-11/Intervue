import os
from datetime import datetime

from sqlalchemy import (
    create_engine,
    Column,
    String,
    Float,
    Integer,
    DateTime,
    JSON
)
from sqlalchemy.orm import declarative_base, sessionmaker


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./screening.db"
)

connect_args = (
    {"check_same_thread": False}
    if DATABASE_URL.startswith("sqlite")
    else {}
)

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)

Base = declarative_base()


class ScreeningResult(Base):

    __tablename__ = "screening_results"

    candidate_id = Column(String, primary_key=True)

    job_id = Column(String, nullable=False)

    resume_url = Column(String, nullable=False)

    skill_score = Column(Float, nullable=False)

    tfidf_score = Column(Float, nullable=False)

    final_score = Column(Float, nullable=False)

    matched_skills = Column(
        JSON,
        nullable=False,
        default=list
    )

    missing_skills = Column(
        JSON,
        nullable=False,
        default=list
    )

    decision = Column(
        String,
        nullable=False
    )

    explanation = Column(
        String,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


class Interview(Base):

    __tablename__ = "interviews"

    interview_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    candidate_id = Column(
        String,
        nullable=False,
        index=True
    )

    candidate_name = Column(
        String,
        nullable=False
    )

    interviewer_id = Column(
        String,
        nullable=False,
        index=True
    )

    interviewer_name = Column(
        String,
        nullable=False
    )

    round_type = Column(
        String,
        nullable=False
    )

    duration_minutes = Column(
        Integer,
        nullable=False
    )

    mode = Column(
        String,
        nullable=False
    )

    timezone = Column(
        String,
        nullable=False
    )

    scheduled_start = Column(
        DateTime,
        nullable=False
    )

    scheduled_end = Column(
        DateTime,
        nullable=False
    )

    match_score = Column(
        Float,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )