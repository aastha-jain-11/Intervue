from fastapi import FastAPI, HTTPException

from app.schemas import InterviewScheduledNotification
from app.services.notification_service import (
    notify_interview_scheduled
)


app = FastAPI(
    title="Intervue Notification Service",
    version="1.0.0"
)


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

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )