import { create } from 'zustand';

interface Sliders {
  mood: number;
  mentalNoise: number;
  focus: number;
  energy: number;
}

export type ChatMessage = { role: 'ai' | 'user'; text: string };

export interface JournalEntry {
  questionIndex: number;
  phase: string;
  question: string;
  response: string;
  timestamp: number;
}

interface SessionState {
  // Current session ID
  sessionId: number | null;

  // Pre-session sliders
  preSliders: Sliders;

  // Diagnostic transcript (progressive questions + answers)
  conversation: ChatMessage[];

  // Journal entries per question phase
  journalEntries: JournalEntry[];

  // Current question index in the progressive flow
  currentQuestionIndex: number;

  // Generated prompt (for single-prompt mode fallback)
  generatedPrompt: string;

  // Combined journal text (all entries joined)
  journalText: string;

  // Session reflection
  sessionReflection: string;

  // Post-session sliders
  postSliders: Sliders;

  // Timer
  sessionStartTime: number | null;
  sessionDurationMs: number;

  // Actions
  setSessionId: (id: number) => void;
  setPreSliders: (s: Sliders) => void;
  appendMessage: (msg: ChatMessage) => void;
  addJournalEntry: (entry: JournalEntry) => void;
  setCurrentQuestionIndex: (i: number) => void;
  setGeneratedPrompt: (p: string) => void;
  setJournalText: (t: string) => void;
  setSessionReflection: (r: string) => void;
  setPostSliders: (s: Sliders) => void;
  setSessionStartTime: (t: number) => void;
  resetSession: () => void;
}

const DEFAULT_SLIDERS: Sliders = {
  mood: 50,
  mentalNoise: 50,
  focus: 50,
  energy: 50,
};

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  preSliders: { ...DEFAULT_SLIDERS },
  conversation: [],
  journalEntries: [],
  currentQuestionIndex: 0,
  generatedPrompt: '',
  journalText: '',
  sessionReflection: '',
  postSliders: { ...DEFAULT_SLIDERS },
  sessionStartTime: null,
  sessionDurationMs: 15 * 60 * 1000, // 15 minutes

  setSessionId: (id) => set({ sessionId: id }),
  setPreSliders: (s) => set({ preSliders: s }),
  appendMessage: (msg) => set((state) => ({ conversation: [...state.conversation, msg] })),
  addJournalEntry: (entry) => set((state) => ({
    journalEntries: [...state.journalEntries, entry],
  })),
  setCurrentQuestionIndex: (i) => set({ currentQuestionIndex: i }),
  setGeneratedPrompt: (p) => set({ generatedPrompt: p }),
  setJournalText: (t) => set({ journalText: t }),
  setSessionReflection: (r) => set({ sessionReflection: r }),
  setPostSliders: (s) => set({ postSliders: s }),
  setSessionStartTime: (t) => set({ sessionStartTime: t }),
  resetSession: () =>
    set({
      sessionId: null,
      preSliders: { ...DEFAULT_SLIDERS },
      conversation: [],
      journalEntries: [],
      currentQuestionIndex: 0,
      generatedPrompt: '',
      journalText: '',
      sessionReflection: '',
      postSliders: { ...DEFAULT_SLIDERS },
      sessionStartTime: null,
    }),
}));
