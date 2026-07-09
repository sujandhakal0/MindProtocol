import axios from 'axios';
import {
  SYSTEM_PROMPT_V5,
  CRISIS_SENTINEL,
  CRISIS_CHECK_PROMPT,
  SESSION_REFLECTION_PROMPT,
  PROGRESSIVE_QUESTIONS,
} from '../constants/systemPrompt';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PRIMARY_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';

export type ChatMessage = { role: 'ai' | 'user'; text: string };

export interface SessionInput {
  ageRange: string;
  role: string;
  sliders: {
    mood: number;
    mentalNoise: number;
    focus: number;
    energy: number;
  };
  conversation: ChatMessage[];
}

export type PromptResult =
  | { type: 'prompt'; text: string }
  | { type: 'crisis' }
  | { type: 'rate_limit' }
  | { type: 'error'; message: string };

/** Few-shot examples aligned with MindProtocol_Research_Bibliography.md routing logic. */
const FEW_SHOT_MESSAGES = [
  {
    role: 'user' as const,
    content: `Onboarding: age_range=18-22, role=student
Sliders: mood=40%, mental_noise=75%, focus=45%, energy=50%
Conversation Transcript:
AI: What's the main thing on your mind right now?
User: can't stop thinking about a comment my professor made
AI: Is there something specific bothering you today or this week?
User: he said my essay lacked originality in front of the class
AI: How would you describe your emotional state in 3 words?
User: embarrassed, replaying, stuck`,
  },
  {
    role: 'assistant' as const,
    content: `Write without stopping to edit. This is only for you.

You've used the word "embarrassed" — that's a start, but it's a big umbrella. If you sat with it for another minute, is it closer to humiliated, exposed, dismissed, or something else entirely? Write about the moment itself, and see if a more exact word for what you felt surfaces as you go.`,
  },
  {
    role: 'user' as const,
    content: `Onboarding: age_range=27-35, role=professional
Sliders: mood=25%, mental_noise=55%, focus=40%, energy=20%
Conversation Transcript:
AI: What's the main thing on your mind right now?
User: I keep messing up at work
AI: Is there something specific bothering you today or this week?
User: I should have caught the error before my manager did
AI: How would you describe your emotional state in 3 words?
User: ashamed, tired, annoyed at myself`,
  },
  {
    role: 'assistant' as const,
    content: `Write without stopping to edit. This is only for you.

If a close friend told you they'd made the exact mistake you made today, what would you actually say to them? Write that out in full — and then notice how different it sounds from what you've been saying to yourself.`,
  },
  {
    role: 'user' as const,
    content: `Onboarding: age_range=22-27, role=student
Sliders: mood=30%, mental_noise=40%, focus=25%, energy=20%
Conversation Transcript:
AI: What's the main thing on your mind right now?
User: nothing specific, just kind of numb
AI: Is there something specific bothering you today or this week?
User: not really, just flat
AI: How would you describe your emotional state in 3 words?
User: flat, tired, blank`,
  },
  {
    role: 'assistant' as const,
    content: `Write without stopping to edit. This is only for you.

No need to find the "main thing" today — sometimes there isn't one. Instead, just describe today the way you'd describe it to someone who wasn't there: what happened, in plain, boring detail, without judging any of it.`,
  },
];

async function callGroq(
  model: string,
  systemPrompt: string,
  userMessage: string,
  extraMessages: { role: 'user' | 'assistant'; content: string }[] = [],
  maxTokens = 300
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ API key not configured');

  const response = await axios.post(
    GROQ_URL,
    {
      model,
      max_tokens: maxTokens,
      temperature: 0.72,
      messages: [
        { role: 'system', content: systemPrompt },
        ...extraMessages,
        { role: 'user', content: userMessage },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  return response.data.choices[0].message.content.trim();
}

export async function checkCrisisInText(text: string): Promise<PromptResult> {
  try {
    const output = await callGroq(FALLBACK_MODEL, CRISIS_CHECK_PROMPT, text, [], 10);
    if (output.includes(CRISIS_SENTINEL)) return { type: 'crisis' };
    return { type: 'prompt', text: 'SAFE' };
  } catch (error: any) {
    return { type: 'error', message: error.message ?? 'Unknown error' };
  }
}

export async function generateJournalingPrompt(input: SessionInput): Promise<PromptResult> {
  const transcriptStr = input.conversation
    .map((msg) => `${msg.role === 'ai' ? 'AI' : 'User'}: ${msg.text}`)
    .join('\n');

  const userMessage = `Onboarding: age_range=${input.ageRange}, role=${input.role}
Sliders: mood=${input.sliders.mood}%, mental_noise=${input.sliders.mentalNoise}%, focus=${input.sliders.focus}%, energy=${input.sliders.energy}%
Conversation Transcript:
${transcriptStr}`;

  try {
    const output = await callGroq(
      PRIMARY_MODEL,
      SYSTEM_PROMPT_V5,
      userMessage,
      FEW_SHOT_MESSAGES,
      350
    );

    if (output.includes(CRISIS_SENTINEL)) {
      return { type: 'crisis' };
    }

    return { type: 'prompt', text: output };
  } catch (error: any) {
    if (error.response?.status === 429) {
      try {
        const fallbackOutput = await callGroq(
          FALLBACK_MODEL,
          SYSTEM_PROMPT_V5,
          userMessage,
          FEW_SHOT_MESSAGES,
          350
        );
        if (fallbackOutput.includes(CRISIS_SENTINEL)) {
          return { type: 'crisis' };
        }
        return { type: 'prompt', text: fallbackOutput };
      } catch {
        return { type: 'rate_limit' };
      }
    }

    return { type: 'error', message: error.message ?? 'Unknown error' };
  }
}

const FOLLOW_UP_SYSTEM_PROMPT = `You are MindProtocol's journaling guide. You generate ONE follow-up question for a user who is in the middle of a progressive deepening journaling session.

The session has 4 phases, each with a fixed question. After the user writes freely following each question, you generate the NEXT question that goes deeper.

## RULES
- Output ONLY the question. No headers, no explanation.
- Maximum 25 words.
- Never ask "why" — it triggers defensiveness.
- Never give advice or suggest silver linings.
- Use the user's own words from their previous writing where possible.
- Push for precision: if they said "bad," push for the exact flavor.
- Keep the tone warm, plain-spoken, present tense.
- The question must require genuine reflection (not yes/no).

## PHASES (in order)
1. surface → naming: Push for precise emotional vocabulary
2. naming → examining: Move from the mind to the body — where do they feel it?
3. examining → deepening: What does this feeling mean? What is it trying to tell them?
4. deepening → final: What is one small thing within their control right now?

## SAFETY
Only trigger crisis protocol if the user's writing contains EXPLICIT suicidal ideation, self-harm intent, or permanent hopelessness ("nothing will ever change," "no point going on"). Normal emotions like sadness, loneliness, anxiety, tiredness, or frustration are NOT crisis-level. When in doubt, do NOT trigger — output a normal follow-up question instead. Remember: "lonely," "sad," "stressed," "tired" are normal human experiences, not crises.`;

export async function generateFollowUpQuestion(
  conversationHistory: { role: 'ai' | 'user'; text: string }[],
  currentPhase: string,
  sliders: { mood: number; mentalNoise: number; focus: number; energy: number }
): Promise<PromptResult> {
  const transcriptStr = conversationHistory
    .map((msg) => `${msg.role === 'ai' ? 'AI' : 'User'}: ${msg.text}`)
    .join('\n');

  const userMessage = `Sliders: mood=${sliders.mood}%, mental_noise=${sliders.mentalNoise}%, focus=${sliders.focus}%, energy=${sliders.energy}%
Current phase: ${currentPhase}
Previous conversation:
${transcriptStr}

Generate the next follow-up question that goes deeper.`;

  try {
    const output = await callGroq(FALLBACK_MODEL, FOLLOW_UP_SYSTEM_PROMPT, userMessage, [], 100);
    if (output.includes(CRISIS_SENTINEL)) {
      return { type: 'crisis' };
    }
    return { type: 'prompt', text: output };
  } catch {
    // Fallback to next fixed question
    const phases = PROGRESSIVE_QUESTIONS.map(p => p.phase);
    const nextIdx = phases.indexOf(currentPhase as any) + 1;
    if (nextIdx < PROGRESSIVE_QUESTIONS.length) {
      return { type: 'prompt', text: PROGRESSIVE_QUESTIONS[nextIdx].question };
    }
    return { type: 'prompt', text: 'What is one small thing you could do differently tomorrow that is actually within your power?' };
  }
}

export async function generateSessionReflection(
  preSliders: SessionInput['sliders'],
  postSliders: SessionInput['sliders']
): Promise<PromptResult> {
  const userMessage = `Before: mood=${preSliders.mood}%, mental_noise=${preSliders.mentalNoise}%, focus=${preSliders.focus}%, energy=${preSliders.energy}%
After: mood=${postSliders.mood}%, mental_noise=${postSliders.mentalNoise}%, focus=${postSliders.focus}%, energy=${postSliders.energy}%`;

  try {
    const output = await callGroq(FALLBACK_MODEL, SESSION_REFLECTION_PROMPT, userMessage, [], 60);
    return { type: 'prompt', text: output };
  } catch {
    return { type: 'prompt', text: 'You showed up and put words to what you were carrying.' };
  }
}
