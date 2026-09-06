from datetime import (
    datetime,
    date,
    time,
    timedelta,
    timezone
)

from zoneinfo import ZoneInfo

from app.services.interviewer_matcher import (
    load_interviewers,
    calculate_match_score
)


# =========================================================
# TIMEZONE HELPERS
# =========================================================

def get_weekday_name(day: date) -> str:

    return day.strftime("%A").lower()


def parse_time(value: str) -> time:

    return datetime.strptime(
        value,
        "%H:%M"
    ).time()


def make_aware(
    current_date: date,
    current_time: time,
    timezone_name: str
):

    tz = ZoneInfo(timezone_name)

    return datetime.combine(
        current_date,
        current_time
    ).replace(tzinfo=tz)


def convert_to_utc(dt: datetime):

    return dt.astimezone(
        timezone.utc
    )


# =========================================================
# CANDIDATE PREFERRED SLOTS
# =========================================================

def get_candidate_slots(
    start_date: date,
    end_date: date,
    start_time: time,
    end_time: time,
    timezone_name: str,
    duration_minutes: int,
    buffer_minutes: int = 30
):

    slots = []

    duration = timedelta(
        minutes=duration_minutes
    )

    buffer = timedelta(
        minutes=buffer_minutes
    )

    current_date = start_date

    while current_date <= end_date:

        # -------------------------------------------------
        # PRIMARY PREFERRED WINDOW
        # -------------------------------------------------

        preferred_start = make_aware(
            current_date,
            start_time,
            timezone_name
        )

        preferred_end = make_aware(
            current_date,
            end_time,
            timezone_name
        )

        current_slot = preferred_start

        while current_slot + duration <= preferred_end:

            slots.append({
                "start": convert_to_utc(current_slot),
                "end": convert_to_utc(
                    current_slot + duration
                ),
                "priority": 100,
                "reason": "preferred"
            })

            current_slot += timedelta(
                minutes=30
            )


        # -------------------------------------------------
        # BUFFER BEFORE PREFERRED WINDOW
        # -------------------------------------------------

        buffered_start = preferred_start - buffer

        current_slot = buffered_start

        while current_slot + duration <= preferred_start:

            slots.append({
                "start": convert_to_utc(current_slot),
                "end": convert_to_utc(
                    current_slot + duration
                ),
                "priority": 70,
                "reason": "buffer_before"
            })

            current_slot += timedelta(
                minutes=30
            )


        # -------------------------------------------------
        # BUFFER AFTER PREFERRED WINDOW
        # -------------------------------------------------

        buffered_end = preferred_end + buffer

        current_slot = preferred_end

        while current_slot + duration <= buffered_end:

            slots.append({
                "start": convert_to_utc(current_slot),
                "end": convert_to_utc(
                    current_slot + duration
                ),
                "priority": 70,
                "reason": "buffer_after"
            })

            current_slot += timedelta(
                minutes=30
            )


        current_date += timedelta(
            days=1
        )

    return slots


# =========================================================
# INTERVIEWER AVAILABILITY
# =========================================================

def get_interviewer_slots(
    interviewer,
    start_date: date,
    end_date: date,
    duration_minutes: int
):

    slots = []

    interviewer_timezone = interviewer[
        "timezone"
    ]

    duration = timedelta(
        minutes=duration_minutes
    )

    current_date = start_date

    while current_date <= end_date:

        weekday = get_weekday_name(
            current_date
        )

        availability = interviewer.get(
            "availability",
            {}
        )

        daily_slots = availability.get(
            weekday,
            []
        )

        for start_str, end_str in daily_slots:

            working_start = make_aware(
                current_date,
                parse_time(start_str),
                interviewer_timezone
            )

            working_end = make_aware(
                current_date,
                parse_time(end_str),
                interviewer_timezone
            )

            current_slot = working_start

            while current_slot + duration <= working_end:

                slots.append({
                    "start": convert_to_utc(
                        current_slot
                    ),
                    "end": convert_to_utc(
                        current_slot + duration
                    ),
                    "working_hours": True
                })

                current_slot += timedelta(
                    minutes=30
                )

        current_date += timedelta(
            days=1
        )

    return slots


# =========================================================
# FIND OVERLAPPING SLOTS
# =========================================================

def find_common_slots(
    candidate_slots,
    interviewer_slots,
    duration_minutes
):

    required_duration = timedelta(
        minutes=duration_minutes
    )

    common_slots = []

    for candidate_slot in candidate_slots:

        for interviewer_slot in interviewer_slots:

            start = max(
                candidate_slot["start"],
                interviewer_slot["start"]
            )

            end = min(
                candidate_slot["end"],
                interviewer_slot["end"]
            )

            if end - start >= required_duration:

                common_slots.append({

                    "start": start,

                    "end": start + required_duration,

                    "priority": candidate_slot[
                        "priority"
                    ],

                    "reason": candidate_slot[
                        "reason"
                    ],

                    "working_hours": interviewer_slot[
                        "working_hours"
                    ]
                })

    return common_slots


# =========================================================
# SLOT SCORING
# =========================================================

def score_slot(slot):

    score = slot["priority"]

    # Strong preference for interviewer
    # working hours
    if slot["working_hours"]:

        score += 20

    return score


# =========================================================
# SCHEDULER
# =========================================================

def schedule_interview(

    candidate_id: str,

    candidate_skills: list[str],

    start_date: date,

    end_date: date,

    start_time: time,

    end_time: time,

    duration_minutes: int,

    mode: str,

    candidate_timezone: str,

    buffer_minutes: int = 30,

    top_k: int = 3
):

    interviewers = load_interviewers()

    recommendations = []


    # =====================================================
    # STEP 1 — SKILL MATCH
    # =====================================================

    for interviewer in interviewers:

        match_result = calculate_match_score(
            candidate_skills,
            interviewer["skills"]
        )

        recommendations.append({

            "interviewer": interviewer,

            "match_score": match_result[
                "score"
            ],

            "matched_skills": match_result[
                "matched_skills"
            ]

        })


    # =====================================================
    # STEP 2 — RANK INTERVIEWERS
    # =====================================================

    recommendations.sort(

        key=lambda x: (

            -x["match_score"],

            -x["interviewer"]["experience"]

        )

    )


    # =====================================================
    # STEP 3 — TOP 3
    # =====================================================

    recommendations = recommendations[
        :top_k
    ]


    # =====================================================
    # STEP 4 — CANDIDATE SLOTS
    # =====================================================

    candidate_slots = get_candidate_slots(

        start_date,

        end_date,

        start_time,

        end_time,

        candidate_timezone,

        duration_minutes,

        buffer_minutes

    )


    # =====================================================
    # STEP 5 — CHECK EACH INTERVIEWER
    # =====================================================

    all_options = []


    for recommendation in recommendations:

        interviewer = recommendation[
            "interviewer"
        ]


        # -------------------------------------------------
        # MODE CHECK
        # -------------------------------------------------

        interviewer_modes = [

            m.lower()

            for m in interviewer.get(
                "mode",
                []
            )

        ]

        if mode.lower() not in interviewer_modes:

            continue


        # -------------------------------------------------
        # INTERVIEWER AVAILABILITY
        # -------------------------------------------------

        interviewer_slots = get_interviewer_slots(

            interviewer,

            start_date,

            end_date,

            duration_minutes

        )


        # -------------------------------------------------
        # COMMON SLOTS
        # -------------------------------------------------

        common_slots = find_common_slots(

            candidate_slots,

            interviewer_slots,

            duration_minutes

        )


        # -------------------------------------------------
        # ADD OPTIONS
        # -------------------------------------------------

        for slot in common_slots:

            slot_score = score_slot(
                slot
            )


            # Skill score also matters
            final_slot_score = (

                slot_score * 0.7

                + recommendation[
                    "match_score"
                ] * 0.3

            )


            all_options.append({

                "interviewer": interviewer,

                "match_score": recommendation[
                    "match_score"
                ],

                "matched_skills": recommendation[
                    "matched_skills"
                ],

                "scheduled_start": slot[
                    "start"
                ],

                "scheduled_end": slot[
                    "end"
                ],

                "slot_score": final_slot_score,

                "reason": slot[
                    "reason"
                ]

            })


    # =====================================================
    # STEP 6 — SORT BEST SLOT
    # =====================================================

    all_options.sort(

        key=lambda x: (

            -x["slot_score"],

            x["scheduled_start"]

        )

    )


    # =====================================================
    # STEP 7 — RETURN BEST OPTION
    # =====================================================

    if not all_options:

        return None


    return all_options[0]