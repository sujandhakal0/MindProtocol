# backend/ai/state_classifier.py
# Pure Python logic — no LLM needed for slider classification

def classify_state(sleep: int, mood: int, stress: int, exercise: str, 
                   exercise_history: list = []) -> str:
    """
    Classify user's morning state from slider scores.
    Returns one of 4 state flags.
    
    Priority order matters — check HIGH_REACTIVITY first.
    """
    
    # HIGH REACTIVITY — amygdala running hot
    if sleep < 5 and stress > 6:
        return "HIGH_REACTIVITY"
    
    # LOW BASELINE — emotional resources depleted
    if mood < 4:
        return "LOW_BASELINE"
    
    # PHYSICAL DEPLETION — 3+ consecutive days no exercise
    no_exercise_days = 0
    for day in exercise_history[-3:]:
        if day == "No":
            no_exercise_days += 1
    
    if no_exercise_days >= 3 or (exercise == "No" and len(exercise_history) == 0):
        return "PHYSICAL_DEPLETION"
    
    # STABLE — no flags triggered
    return "STABLE"


def get_micro_action(state_flag: str, lowest_pillar: str) -> str:
    """
    Return one specific micro-action based on state.
    Rule: completable in under 10 minutes, no equipment needed.
    """
    
    actions = {
        "HIGH_REACTIVITY": "Try 4-7-8 breathing right now: inhale for 4 counts, hold for 7, exhale for 8. Do this 3 times before you start your day.",
        "LOW_BASELINE": "Send one short message to someone you trust — it can be as simple as 'hey, thinking of you.' Connection is medicine.",
        "PHYSICAL_DEPLETION": "Take a 10-minute walk outside before lunch. No phone, no music. Just movement and air.",
        "STABLE": "Drink a full glass of water and get 5 minutes of sunlight in the first hour of your day."
    }
    
    return actions.get(state_flag, actions["STABLE"])