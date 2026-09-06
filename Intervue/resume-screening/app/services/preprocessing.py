import re


def clean_text(text: str) -> str:

    text = text.lower()

    # Replace common separators
    text = text.replace("/", " ")
    text = text.replace("|", " ")
    text = text.replace("•", " ")

    # Keep characters useful for technical skills
    text = re.sub(
        r"[^a-zA-Z0-9+#.\- ]",
        " ",
        text
    )

    # Normalize whitespace
    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()