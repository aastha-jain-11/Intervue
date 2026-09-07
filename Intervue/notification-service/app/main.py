from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
import os
import logging

from app.schemas import InterviewScheduledNotification
from app.services.notification_service import (
    notify_interview_scheduled
)


app = FastAPI(
    title="Intervue Notification Service",
    version="1.0.0"
)
logger = logging.getLogger(__name__)


@app.middleware("http")
async def require_internal_token(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)

    expected_token = os.getenv("INTERNAL_SERVICE_TOKEN")
    if not expected_token or request.headers.get("authorization") != f"Bearer {expected_token}":
        return JSONResponse(status_code=401, content={"detail": "Internal authentication required"})

    return await call_next(request)


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "notification-service"
    }


@app.post("/notifications/interview-scheduled")
def interview_scheduled(
    request: InterviewScheduledNotification
):

    try:

        result = notify_interview_scheduled(request)

        return {
            "status": "success",
            "interview_id": request.interview_id,
            "notifications": result
        }

    except Exception:
        logger.exception("notification delivery failed for interview_id=%s", request.interview_id)
        raise HTTPException(status_code=500, detail="Notification delivery failed")
