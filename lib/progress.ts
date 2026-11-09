export type Term = { en: string; hi: string; letter: string }

export type TermStat = {
  correct: number
  wrong: number
  last: number | null
  mastery: number
  quiz: number
  flash: number
  guess: number
}

export type PracticeMode = "quiz" | "flash" | "guess"

export type Activity = {
  at: number
  mode: PracticeMode
  letter: string
  en: string
  hi: string
  ok: boolean
}

export type QuizSession = {
  at: number
  letter: string
  correct: number
  total: number
}

const TERMS_KEY = "rbi_glossary_progress"
const ACTIVITY_KEY = "rbi_glossary_activity"
const SESSIONS_KEY = "rbi_glossary_sessions"
export const PROGRESS_EVENT = "glossary-progress"

function emptyStat(): TermStat {
  return { correct: 0, wrong: 0, last: null, mastery: 0, quiz: 0, flash: 0, guess: 0 }
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function notify() {
  window.dispatchEvent(new Event(PROGRESS_EVENT))
}

export function loadTermStats(): Record<string, TermStat> {
  const raw = readJson<Record<string, Partial<TermStat>>>(TERMS_KEY, {})
  const stats: Record<string, TermStat> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue
    stats[key] = {
      correct: value.correct || 0,
      wrong: value.wrong || 0,
      last: value.last ?? null,
      mastery: value.mastery || 0,
      quiz: value.quiz || 0,
      flash: value.flash || 0,
      guess: value.guess || 0,
    }
  }
  return stats
}

export function loadActivity(): Activity[] {
  return readJson<Activity[]>(ACTIVITY_KEY, [])
}

export function loadSessions(): QuizSession[] {
  return readJson<QuizSession[]>(SESSIONS_KEY, [])
}

export function recordAnswer(term: Term, ok: boolean, mode: PracticeMode) {
  const stats = loadTermStats()
  const key = term.en.toLowerCase()
  const current = stats[key] || emptyStat()
  if (ok) {
    current.correct += 1
    current.mastery = Math.min(5, current.mastery + 1)
  } else {
    current.wrong += 1
    current.mastery = Math.max(0, current.mastery - 1)
  }
  current.last = Date.now()
  current[mode] += 1
  stats[key] = current
  localStorage.setItem(TERMS_KEY, JSON.stringify(stats))

  const activity = loadActivity()
  activity.unshift({
    at: current.last,
    mode,
    letter: term.letter,
    en: term.en,
    hi: term.hi,
    ok,
  })
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity.slice(0, 40)))
  notify()
}

export function recordQuizSession(session: Omit<QuizSession, "at">) {
  const sessions = loadSessions()
  sessions.unshift({ ...session, at: Date.now() })
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 12)))
  notify()
}

function dayKey(timestamp: number) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function practiceStreak(stats: Record<string, TermStat>) {
  const days = new Set<string>()
  for (const stat of Object.values(stats)) {
    if (stat.last) days.add(dayKey(stat.last))
  }
  const cursor = new Date()
  cursor.setHours(12, 0, 0, 0)
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export type LetterProgress = {
  letter: string
  total: number
  attempted: number
  correct: number
  wrong: number
  mastered: number
}

export type WeakTerm = Term & { stat: TermStat }

export type ProgressSummary = {
  total: number
  attempted: number
  correct: number
  wrong: number
  accuracy: number
  mastered: number
  learning: number
  weakCount: number
  streak: number
  today: number
  quiz: number
  flash: number
  guess: number
  earlier: number
  letters: LetterProgress[]
  weak: WeakTerm[]
  activity: Activity[]
  sessions: QuizSession[]
  focusLetter: string
}

export function summarize(terms: Term[]): ProgressSummary {
  const stats = loadTermStats()
  const activity = loadActivity()
  const sessions = loadSessions()
  const byLetter = new Map<string, LetterProgress>()
  for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    byLetter.set(letter, { letter, total: 0, attempted: 0, correct: 0, wrong: 0, mastered: 0 })
  }

  let correct = 0
  let wrong = 0
  let mastered = 0
  let learning = 0
  let quiz = 0
  let flash = 0
  let guess = 0
  let today = 0
  const todayKey = dayKey(Date.now())
  const weak: WeakTerm[] = []
  const seen = new Set<string>()

  for (const term of terms) {
    const row = byLetter.get(term.letter)
    if (row) row.total += 1
    const stat = stats[term.en.toLowerCase()]
    if (!stat || stat.correct + stat.wrong === 0) continue
    if (seen.has(term.en.toLowerCase())) continue
    seen.add(term.en.toLowerCase())
    correct += stat.correct
    wrong += stat.wrong
    quiz += stat.quiz
    flash += stat.flash
    guess += stat.guess
    if (stat.last && dayKey(stat.last) === todayKey) today += stat.correct + stat.wrong
    if (row) {
      row.attempted += 1
      row.correct += stat.correct
      row.wrong += stat.wrong
      if (stat.mastery >= 4) row.mastered += 1
    }
    if (stat.mastery >= 4) mastered += 1
    else learning += 1
    if (stat.wrong > stat.correct || (stat.wrong > 0 && stat.mastery <= 2)) {
      weak.push({ ...term, stat })
    }
  }

  weak.sort((a, b) => b.stat.wrong - a.stat.wrong || a.stat.mastery - b.stat.mastery)
  const letters = [...byLetter.values()]
  const focus = [...letters].filter((letter) => letter.total > 0).sort((a, b) => {
    const aWeak = a.wrong - a.correct
    const bWeak = b.wrong - b.correct
    if (bWeak !== aWeak) return bWeak - aWeak
    return a.attempted / a.total - b.attempted / b.total
  })[0]

  const answers = correct + wrong
  const tagged = quiz + flash + guess

  return {
    total: terms.length,
    attempted: seen.size,
    correct,
    wrong,
    accuracy: answers ? Math.round((correct / answers) * 100) : 0,
    mastered,
    learning,
    weakCount: weak.length,
    streak: practiceStreak(stats),
    today,
    quiz,
    flash,
    guess,
    earlier: Math.max(0, answers - tagged),
    letters,
    weak: weak.slice(0, 8),
    activity: activity.slice(0, 8),
    sessions: sessions.slice(0, 4),
    focusLetter: focus?.letter || "A",
  }
}
