// ─── WEB FALLBACK (localStorage) ───────────────────────────────────────────────
let webDb = {
  profile: null as any,
  sessions: [] as any[],
  streak: { id: 1, current_streak: 0, longest_streak: 0, last_session_date: null } as any,
};

if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('mindprotocol_db');
    if (saved) webDb = JSON.parse(saved);
  } catch (e) {}
}

function persistWeb() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mindprotocol_db', JSON.stringify(webDb));
  }
}

export async function initDb() {
  // Synchronous setup on web
  return;
}

export async function saveUserProfile(ageRange: string, role: string, gender: string = '') {
  webDb.profile = { id: 1, age_range: ageRange, role, gender, session_time: '21:00' };
  persistWeb();
}

export async function getUserProfile() {
  return webDb.profile;
}

export async function updateSessionTime(time: string) {
  if (webDb.profile) webDb.profile.session_time = time;
  persistWeb();
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  return !!webDb.profile;
}

export async function startSession(date: string): Promise<number> {
  const id = Date.now();
  webDb.sessions.push({ id, date, completed: 0 });
  persistWeb();
  return id;
}

export async function savePreSliders(
  sessionId: number, mood: number, noise: number, focus: number, energy: number
) {
  const session = webDb.sessions.find(s => s.id === sessionId);
  if (session) {
    session.pre_mood = mood; session.pre_noise = noise;
    session.pre_focus = focus; session.pre_energy = energy;
    persistWeb();
  }
}

export async function saveDiagnosticTranscript(sessionId: number, transcript: {role: string, text: string}[]) {
  const session = webDb.sessions.find(s => s.id === sessionId);
  if (session) {
    session.diagnostic_transcript = JSON.stringify(transcript);
    persistWeb();
  }
}

export async function saveGeneratedPrompt(sessionId: number, prompt: string) {
  const session = webDb.sessions.find(s => s.id === sessionId);
  if (session) {
    session.generated_prompt = prompt;
    persistWeb();
  }
}

export async function saveJournalText(sessionId: number, text: string) {
  const session = webDb.sessions.find(s => s.id === sessionId);
  if (session) {
    session.journal_text = text;
    persistWeb();
  }
}

export async function saveSessionReflection(sessionId: number, reflection: string) {
  const session = webDb.sessions.find(s => s.id === sessionId);
  if (session) {
    session.session_reflection = reflection;
    persistWeb();
  }
}

export async function savePostSliders(
  sessionId: number, mood: number, noise: number, focus: number, energy: number
) {
  const session = webDb.sessions.find(s => s.id === sessionId);
  if (session) {
    session.post_mood = mood; session.post_noise = noise;
    session.post_focus = focus; session.post_energy = energy;
    session.completed = 1;
    persistWeb();
  }
}

export async function completeSession(sessionId: number) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak = 1;
  if (webDb.streak.last_session_date === yesterdayStr) {
    newStreak = webDb.streak.current_streak + 1;
  } else if (webDb.streak.last_session_date === today) {
    newStreak = webDb.streak.current_streak;
  }
  webDb.streak.current_streak = newStreak;
  webDb.streak.longest_streak = Math.max(newStreak, webDb.streak.longest_streak);
  webDb.streak.last_session_date = today;
  persistWeb();
}

export async function getStreak() {
  return webDb.streak;
}

export async function getTodaySession() {
  const today = new Date().toISOString().split('T')[0];
  return webDb.sessions.find(s => s.date === today && s.completed === 1);
}

export async function getWeeklySessions() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const from = sevenDaysAgo.toISOString().split('T')[0];
  return webDb.sessions.filter(s => s.date >= from && s.completed === 1).sort((a,b) => a.date.localeCompare(b.date));
}

export async function getMonthlySessions() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const from = thirtyDaysAgo.toISOString().split('T')[0];
  return webDb.sessions.filter(s => s.date >= from && s.completed === 1).sort((a,b) => a.date.localeCompare(b.date));
}
