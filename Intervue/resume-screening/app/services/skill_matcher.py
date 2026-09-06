
import json
import os
import re
from rapidfuzz import fuzz


# ---------------------------------------------------------
# Load skill taxonomy
# ---------------------------------------------------------

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(os.path.abspath(__file__))
    )
)

TAXONOMY_PATH = os.path.join(
    BASE_DIR,
    "data",
    "skill_synonyms.json"
)


with open(
    TAXONOMY_PATH,
    "r",
    encoding="utf-8"
) as file:
    SKILL_SYNONYMS = json.load(file)


# ---------------------------------------------------------
# Text normalization
# ---------------------------------------------------------

def normalize_text(text: str) -> str:
    """
    Normalize text while preserving useful characters
    such as +, # and dots used in technical skills.
    """

    text = text.lower()

    # Normalize common variations
    text = text.replace("–", "-")
    text = text.replace("—", "-")

    # React.js -> react js
    text = re.sub(r"\.(?=\s|$)", " ", text)

    # Replace punctuation except technical characters
    text = re.sub(
        r"[^a-z0-9+#.\- ]",
        " ",
        text
    )

    # Collapse whitespace
    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# ---------------------------------------------------------
# Canonical skill normalization
# ---------------------------------------------------------

def normalize_skill(skill: str) -> str:
    """
    Convert a skill or synonym to its canonical skill name.

    Example:
        ML       -> machine learning
        ML       -> machine learning
        ReactJS  -> react
        K8s      -> kubernetes
    """

    skill = normalize_text(skill)

    for canonical, synonyms in SKILL_SYNONYMS.items():

        canonical_normalized = normalize_text(
            canonical
        )

        if skill == canonical_normalized:
            return canonical

        for synonym in synonyms:

            if skill == normalize_text(synonym):
                return canonical

    return skill


# ---------------------------------------------------------
# Generate all possible forms of a skill
# ---------------------------------------------------------

def get_skill_variants(skill: str) -> list[str]:
    """
    Return canonical skill + all known synonyms.
    """

    canonical = normalize_skill(skill)

    variants = set()

    variants.add(
        normalize_text(canonical)
    )

    synonyms = SKILL_SYNONYMS.get(
        canonical,
        []
    )

    for synonym in synonyms:

        variants.add(
            normalize_text(synonym)
        )

    return list(variants)


# ---------------------------------------------------------
# Exact phrase matching
# ---------------------------------------------------------

def exact_match(
    variant: str,
    resume_text: str
) -> bool:

    """
    Check whether the skill appears as a complete phrase,
    rather than as a substring of another word.

    Example:
        "java" should NOT match "javascript".
    """

    pattern = (
        r"(?<![a-z0-9+#])"
        + re.escape(variant)
        + r"(?![a-z0-9+#])"
    )

    return re.search(
        pattern,
        resume_text,
        re.IGNORECASE
    ) is not None


# ---------------------------------------------------------
# Find occurrences and context
# ---------------------------------------------------------

def find_context(
    variant: str,
    resume_text: str,
    window: int = 120
) -> list[str]:

    """
    Return snippets surrounding occurrences of a skill.
    """

    contexts = []

    pattern = re.compile(
        r"(?<![a-z0-9+#])"
        + re.escape(variant)
        + r"(?![a-z0-9+#])",
        re.IGNORECASE
    )

    for match in pattern.finditer(resume_text):

        start = max(
            0,
            match.start() - window
        )

        end = min(
            len(resume_text),
            match.end() + window
        )

        contexts.append(
            resume_text[start:end]
        )

    return contexts


# ---------------------------------------------------------
# Fuzzy matching
# ---------------------------------------------------------

def fuzzy_match(
    skill: str,
    resume_text: str,
    threshold: int = 90
) -> bool:

    """
    Fuzzy matching for minor spelling mistakes.

    Example:
        python -> pyhton
    """

    skill = normalize_text(skill)

    # Do not fuzzy match very short skills.
    # This prevents dangerous matches such as:
    # C -> CSS
    # R -> React
    # Go -> Google
    if len(skill) < 4:
        return False

    words = resume_text.split()

    # Check individual words
    for word in words:

        similarity = fuzz.ratio(
            skill,
            word
        )

        if similarity >= threshold:
            return True

    # Check adjacent word combinations for
    # multi-word skills.
    words_count = len(words)

    skill_word_count = len(
        skill.split()
    )

    if skill_word_count > 1:

        for i in range(
            words_count - skill_word_count + 1
        ):

            phrase = " ".join(
                words[
                    i:i + skill_word_count
                ]
            )

            similarity = fuzz.ratio(
                skill,
                phrase
            )

            if similarity >= threshold:
                return True

    return False


# ---------------------------------------------------------
# Evidence strength
# ---------------------------------------------------------

def calculate_evidence_strength(
    skill: str,
    resume_text: str
) -> float:

    """
    Estimate how strongly the resume demonstrates
    the skill.

    This is deterministic and based on context words.

    Strong evidence:
        developed
        built
        implemented
        engineered
        deployed
        trained
        optimized

    Weak evidence:
        interested
        familiar
        knowledge
        exposure
        coursework
    """

    contexts = []

    for variant in get_skill_variants(skill):

        contexts.extend(
            find_context(
                variant,
                resume_text
            )
        )

    if not contexts:
        return 0.0

    strong_words = {
        "developed",
        "built",
        "implemented",
        "engineered",
        "designed",
        "deployed",
        "trained",
        "optimized",
        "created",
        "worked",
        "used",
        "integrated",
        "developing",
        "implementation"
    }

    medium_words = {
        "experience",
        "experienced",
        "project",
        "projects",
        "application",
        "system",
        "research",
        "internship"
    }

    weak_words = {
        "interested",
        "familiar",
        "knowledge",
        "exposure",
        "coursework",
        "learning",
        "basic"
    }

    best_score = 0.0

    for context in contexts:

        words = set(
            context.lower().split()
        )

        strong_count = len(
            words.intersection(
                strong_words
            )
        )

        medium_count = len(
            words.intersection(
                medium_words
            )
        )

        weak_count = len(
            words.intersection(
                weak_words
            )
        )

        if strong_count > 0:

            score = 1.0

        elif medium_count > 0:

            score = 0.8

        elif weak_count > 0:

            score = 0.5

        else:

            score = 0.7

        best_score = max(
            best_score,
            score
        )

    return best_score


# ---------------------------------------------------------
# Match one skill
# ---------------------------------------------------------

def match_single_skill(
    required_skill: str,
    resume_text: str
) -> dict:

    """
    Match one job skill against the resume.

    Returns:
        matched
        canonical skill
        match type
        evidence score
    """

    resume_text = normalize_text(
        resume_text
    )

    canonical = normalize_skill(
        required_skill
    )

    variants = get_skill_variants(
        canonical
    )

    # -----------------------------------------------------
    # 1. Exact / synonym match
    # -----------------------------------------------------

    for variant in variants:

        if exact_match(
            variant,
            resume_text
        ):

            evidence = calculate_evidence_strength(
                canonical,
                resume_text
            )

            return {
                "skill": canonical,
                "matched": True,
                "match_type": (
                    "exact"
                    if variant == normalize_text(canonical)
                    else "synonym"
                ),
                "matched_variant": variant,
                "evidence_score": evidence
            }

    # -----------------------------------------------------
    # 2. Fuzzy match
    # -----------------------------------------------------

    for variant in variants:

        if fuzzy_match(
            variant,
            resume_text
        ):

            return {
                "skill": canonical,
                "matched": True,
                "match_type": "fuzzy",
                "matched_variant": variant,
                "evidence_score": 0.6
            }

    # -----------------------------------------------------
    # 3. No match
    # -----------------------------------------------------

    return {
        "skill": canonical,
        "matched": False,
        "match_type": None,
        "matched_variant": None,
        "evidence_score": 0.0
    }


# ---------------------------------------------------------
# Match all skills
# ---------------------------------------------------------

def match_skills(
    required_skills: list[str],
    resume_text: str
) -> dict:

    matched_skills = []
    missing_skills = []

    match_types = {}
    evidence_scores = {}

    for skill in required_skills:

        result = match_single_skill(
            skill,
            resume_text
        )

        canonical = result["skill"]

        if result["matched"]:

            matched_skills.append(
                canonical
            )

            match_types[canonical] = (
                result["match_type"]
            )

            evidence_scores[canonical] = (
                result["evidence_score"]
            )

        else:

            missing_skills.append(
                canonical
            )

    # -----------------------------------------------------
    # Skill score
    # -----------------------------------------------------

    if required_skills:

        raw_score = (
            len(matched_skills)
            /
            len(required_skills)
        ) * 100

        # Adjust matched score according to evidence.
        if matched_skills:

            total_evidence = sum(
                evidence_scores.values()
            )

            average_evidence = (
                total_evidence
                /
                len(matched_skills)
            )

        else:

            average_evidence = 0.0

        skill_score = (
            raw_score
            *
            (
                0.7
                +
                0.3 * average_evidence
            )
        )

    else:

        skill_score = 0.0

    return {
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "match_types": match_types,
        "evidence_scores": evidence_scores,
        "skill_score": round(
            skill_score,
            2
        )
    }
