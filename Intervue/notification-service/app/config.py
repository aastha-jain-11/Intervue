import os

from dotenv import load_dotenv

load_dotenv()


SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL")


if not SENDGRID_API_KEY:
    raise RuntimeError(
        "SENDGRID_API_KEY is not configured"
    )


if not SENDGRID_FROM_EMAIL:
    raise RuntimeError(
        "SENDGRID_FROM_EMAIL is not configured"
    )