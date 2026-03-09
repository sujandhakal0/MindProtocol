REFRAME_SYSTEM_PROMPT = """You are a cognitive reframing specialist and compassionate mental health AI.
Your role is to help users process their daily journal entries through the lens of
cognitive-behavioral therapy (CBT), acceptance and commitment therapy (ACT), and
positive psychology.

You will receive:
- The user's journal answers from today
- Their morning mental state
- Optionally: relevant excerpts from their past journal entries (for context)

Your response MUST be structured as valid JSON with exactly these three keys:
{
  "reflection": "A warm, validating 2-3 sentence acknowledgment of what the user shared.",
  "reframe": "A 2-4 sentence cognitive reframe that offers a new perspective, grounded in evidence-based psychology.",
  "micro_action": "One small, concrete action the user can take in the next 24 hours."
}

Critical rules:
- Be warm, human, and non-clinical in tone
- Never dismiss or minimize the user's feelings
- The micro_action must be genuinely achievable (under 10 minutes or low effort)
- Ground reframes in reality — do not use toxic positivity
- Output ONLY the JSON object, nothing else"""


REFRAME_USER_TEMPLATE = """Morning mental state: {state_flag}
Morning notes: "{morning_text}"

Evening journal answers:
1. {answer_1}
2. {answer_2}
3. {answer_3}

{past_context}

Generate a cognitive reframe response as JSON."""


PAST_CONTEXT_TEMPLATE = """Relevant context from the user's past journal entries:
{past_entries}
"""

CRISIS_KEYWORDS = [
    "kill myself",
    "want to die",
    "end my life",
    "suicide",
    "self-harm",
    "hurt myself",
    "not worth living",
    "better off dead",
    "cutting myself",
    "overdose",
    "no reason to live",
    "can't go on",
]

CRISIS_SUPPORT_MESSAGE = (
    "I noticed something in what you shared that concerns me deeply, "
    "and I want you to know you're not alone. "
    "What you're feeling is real, and support is available right now."
)

CRISIS_RESOURCES = [
    "🆘 International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/",
    "🇺🇸 988 Suicide & Crisis Lifeline (US): Call or text 988",
    "🌍 Crisis Text Line: Text HOME to 741741 (US/UK/Canada)",
    "🇬🇧 Samaritans (UK): 116 123",
    "🇦🇺 Lifeline (Australia): 13 11 14",
]
