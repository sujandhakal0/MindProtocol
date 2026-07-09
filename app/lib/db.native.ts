import * as SQLite from 'expo-sqlite';

let nativeDb: SQLite.SQLiteDatabase | null = null;

export async function initDb() {
  nativeDb = await SQLite.openDatabaseAsync('mindprotocol.db');
  await nativeDb.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY,
      age_range TEXT NOT NULL,
      role TEXT NOT NULL,
      session_time TEXT DEFAULT '21:00',
      created_at TEXT DEFAULT (datetime('now'))
    );

    DROP TABLE IF EXISTS sessions;
    CREATE TABLE sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      pre_mood INTEGER,
      pre_noise INTEGER,
      pre_focus INTEGER,
      pre_energy INTEGER,
      diagnostic_transcript TEXT,
      generated_prompt TEXT,
      journal_text TEXT,
      session_reflection TEXT,
      post_mood INTEGER,
      post_noise INTEGER,
      post_focus INTEGER,
      post_energy INTEGER,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS streak (
      id INTEGER PRIMARY KEY,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_session_date TEXT
    );
  `);

  await nativeDb.runAsync(
    `INSERT OR IGNORE INTO streak (id, current_streak, longest_streak) VALUES (1, 0, 0)`
  );
}

export async function saveUserProfile(ageRange: string, role: string) {
  await nativeDb!.runAsync(
    `INSERT OR REPLACE INTO user_profile (id, age_range, role, session_time) VALUES (1, ?, ?, COALESCE((SELECT session_time FROM user_profile WHERE id=1), '21:00'))`,
    [ageRange, role]
  );
}

export async function getUserProfile() {
  return await nativeDb!.getFirstAsync<any>(
    `SELECT * FROM user_profile WHERE id = 1`
  );
}

export async function updateSessionTime(time: string) {
  await nativeDb!.runAsync(`UPDATE user_profile SET session_time = ? WHERE id = 1`, [time]);
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  const profile = await getUserProfile();
  return !!profile;
}

export async function startSession(date: string): Promise<number> {
  const result = await nativeDb!.runAsync(
    `INSERT INTO sessions (date, completed) VALUES (?, 0)`,
    [date]
  );
  return result.lastInsertRowId;
}

export async function savePreSliders(
  sessionId: number, mood: number, noise: number, focus: number, energy: number
) {
  await nativeDb!.runAsync(
    `UPDATE sessions SET pre_mood=?, pre_noise=?, pre_focus=?, pre_energy=? WHERE id=?`,
    [mood, noise, focus, energy, sessionId]
  );
}

export async function saveDiagnosticTranscript(sessionId: number, transcript: {role: string, text: string}[]) {
  await nativeDb!.runAsync(
    `UPDATE sessions SET diagnostic_transcript=? WHERE id=?`,
    [JSON.stringify(transcript), sessionId]
  );
}

export async function saveGeneratedPrompt(sessionId: number, prompt: string) {
  await nativeDb!.runAsync(
    `UPDATE sessions SET generated_prompt=? WHERE id=?`,
    [prompt, sessionId]
  );
}

export async function saveJournalText(sessionId: number, text: string) {
  await nativeDb!.runAsync(
    `UPDATE sessions SET journal_text=? WHERE id=?`,
    [text, sessionId]
  );
}

export async function saveSessionReflection(sessionId: number, reflection: string) {
  await nativeDb!.runAsync(
    `UPDATE sessions SET session_reflection=? WHERE id=?`,
    [reflection, sessionId]
  );
}

export async function savePostSliders(
  sessionId: number, mood: number, noise: number, focus: number, energy: number
) {
  await nativeDb!.runAsync(
    `UPDATE sessions SET post_mood=?, post_noise=?, post_focus=?, post_energy=?, completed=1 WHERE id=?`,
    [mood, noise, focus, energy, sessionId]
  );
}

export async function completeSession(sessionId: number) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const streak = await nativeDb!.getFirstAsync<any>(`SELECT * FROM streak WHERE id = 1`);
  if (streak) {
    let newStreak = 1;
    if (streak.last_session_date === yesterdayStr) {
      newStreak = streak.current_streak + 1;
    } else if (streak.last_session_date === today) {
      newStreak = streak.current_streak;
    }
    const newLongest = Math.max(newStreak, streak.longest_streak);
    await nativeDb!.runAsync(
      `UPDATE streak SET current_streak=?, longest_streak=?, last_session_date=? WHERE id=1`,
      [newStreak, newLongest, today]
    );
  }
}

export async function getStreak() {
  return await nativeDb!.getFirstAsync<any>(`SELECT * FROM streak WHERE id = 1`);
}

export async function getTodaySession() {
  const today = new Date().toISOString().split('T')[0];
  return await nativeDb!.getFirstAsync<any>(
    `SELECT * FROM sessions WHERE date = ? AND completed = 1`,
    [today]
  );
}

export async function getWeeklySessions() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const from = sevenDaysAgo.toISOString().split('T')[0];
  return await nativeDb!.getAllAsync<any>(
    `SELECT * FROM sessions WHERE date >= ? AND completed = 1 ORDER BY date ASC`,
    [from]
  );
}

export async function getMonthlySessions() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const from = thirtyDaysAgo.toISOString().split('T')[0];
  return await nativeDb!.getAllAsync<any>(
    `SELECT * FROM sessions WHERE date >= ? AND completed = 1 ORDER BY date ASC`,
    [from]
  );
}
