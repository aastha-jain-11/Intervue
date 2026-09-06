from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    HTTPException,
    Request
)
from fastapi.responses import JSONResponse
import os

from app.db import (
    init_db,
    SessionLocal,
    ScreeningResult,
    Interview
)

from app.schema import (
    InterviewerRecommendationRequest,
    InterviewerRecommendationResponse,
    ScheduleInterviewRequest,
    ScheduleInterviewResponse
)

from app.services.interviewer_matcher import (
    recommend_interviewers
)

from app.services.scheduler import (
    schedule_interview
)

from app.services.pdf_extractor import (
    extract_text_from_pdf
)

from app.services.preprocessing import (
    clean_text
)

from app.services.skill_matcher import (
    match_skills
)

from app.services.tfidf_matcher import (
    calculate_tfidf_score
)

from app.services.scoring import (
    calculate_skill_score,
    calculate_final_score,
    get_decision
)

from app.services.explanation import (
    generate_explanation
)


app = FastAPI(
    title="Resume Screening Service",
    version="1.0.0"
)


@app.middleware("http")
async def require_internal_token(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)

    expected_token = os.getenv("INTERNAL_SERVICE_TOKEN")
    if not expected_token or request.headers.get("authorization") != f"Bearer {expected_token}":
        return JSONResponse(status_code=401, content={"detail": "Internal authentication required"})

    return await call_next(request)


# =========================================================
# STARTUP
# =========================================================

@app.on_event("startup")
def startup():

    init_db()


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


# =========================================================
# INTERVIEWER RECOMMENDATION
# =========================================================

@app.post(
    "/recommend-interviewers",
    response_model=InterviewerRecommendationResponse
)
def recommend_interviewer(
    request: InterviewerRecommendationRequest
):

    recommendations = recommend_interviewers(
        candidate_skills=request.skills,
        top_k=3,
        interviewers=request.interviewers
    )

    return {
        "candidate_id": request.candidate_id,
        "recommended_interviewers": recommendations
    }


@app.post(
    "/schedule-interview",
    response_model=ScheduleInterviewResponse
)
def schedule(
    request: ScheduleInterviewRequest
):

    # Validate date range
    if request.preferred_date_start > request.preferred_date_end:

        raise HTTPException(
            status_code=400,
            detail="Invalid preferred date range"
        )

    # Validate time range
    if request.preferred_time_start >= request.preferred_time_end:

        raise HTTPException(
            status_code=400,
            detail="Invalid preferred time range"
        )

    # Find interviewer and time slot
    result = schedule_interview(
        candidate_id=request.candidate_id,
        candidate_skills=request.skills,
        start_date=request.preferred_date_start,
        end_date=request.preferred_date_end,
        start_time=request.preferred_time_start,
        end_time=request.preferred_time_end,
        duration_minutes=request.duration_minutes,
        mode=request.mode,
        candidate_timezone=request.timezone,
        buffer_minutes=request.buffer_minutes,
        top_k=3
    )

    # No suitable slot
    if result is None:

        raise HTTPException(
            status_code=409,
            detail="No common interview slot found with the top matching interviewers."
        )

    interviewer = result["interviewer"]

    # Save interview
    db = SessionLocal()

    try:

        interview = Interview(

            candidate_id=request.candidate_id,

            candidate_name=request.candidate_name,

            interviewer_id=interviewer["interviewer_id"],

            interviewer_name=interviewer["name"],

            round_type=request.round_type,

            duration_minutes=request.duration_minutes,

            mode=request.mode,

            timezone=request.timezone,

            scheduled_start=result["scheduled_start"].replace(
                tzinfo=None
            ),

            scheduled_end=result["scheduled_end"].replace(
                tzinfo=None
            ),

            match_score=result["match_score"]
        )

        db.add(interview)

        db.commit()

        db.refresh(interview)

    finally:

        db.close()

    return {

        "interview_id": interview.interview_id,

        "candidate_id": request.candidate_id,

        "candidate_name": request.candidate_name,

        "interviewer_id": interviewer["interviewer_id"],

        "interviewer_name": interviewer["name"],

        "round_type": request.round_type,

        "duration_minutes": request.duration_minutes,

        "mode": request.mode,

        "timezone": request.timezone,

        "scheduled_start": result[
            "scheduled_start"
        ].isoformat(),

        "scheduled_end": result[
            "scheduled_end"
        ].isoformat(),

        "match_score": result["match_score"]
    }



# =========================================================
# RESUME SCREENING
# =========================================================

@app.post("/screen")
async def screen_resume(
    candidate_id: str = Form(...),
    job_id: str = Form(...),
    job_description: str = Form(...),
    required_skills: str = Form(...),
    resume: UploadFile = File(...)
):

    # -----------------------------------------------------
    # Validate PDF
    # -----------------------------------------------------

    if resume.content_type != "application/pdf":

        raise HTTPException(
            status_code=400,
            detail="Resume must be a PDF"
        )


    # -----------------------------------------------------
    # Read PDF
    # -----------------------------------------------------

    resume_text = extract_text_from_pdf(
        resume.file
    )

    if not resume_text.strip():

        raise HTTPException(
            status_code=400,
            detail="Could not extract text from resume"
        )


    # -----------------------------------------------------
    # Clean text
    # -----------------------------------------------------

    resume_text = clean_text(
        resume_text
    )

    job_description = clean_text(
        job_description
    )


    # -----------------------------------------------------
    # Convert comma-separated skills
    # -----------------------------------------------------

    skills = [
        skill.strip()
        for skill in required_skills.split(",")
        if skill.strip()
    ]


    # -----------------------------------------------------
    # Skill matching
    # -----------------------------------------------------

    matching_result = match_skills(
        skills,
        resume_text
    )

    matched_skills = matching_result["matched_skills"]

    missing_skills = matching_result["missing_skills"]

    skill_score = matching_result["skill_score"]


    # -----------------------------------------------------
    # TF-IDF
    # -----------------------------------------------------

    tfidf_score = calculate_tfidf_score(
        resume_text,
        job_description
    )


    # -----------------------------------------------------
    # Final score
    # -----------------------------------------------------

    final_score = calculate_final_score(
        skill_score,
        tfidf_score
    )


    # -----------------------------------------------------
    # Decision
    # -----------------------------------------------------

    decision = get_decision(
        final_score
    )


    # -----------------------------------------------------
    # Explanation
    # -----------------------------------------------------

    explanation = generate_explanation(
        final_score,
        matched_skills,
        missing_skills,
        decision
    )


    # -----------------------------------------------------
    # Save result
    # -----------------------------------------------------

    db = SessionLocal()

    try:

        result = ScreeningResult(
            candidate_id=candidate_id,
            job_id=job_id,
            resume_url=resume.filename,
            skill_score=skill_score,
            tfidf_score=tfidf_score,
            final_score=final_score,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            decision=decision,
            explanation=explanation
        )

        db.add(result)

        db.commit()

        db.refresh(result)

    finally:

        db.close()


    # -----------------------------------------------------
    # Response
    # -----------------------------------------------------

    return {

        "candidate_id": candidate_id,

        "job_id": job_id,

        "final_score": final_score,

        "skill_score": skill_score,

        "tfidf_score": tfidf_score,

        "matched_skills": matched_skills,

        "missing_skills": missing_skills,

        "decision": decision,

        "explanation": explanation
    }
