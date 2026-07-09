import axios from 'axios';
import {
  SYSTEM_PROMPT_V5_PROMPTS,
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
  gender: string;
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
  | { type: 'prompts'; prompts: string[] }
  | { type: 'crisis' }
  | { type: 'rate_limit' }
  | { type: 'error'; message: string };

/** Few-shot examples aligned with 3-prompt progressive depth arc. */
const FEW_SHOT_MESSAGES = [
  {
    role: 'user' as const,
    content: `Onboarding: age_range=18-22, role=student, gender=male
Sliders: mood=40%, mental_noise=75%, focus=45%, energy=50%
Conversation Transcript:
AI: What's the main thing on your mind right now?
User: can't stop thinking about a comment my professor made
AI: How would you describe your emotional state in 3 words?
User: embarrassed, replaying, stuck
AI: Where in your body do you feel this most?
User: my chest feels tight, like pressure
AI: If this feeling had a message for you, what would it be?
User: that I'm not good enough`,
  },
  {
    role: 'assistant' as const,
    content: `["Write without stopping to edit. This is only for you.\\n\\nYour professor's comment is still sitting in your chest — that tight, pressurized feeling hasn't let go. Imagine you could step outside this moment and watch it happen from across the room: a student hearing a comment about their work. What would you notice about that scene that you can't see from inside it?","Write without stopping to edit. This is only for you.\\n\\nYou used the word \"embarrassed\" — but you also said \"replaying\" and \"stuck.\" If you had to pick the one that cuts deepest out of those three, which root word would it be? Not the surface feeling, but the one underneath that's been driving the replay loop. Write toward that word and see what it opens.","Write without stopping to edit. This is only for you.\\n\\nThat tightness in your chest keeps whispering \"not good enough.\" But whose voice is that, really — is it yours, or is it the echo of something you've been told? If a close friend came to you carrying this exact weight, what would you say to them about whether this one moment defines anything at all?"]`,
  },
  {
    role: 'user' as const,
    content: `Onboarding: age_range=27-35, role=professional, gender=female
Sliders: mood=25%, mental_noise=55%, focus=40%, energy=20%
Conversation Transcript:
AI: What's the main thing on your mind right now?
User: I keep messing up at work
AI: How would you describe your emotional state in 3 words?
User: ashamed, tired, annoyed at myself
AI: Where in your body do you feel this most?
User: shoulders, constantly tense
AI: If this feeling had a message for you, what would it be?
User: that I should be better by now`,
  },
  {
    role: 'assistant' as const,
    content: `["Write without stopping to edit. This is only for you.\\n\\nYour shoulders are holding every mistake from this week — tense and heavy, like they're carrying something that isn't yours to hold alone. If you could set those shoulders down for a moment and look at the week from across a table, what would you see that the tension is hiding from you?","Write without stopping to edit. This is only for you.\\n\\nYou said \"ashamed\" and \"annoyed at myself\" — those are close, but they're not the same. If you sit with the shame for another breath, is it closer to the feeling of having failed someone else, or the feeling of having failed the version of yourself you thought you'd be by now? Write about which one it is.","Write without stopping to edit. This is only for you.\\n\\nYou told yourself you \"should be better by now.\" That word — should — is doing a lot of heavy lifting. If you replaced it with something softer, something you'd actually say to a friend in your position, what would come out? Write it to yourself, exactly as you'd say it to them."]`,
  },
  {
    role: 'user' as const,
    content: `Onboarding: age_range=22-27, role=student, gender=non-binary
Sliders: mood=30%, mental_noise=40%, focus=25%, energy=20%
Conversation Transcript:
AI: What's the main thing on your mind right now?
User: nothing specific, just kind of numb
AI: How would you describe your emotional state in 3 words?
User: flat, tired, blank
AI: Where in your body do you feel this most?
User: everywhere and nowhere at the same time
AI: If this feeling had a message for you, what would it be?
User: I don't know, just tired of everything`,
  },
  {
    role: 'assistant' as const,
    content: `["Write without stopping to edit. This is only for you.\\n\\nNumbness is its own kind of heavy — not the sharp kind, but the kind that sits on everything and makes it all feel the same. You said it's everywhere and nowhere at once. What would it look like if you described today to someone who wasn't there — not the feelings, just what actually happened, the plain facts of the day?","Write without stopping to edit. This is only for you.\\n\\nYou said \"tired of everything\" — and that's a real thing, not a small thing. If you had to separate the tired from the everything, which part is actually the heaviest right now? Not all of it, just the one piece that's pulling the rest down. Name it if you can.","Write without stopping to edit. This is only for you.\\n\\nSometimes numbness is the brain's way of saying \"enough for now\" — and that's not failure, that's protection. You don't have to push through it today. If you could give this flat, tired version of yourself one small thing — not a solution, just a kindness — what would it be?"]`,
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

/** Deterministic keyword-based crisis detection — runs first, no API needed. */
function checkCrisisKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  const crisisPatterns = [
    /\b(suicid|kill (my)?self|end (my)? life|want to die|gonna die|going to die|wish i was dead)\b/,
    /\b(self[- ]?harm|cut(ting)? myself|hurt(ing)? myself|slice my|burn myself)\b/,
    /\b(no point|no reason to live|can'?t go on|nothing will ever change|hopeless|worthless)\b/,
    /\b(harm (an?other|someone)|kill (an?other|someone)|shoot|stab)\b/,
    /\b(suicide|suicidal)\b/,
  ];
  return crisisPatterns.some(p => p.test(lower));
}

export async function checkCrisisInText(text: string): Promise<PromptResult> {
  // Fast local check first — deterministic, no network
  if (checkCrisisKeywords(text)) {
    return { type: 'crisis' };
  }

  // If no local match, ask the LLM as a second pass
  try {
    const output = await callGroq(FALLBACK_MODEL, CRISIS_CHECK_PROMPT, text, [], 10);
    if (output.includes(CRISIS_SENTINEL)) return { type: 'crisis' };
    return { type: 'prompt', text: 'SAFE' };
  } catch (error: any) {
    // If API fails, we already did the local check — assume safe
    return { type: 'prompt', text: 'SAFE' };
  }
}

export async function generateJournalingPrompt(input: SessionInput): Promise<PromptResult> {
  const transcriptStr = input.conversation
    .map((msg) => `${msg.role === 'ai' ? 'AI' : 'User'}: ${msg.text}`)
    .join('\n');

  const userMessage = `Onboarding: age_range=${input.ageRange}, role=${input.role}, gender=${input.gender || 'not specified'}
Sliders: mood=${input.sliders.mood}%, mental_noise=${input.sliders.mentalNoise}%, focus=${input.sliders.focus}%, energy=${input.sliders.energy}%
Conversation Transcript:
${transcriptStr}`;

  try {
    const output = await callGroq(
      PRIMARY_MODEL,
      SYSTEM_PROMPT_V5_PROMPTS,
      userMessage,
      FEW_SHOT_MESSAGES,
      800
    );

    if (output.includes(CRISIS_SENTINEL)) {
      return { type: 'crisis' };
    }

    const prompts = parsePromptsArray(output);
    if (prompts.length > 0) {
      return { type: 'prompts', prompts };
    }
    // Fallback: if JSON parsing fails, split by double newline or use raw text
    return { type: 'prompts', prompts: [output] };
  } catch (error: any) {
    if (error.response?.status === 429) {
      try {
        const fallbackOutput = await callGroq(
          FALLBACK_MODEL,
          SYSTEM_PROMPT_V5_PROMPTS,
          userMessage,
          FEW_SHOT_MESSAGES,
          800
        );
        if (fallbackOutput.includes(CRISIS_SENTINEL)) {
          return { type: 'crisis' };
        }
        const prompts = parsePromptsArray(fallbackOutput);
        if (prompts.length > 0) {
          return { type: 'prompts', prompts };
        }
        return { type: 'prompts', prompts: [fallbackOutput] };
      } catch {
        return { type: 'rate_limit' };
      }
    }

    return { type: 'error', message: error.message ?? 'Unknown error' };
  }
}

/** Try to parse LLM output as a JSON array of prompts. */
function parsePromptsArray(text: string): string[] {
  try {
    // Try direct JSON parse
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
    }
  } catch {
    // Try to extract JSON array from markdown code block
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
        }
      } catch {
        // give up
      }
    }
  }
  return [];
}

const FOLLOW_UP_SYSTEM_PROMPT = `You are MindProtocol's journaling guide. You generate ONE follow-up question for a user who is in the middle of a progressive deepening journaling session.

The session has 4 phases. After the user writes freely following each question, you generate the NEXT question that goes deeper.

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
2. naming → examining: Go deeper — choose the MOST relevant angle based on what they shared:
   - If they described a physical sensation or body feeling → ask about the body ("Where do you feel this most?")
   - If they described a thought loop or mental pattern → ask about the pattern ("What keeps pulling you back to this?")
   - If they described a specific event or person → ask about meaning ("What does this situation mean to you right now?")
   - If they described numbness or disconnection → ask about what's underneath ("If the numbness wasn't there, what would be?")
   - Pick the ONE question that goes deepest for THIS person. Never default to body scan if it doesn't fit.
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
