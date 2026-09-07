import os

from dotenv import load_dotenv

load_dotenv()


SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL")


def require_email_configuration() -> None:
    if not SENDGRID_API_KEY or not SENDGRID_FROM_EMAIL:
        raise RuntimeError("SendGrid email delivery is not configured")
