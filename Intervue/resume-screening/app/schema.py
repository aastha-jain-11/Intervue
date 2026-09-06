from pydantic import BaseModel, Field
from typing import List
from datetime import date, time


class ScreeningResponse(BaseModel):

    candidate_id: str
    job_id: str
    final_score: float
    skill_score: float
    tfidf_score: float
    matched_skills: List[str]
    missing_skills: List[str]
    decision: str
    explanation: str


class InterviewerRecommendationRequest(BaseModel):

    candidate_id: str
    skills: list[str] = Field(
        ...,
        min_length=1,
        description="Skills extracted from the candidate resume"
    )
    interviewers: list[dict] | None = None


class InterviewerRecommendation(BaseModel):

    interviewer_id: str
    name: str
    email: str
    experience: int
    match_score: float
    matched_skills: list[str]
    missing_skills: list[str]


class InterviewerRecommendationResponse(BaseModel):

    candidate_id: str
    recommended_interviewers: list[InterviewerRecommendation]


# =========================================================
# INTERVIEW SCHEDULING
# =========================================================

class ScheduleInterviewRequest(BaseModel):

    candidate_id: str

    candidate_name: str

    skills: list[str] = Field(
        ...,
        min_length=1
    )

    round_type: str

    duration_minutes: int = Field(
        ...,
        gt=0
    )

    preferred_date_start: date

    preferred_date_end: date

    preferred_time_start: time

    preferred_time_end: time

    mode: str

    timezone: str
    buffer_minutes: int = Field(
        default=30,
        ge=0,
        le=180
    )


class ScheduleInterviewResponse(BaseModel):

    interview_id: int

    candidate_id: str

    candidate_name: str

    interviewer_id: str

    interviewer_name: str

    round_type: str

    duration_minutes: int

    mode: str

    timezone: str

    scheduled_start: str

    scheduled_end: str

    match_score: float
