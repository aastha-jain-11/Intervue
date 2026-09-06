from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from app.config import (
    SENDGRID_API_KEY,
    SENDGRID_FROM_EMAIL
)


def send_email(
    recipient_email: str,
    recipient_name: str,
    subject: str,
    body: str
) -> dict:

    message = Mail(
        from_email=SENDGRID_FROM_EMAIL,
        to_emails=recipient_email,
        subject=subject,
        plain_text_content=body
    )

    client = SendGridAPIClient(SENDGRID_API_KEY)

    response = client.send(message)

    return {
        "status_code": response.status_code,
        "message": "Email accepted by SendGrid"
    }