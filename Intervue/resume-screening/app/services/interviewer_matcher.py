from pathlib import Path
import json


DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "interviewers.json"


def normalize_skill(skill: str) -> str:
    """
    Normalize a skill so that small differences in formatting
    do not affect matching.
    """

    return (
        skill.lower()
        .strip()
        .replace("-", " ")
        .replace("_", " ")
    )


def load_interviewers():
    """
    Load interviewer information from JSON.
    """

    with open(DATA_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


def calculate_match_score(
    candidate_skills: list[str],
    interviewer_skills: list[str]
):
    """
    Calculate how well an interviewer matches a candidate.

    Score =
        matched candidate skills / total candidate skills * 100
    """

    candidate_set = {
        normalize_skill(skill)
        for skill in candidate_skills
        if skill.strip()
    }

    interviewer_set = {
        normalize_skill(skill)
        for skill in interviewer_skills
        if skill.strip()
    }

    if not candidate_set:
        return {
            "score": 0.0,
            "matched_skills": [],
            "missing_skills": []
        }

    matched_skills = candidate_set.intersection(interviewer_set)
    missing_skills = candidate_set - interviewer_set

    score = (len(matched_skills) / len(candidate_set)) * 100

    return {
        "score": round(score, 2),
        "matched_skills": sorted(matched_skills),
        "missing_skills": sorted(missing_skills)
    }


def recommend_interviewers(
    candidate_skills: list[str],
    top_k: int = 3,
    interviewers: list[dict] | None = None
):
    """
    Return the top K interviewers based on skill match.
    """

    interviewers = interviewers if interviewers is not None else load_interviewers()

    recommendations = []

    for interviewer in interviewers:

        result = calculate_match_score(
            candidate_skills,
            interviewer["skills"]
        )

        recommendations.append({
            "interviewer_id": interviewer["interviewer_id"],
            "name": interviewer["name"],
            "email": interviewer["email"],
            "experience": interviewer["experience"],
            "match_score": result["score"],
            "matched_skills": result["matched_skills"],
            "missing_skills": result["missing_skills"]
        })

    # Highest score first.
    # If scores are equal, more experienced interviewer comes first.
    # interviewer_id is used as a deterministic final tie-breaker.
    recommendations.sort(
        key=lambda x: (
            -x["match_score"],
            -x["experience"],
            x["interviewer_id"]
        )
    )

    return recommendations[:top_k]
