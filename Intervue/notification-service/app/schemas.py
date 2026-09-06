from pydantic import BaseModel, EmailStr


class Person(BaseModel):
    id: str
    name: str
    email: EmailStr


class InterviewSlot(BaseModel):
    start: str
    end: str


class InterviewScheduledNotification(BaseModel):
    interview_id: int

    candidate: Person
    interviewer: Person

    round_type: str
    duration_mins: int

    selected_slot: InterviewSlot

    mode: str
    timezone: str

    meet_link: str | None = None