"""
services/state_classifier.py
-----------------------------
Pure ML/logic functions for MindProtocol.

Contains:
  1. classify_state()  — Translates morning slider scores into a
                         state_flag + event_tag. No DB calls.
                         Called by the /morning-checkin endpoint.

  2. detect_trend()    — Takes 7 days of morning scores and returns
                         IMPROVING / DECLINING / FLAT.
                         Used by Danish's adaptive engine and the
                         /weekly-summary endpoint.

All functions are pure (no side effects, no I/O) so they are easy
to unit test independently of the database.

Owner: Nishant
Danish: detect_trend() is yours to call from the adaptive engine.
"""

from typing import Optional


# ──────────────────────────────────────────────
# 1. STATE CLASSIFICATION
# ──────────────────────────────────────────────

def classify_state(
    sleep: int,
    mood: int,
    stress: int,
    exercise: bool,
    open_text: Optional[str],
) -> dict:
    """
    Translate morning slider scores into a state flag and event tag.

    Parameters
    ----------
    sleep     : int  — Sleep quality score 0–10
    mood      : int  — Mood score 0–10
    stress    : int  — Stress level 0–10
    exercise  : bool — Whether the user exercised this morning
    open_text : str  — Optional free-text from the morning check-in

    Returns
    -------
    dict with keys:
      "state_flag"  : "HIGH_REACTIVITY" | "LOW_BASELINE" |
                      "PHYSICAL_DEPLETION" | "STABLE"
      "event_tag"   : "EVENT_TRIGGER" | "GENERAL_STATE"

    Rules (evaluated in priority order — first match wins)
    -------------------------------------------------------
    HIGH_REACTIVITY:
        stress >= 7 AND mood <= 4
        OR stress >= 8 (regardless of mood)

    PHYSICAL_DEPLETION:
        sleep <= 3
        OR (sleep <= 5 AND NOT exercise AND mood <= 5)

    LOW_BASELINE:
        mood <= 3
        OR (mood <= 4 AND sleep <= 5 AND stress >= 6)

    STABLE:
        Everything else (ideal: mood >= 6, stress <= 6, sleep >= 5)
    """

    # ── State Flag ───────────────────────────────────────────
    state_flag: str

    if (stress >= 7 and mood <= 4) or stress >= 8:
        # High stress is dominating — reactivity is elevated.
        # The person is likely in fight-or-flight mode.
        state_flag = "HIGH_REACTIVITY"

    elif sleep <= 3 or (sleep <= 5 and not exercise and mood <= 5):
        # Physical/recovery deficit. Questions should focus on rest
        # and gentle self-care rather than cognitive reframing.
        state_flag = "PHYSICAL_DEPLETION"

    elif mood <= 3 or (mood <= 4 and sleep <= 5 and stress >= 6):
        # Low mood is the primary signal. Requires compassionate,
        # non-challenging evening questions.
        state_flag = "LOW_BASELINE"

    else:
        # User is in a functional baseline. Reflective questions
        # can be more nuanced and growth-oriented.
        state_flag = "STABLE"

    # ── Event Tag ────────────────────────────────────────────
    # If the user typed a meaningful note, the evening questions
    # should be anchored to that specific event/context.
    event_tag: str

    if open_text is not None and len(open_text.strip()) > 10:
        event_tag = "EVENT_TRIGGER"
    else:
        event_tag = "GENERAL_STATE"

    return {"state_flag": state_flag, "event_tag": event_tag}


# ──────────────────────────────────────────────
# 2. WEEKLY TREND DETECTION
# Danish: call this function from your adaptive engine.
# ──────────────────────────────────────────────

def detect_trend(scores_7_days: list[dict]) -> str:
    """
    Detect whether a user's mental health is IMPROVING, DECLINING, or FLAT
    over the past 7 days.

    Parameters
    ----------
    scores_7_days : list of dicts, each containing:
        {
          "mood_score":   int,   # 0–10
          "sleep_score":  int,   # 0–10
          "stress_score": int    # 0–10 (higher = worse)
        }
        Expected order: oldest first, most recent last.
        If fewer than 6 days are provided, return "FLAT" (not enough data).

    Returns
    -------
    "IMPROVING" | "DECLINING" | "FLAT"

    Algorithm
    ---------
    1. Compute a composite_score per day:
           composite = (mood + sleep + (10 - stress)) / 3
       Stress is inverted so that higher composite = better wellbeing.
    2. Compare average of FIRST 3 days vs average of LAST 3 days.
    3. If (last_avg - first_avg) > +1.0  → IMPROVING
       If (last_avg - first_avg) < -1.0  → DECLINING
       Otherwise                         → FLAT

    Danish: you can pass the result of this function directly to the
    chart color logic — green=IMPROVING, yellow=FLAT, red=DECLINING.
    """

    # Need at least 6 data points for a meaningful comparison
    if len(scores_7_days) < 6:
        return "FLAT"

    def composite(day: dict) -> float:
        """Single-day wellbeing composite score (0–10 range)."""
        mood  = day.get("mood_score", 5)
        sleep = day.get("sleep_score", 5)
        stress = day.get("stress_score", 5)
        return (mood + sleep + (10 - stress)) / 3

    composites = [composite(day) for day in scores_7_days]

    # Use the first 3 and last 3 days for comparison
    first_avg = sum(composites[:3]) / 3
    last_avg  = sum(composites[-3:]) / 3
    diff = last_avg - first_avg

    if diff > 1.0:
        return "IMPROVING"
    elif diff < -1.0:
        return "DECLINING"
    else:
        return "FLAT"
