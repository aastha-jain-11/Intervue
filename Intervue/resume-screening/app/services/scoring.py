def calculate_skill_score(
    required_skills: list[str],
    matched_skills: list[str]
) -> float:

    if not required_skills:
        return 0.0

    score = (
        len(matched_skills)
        / len(required_skills)
    ) * 100

    return round(score, 2)


def calculate_final_score(
    skill_score: float,
    tfidf_score: float
) -> float:

    final_score = (
        0.75 * skill_score
        +
        0.25 * tfidf_score
    )

    return round(final_score, 2)


def get_decision(
    final_score: float
) -> str:

    if final_score >= 70:
        return "pass"

    return "reject"