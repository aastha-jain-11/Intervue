from app.schemas import InterviewScheduledNotification
from app.services.email_service import send_email


def notify_candidate(
    data: InterviewScheduledNotification
):

    candidate = data.candidate
    interviewer = data.interviewer

    subject = "Your Interview Has Been Scheduled"

    body = f"""
Hello {candidate.name},

Your interview has been successfully scheduled.

Interview Details
-----------------

Round:
{data.round_type}

Interviewer:
{interviewer.name}

Date & Time:
{data.selected_slot.start}

End Time:
{data.selected_slot.end}

Duration:
{data.duration_mins} minutes

Timezone:
{data.timezone}

Mode:
{data.mode}
"""

    if data.meet_link:
        body += f"""

Meeting Link:
{data.meet_link}
"""

    body += """

Please make sure you are available at the scheduled time.

Regards,
Intervue Team
"""

    return send_email(
        recipient_email=candidate.email,
        recipient_name=candidate.name,
        subject=subject,
        body=body
    )


def notify_interviewer(
    data: InterviewScheduledNotification
):

    candidate = data.candidate
    interviewer = data.interviewer

    subject = "Interview Assigned to You"

    body = f"""
Hello {interviewer.name},

A new interview has been assigned to you.

Interview Details
-----------------

Candidate:
{candidate.name}

Round:
{data.round_type}

Date & Time:
{data.selected_slot.start}

End Time:
{data.selected_slot.end}

Duration:
{data.duration_mins} minutes

Timezone:
{data.timezone}

Mode:
{data.mode}
"""

    if data.meet_link:
        body += f"""

Meeting Link:
{data.meet_link}
"""

    body += """

Please make sure you are available at the scheduled time.

Regards,
Intervue Team
"""

    return send_email(
        recipient_email=interviewer.email,
        recipient_name=interviewer.name,
        subject=subject,
        body=body
    )


def notify_interview_scheduled(
    data: InterviewScheduledNotification
):

    candidate_result = notify_candidate(data)

    interviewer_result = notify_interviewer(data)

    return {
        "candidate": candidate_result,
        "interviewer": interviewer_result
    }