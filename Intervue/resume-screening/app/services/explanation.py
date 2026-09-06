def generate_explanation(
    final_score: float,
    matched_skills: list[str],
    missing_skills: list[str],
    decision: str
) -> str:

    total_skills = (
        len(matched_skills)
        +
        len(missing_skills)
    )

    if final_score >= 85:

        strength = "Strong fit"

    elif final_score >= 70:

        strength = "Good fit"

    elif final_score >= 50:

        strength = "Partial fit"

    else:

        strength = "Weak fit"

    explanation = (
        f"{strength}. "
        f"The candidate matches "
        f"{len(matched_skills)} of "
        f"{total_skills} required skills."
    )

    if missing_skills:

        explanation += (
            " Missing skills: "
            + ", ".join(missing_skills)
            + "."
        )

    return explanation