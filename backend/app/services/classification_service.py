import logging

logger = logging.getLogger(__name__)

# State flag constants
STATE_HIGH_REACTIVITY = "HIGH_REACTIVITY"
STATE_PHYSICAL_DEPLETION = "PHYSICAL_DEPLETION"
STATE_LOW_BASELINE = "LOW_BASELINE"
STATE_ANXIOUS_BUT_FUNCTIONAL = "ANXIOUS_BUT_FUNCTIONAL"
STATE_STABLE = "STABLE"


def classify_mental_state(
    sleep_score: int,
    mood_score: int,
    stress_score: int,
    exercise: bool,
) -> str:
    """
    Rule-based mental state classifier.

    Scores are 0-10 integers:
      - sleep_score: 0=terrible, 10=excellent
      - mood_score:  0=very low, 10=excellent
      - stress_score: 0=none, 10=overwhelming
    """

    logger.debug(
        f"Classifying: sleep={sleep_score}, mood={mood_score}, "
        f"stress={stress_score}, exercise={exercise}"
    )

    # Priority 1: High stress + low mood → emotionally reactive state
    if stress_score >= 7 and mood_score <= 4:
        state = STATE_HIGH_REACTIVITY

    # Priority 2: Very poor sleep → physical depletion dominates
    elif sleep_score <= 3:
        state = STATE_PHYSICAL_DEPLETION

    # Priority 3: Persistently low mood
    elif mood_score <= 3:
        state = STATE_LOW_BASELINE

    # Priority 4: Moderate stress but mood is holding
    elif stress_score >= 6 and mood_score >= 5:
        state = STATE_ANXIOUS_BUT_FUNCTIONAL

    # Default: Relatively balanced
    else:
        state = STATE_STABLE

    # Exercise can act as a buffer — note it in logs but don't override primary state
    if exercise and state != STATE_STABLE:
        logger.info(f"User exercised; primary state still classified as {state}")

    logger.info(f"Mental state classified as: {state}")
    return state


def state_description(state_flag: str) -> str:
    """Return a human-readable description of a state flag."""
    descriptions = {
        STATE_HIGH_REACTIVITY: (
            "Your mind is under significant stress today. "
            "Your emotional reactivity may be elevated."
        ),
        STATE_PHYSICAL_DEPLETION: (
            "Your body is running low on rest. "
            "Physical recovery is the priority."
        ),
        STATE_LOW_BASELINE: (
            "Your mood is low today. "
            "Gentle self-compassion is important."
        ),
        STATE_ANXIOUS_BUT_FUNCTIONAL: (
            "You're managing despite stress — "
            "keep monitoring and pacing yourself."
        ),
        STATE_STABLE: (
            "You're in a relatively balanced state today. "
            "A good foundation for growth."
        ),
    }
    return descriptions.get(state_flag, "Your mental state has been recorded.")
