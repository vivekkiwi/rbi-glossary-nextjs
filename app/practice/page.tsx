"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { PayButton } from "@/components/pay-button"
import { loadSessions, recentQuizMisses, recordAnswer, recordQuizSession, type QuizSession } from "@/lib/progress"

type Term = { en: string; hi: string; letter: string }
type Mode = "quiz" | "flash" | "guess"
type Question = {
  prompt: string
  options: string[]
  correct: string
  term: Term
  isEn2Hi: boolean
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5)
}

function makeQuestion(term: Term, pool: Term[], type: "en2hi" | "hi2en" | "mixed"): Question {
  const isEn2Hi = type === "en2hi" || (type === "mixed" && Math.random() > 0.5)
  const correct = isEn2Hi ? term.hi : term.en
  const distractors = shuffle(pool.filter((item) => item.en !== term.en))
    .slice(0, 3)
    .map((item) => (isEn2Hi ? item.hi : item.en))
  while (distractors.length < 3) distractors.push(isEn2Hi ? "अन्य विकल्प" : "other option")
  return {
    prompt: isEn2Hi ? term.en : term.hi,
    options: shuffle([correct, ...distractors]),
    correct,
    term,
    isEn2Hi,
  }
}

const SAVE_HREF = `/login?next=${encodeURIComponent("/practice?saved=1")}`

const modes: { id: Mode; title: string; hint: string; className: string }[] = [
  { id: "quiz", title: "Quiz", hint: "Pick the right meaning", className: "data-[on=true]:border-blue-400 data-[on=true]:bg-blue-500/15" },
  { id: "flash", title: "Flashcards", hint: "Flip, then rate yourself", className: "data-[on=true]:border-violet-400 data-[on=true]:bg-violet-500/15" },
  { id: "guess", title: "Guess", hint: "Type the other language", className: "data-[on=true]:border-emerald-400 data-[on=true]:bg-emerald-500/15" },
]

export default function PracticePage() {
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [selectedLetter, setSelectedLetter] = useState("A")
  const [mode, setMode] = useState<Mode>("quiz")
  const [quizCount, setQuizCount] = useState(10)
  const [quizType, setQuizType] = useState<"en2hi" | "hi2en" | "mixed">("mixed")
  const [questions, setQuestions] = useState<Question[]>([])
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizScore, setQuizScore] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [quizStarted, setQuizStarted] = useState(false)
  const [deck, setDeck] = useState<Term[]>([])
  const [flashIndex, setFlashIndex] = useState(0)
  const [showHindi, setShowHindi] = useState(false)
  const [flashStarted, setFlashStarted] = useState(false)
  const [guessTerm, setGuessTerm] = useState<Term | null>(null)
  const [guessEnglishPrompt, setGuessEnglishPrompt] = useState(true)
  const [guessAnswer, setGuessAnswer] = useState("")
  const [guessFeedback, setGuessFeedback] = useState<{ ok: boolean; answer: string } | null>(null)
  const [misses, setMisses] = useState<Term[]>([])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [hasPaid, setHasPaid] = useState(false)
  const [pendingLetter, setPendingLetter] = useState<string | null>(null)
  const [savedRound, setSavedRound] = useState<{ session: QuizSession; misses: { en: string; hi: string }[] } | null>(null)
  const guessInput = useRef<HTMLInputElement>(null)
  const autoStarted = useRef(false)
  const loaded = useRef(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    const checkAccess = async () => {
      let user: { email?: string; user_metadata?: { has_paid?: boolean } } | null = null
      try {
        const result = await supabase.auth.getUser()
        user = result.data.user
      } catch {
        user = null
      }
      const paid = user?.user_metadata?.has_paid === true
      const params = new URLSearchParams(window.location.search)
      const letter = params.get("letter")?.toUpperCase()
      const nextMode = params.get("mode")
      setHasPaid(paid)
      setUserEmail(user?.email ?? null)
      if (paid && letter && /^[A-Z]$/.test(letter)) setSelectedLetter(letter)
      if (user && !paid && letter && /^[A-Z]$/.test(letter) && letter !== "A") setPendingLetter(letter)
      if (user && (nextMode === "quiz" || nextMode === "flash" || nextMode === "guess")) setMode(nextMode)
      if (user && params.get("saved") === "1") {
        const session = loadSessions()[0]
        if (session) {
          setSavedRound({
            session,
            misses: recentQuizMisses(session).map((item) => ({ en: item.en, hi: item.hi })),
          })
        }
      }
      let glossary: Term[] = []
      try {
        const res = await fetch("/terms.json")
        const text = await res.text()
        const data = JSON.parse(text)
        if (!Array.isArray(data)) {
          setLoadError("The glossary file is empty. public/terms.json does not contain the term list.")
        } else {
          glossary = data
            .filter((term) => term && typeof term.en === "string")
            .map((term) => ({
              en: term.en,
              hi: typeof term.hi === "string" ? term.hi : "",
              letter: (term.letter || term.en || "A").trim().charAt(0).toUpperCase(),
            }))
          setTerms(glossary)
        }
      } catch {
        setLoadError("The glossary file could not be read.")
      }
      if (!user) {
        const pool = glossary.filter((term) => term.letter === "A")
        const count = Math.min(10, pool.length)
        if (count > 0) {
          setMode("quiz")
          setSelectedLetter("A")
          setQuizCount(10)
          setQuizType("mixed")
          setMisses([])
          setQuestions(shuffle(pool).slice(0, count).map((term) => makeQuestion(term, pool, "mixed")))
          setQuizIndex(0)
          setQuizScore(0)
          setPicked(null)
          setQuizStarted(true)
        }
      }
      setLoading(false)
    }
    checkAccess()
  }, [supabase])

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
  const letterTerms = terms.filter((term) => term.letter === selectedLetter)
  const currentQuestion = questions[quizIndex]
  const flashTerm = deck[flashIndex]
  const quizDone = quizStarted && quizIndex >= questions.length
  const quizProgress = questions.length ? Math.min(100, Math.round((quizIndex / questions.length) * 100)) : 0

  const resetSession = () => {
    setQuizStarted(false)
    setFlashStarted(false)
    setGuessTerm(null)
    setGuessFeedback(null)
    setSavedRound(null)
  }

  const startQuiz = () => {
    if (letterTerms.length === 0) return
    const type = userEmail ? quizType : "mixed"
    const count = Math.min(userEmail ? quizCount : 10, letterTerms.length)
    setSavedRound(null)
    setPendingLetter(null)
    setMisses([])
    setQuestions(shuffle(letterTerms).slice(0, count).map((term) => makeQuestion(term, letterTerms, type)))
    setQuizIndex(0)
    setQuizScore(0)
    setPicked(null)
    setQuizStarted(true)
  }

  const chooseOption = (option: string) => {
    if (!currentQuestion || picked) return
    const correct = option === currentQuestion.correct
    const nextScore = quizScore + (correct ? 1 : 0)
    setPicked(option)
    if (correct) setQuizScore(nextScore)
    else setMisses((current) => current.some((item) => item.en === currentQuestion.term.en) ? current : [...current, currentQuestion.term])
    recordAnswer(currentQuestion.term, correct, "quiz")
    if (quizIndex + 1 >= questions.length) {
      recordQuizSession({ letter: selectedLetter, correct: nextScore, total: questions.length })
    }
    window.setTimeout(() => {
      setQuizIndex((index) => index + 1)
      setPicked(null)
    }, 700)
  }

  const startFlash = () => {
    if (!userEmail || letterTerms.length === 0) return
    if (!hasPaid && selectedLetter !== "A") return
    setDeck(shuffle(letterTerms))
    setFlashIndex(0)
    setShowHindi(false)
    setFlashStarted(true)
  }

  const stepFlash = (direction: number) => {
    setFlashIndex((index) => (index + direction + deck.length) % deck.length)
    setShowHindi(false)
  }

  const rateFlash = (knew: boolean) => {
    if (!flashTerm) return
    recordAnswer(flashTerm, knew, "flash")
    stepFlash(1)
  }

  const nextGuess = () => {
    if (!userEmail || !letterTerms.length) return
    if (!hasPaid && selectedLetter !== "A") return
    const term = letterTerms[Math.floor(Math.random() * letterTerms.length)]
    setGuessTerm(term)
    setGuessEnglishPrompt(Math.random() > 0.5)
    setGuessAnswer("")
    setGuessFeedback(null)
  }

  const checkGuess = () => {
    if (!guessTerm || guessFeedback) return
    const expected = (guessEnglishPrompt ? guessTerm.hi : guessTerm.en).toLowerCase()
    const answer = guessAnswer.trim().toLowerCase()
    const ok = answer.length > 0 && (answer === expected || expected.includes(answer) || answer.includes(expected.split(/[\s,/]+/)[0]))
    recordAnswer(guessTerm, ok, "guess")
    setGuessFeedback({ ok, answer: guessEnglishPrompt ? guessTerm.hi : guessTerm.en })
  }

  useEffect(() => {
    if (loading || !userEmail || !hasPaid || autoStarted.current || letterTerms.length === 0) return
    const params = new URLSearchParams(window.location.search)
    if (params.get("saved") === "1") return
    const requested = params.get("mode")
    const shouldStart = params.get("autostart") === "1" || requested === "flash" || requested === "guess"
    if (!shouldStart) return
    autoStarted.current = true
    if (requested === "flash") startFlash()
    else if (requested === "guess") nextGuess()
    else startQuiz()
    // Start once when the paid letter requested in the URL is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userEmail, hasPaid, letterTerms.length, selectedLetter])

  useEffect(() => {
    if (mode === "guess" && guessTerm && !guessFeedback) guessInput.current?.focus()
  }, [mode, guessTerm, guessFeedback])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      if (mode === "quiz" && quizStarted && currentQuestion && !picked && /^[1-4]$/.test(event.key)) {
        const option = currentQuestion.options[Number(event.key) - 1]
        if (option) chooseOption(option)
      }
      if (mode === "flash" && flashStarted && flashTerm) {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault()
          setShowHindi((value) => !value)
        }
        if (event.key === "ArrowRight") stepFlash(1)
        if (event.key === "ArrowLeft") stepFlash(-1)
        if (event.key === "k") rateFlash(true)
        if (event.key === "d") rateFlash(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const shownMisses = misses.slice(0, 3)
  const nextQuizHref = `/practice?letter=${pendingLetter || "B"}&mode=quiz&autostart=1`

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading the glossary…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {userEmail
                ? `Letter ${selectedLetter} · ${letterTerms.length.toLocaleString()} terms`
                : "Letter A · 10 questions · no account"}
            </p>
            <h1 className="text-3xl font-bold">Practice</h1>
          </div>
          {userEmail && (
            <Button variant="outline" onClick={() => router.push("/dashboard")}>Dashboard</Button>
          )}
        </div>

        {userEmail && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {modes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-on={mode === item.id}
                  className={`rounded-xl border border-border px-3 py-3 text-left transition-colors hover:bg-secondary/50 ${item.className}`}
                  onClick={() => {
                    setPendingLetter(null)
                    setSavedRound(null)
                    setMode(item.id)
                  }}
                >
                  <span className="block font-semibold">{item.title}</span>
                  <span className="mt-1 hidden text-xs text-muted-foreground sm:block">{item.hint}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-[repeat(13,minmax(0,1fr))]">
              {letters.map((letter) => {
                const locked = !hasPaid && letter !== "A"
                return (
                  <button
                    key={letter}
                    type="button"
                    className={`h-9 rounded-md text-sm font-medium ${pendingLetter === letter ? "bg-primary text-primary-foreground" : selectedLetter === letter && !pendingLetter ? "bg-primary text-primary-foreground" : "bg-secondary/70 text-muted-foreground hover:text-foreground"} ${locked ? "opacity-70" : ""}`}
                    onClick={() => {
                      if (locked) {
                        resetSession()
                        setPendingLetter(letter)
                        return
                      }
                      setPendingLetter(null)
                      setSelectedLetter(letter)
                      resetSession()
                    }}
                  >
                    {letter}
                  </button>
                )
              })}
            </div>
          </>
        )}

        <section className="rounded-2xl border bg-card p-5 sm:p-8">
          {loadError ? (
            <p>{loadError}</p>
          ) : pendingLetter && !hasPaid ? (
            <div className="space-y-6 text-center">
              <div>
                <p className="text-sm uppercase tracking-wide text-muted-foreground">Letter {pendingLetter}</p>
                <h2 className="mt-2 text-2xl font-semibold">B–Z unlocks with one payment</h2>
                <p className="mt-2 text-muted-foreground">Letter A stays free. ₹499 opens every other letter and starts the {pendingLetter} quiz.</p>
              </div>
              <p className="text-5xl font-bold text-green-400">₹499</p>
              <PayButton nextHref={nextQuizHref} label={`Unlock and start letter ${pendingLetter}`} />
            </div>
          ) : letterTerms.length === 0 ? (
            <p>No terms for letter {selectedLetter}.</p>
          ) : mode === "quiz" ? (
            !quizStarted ? (
              savedRound ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-sm uppercase tracking-wide text-muted-foreground">Round saved · letter {savedRound.session.letter}</p>
                    <p className="text-6xl font-bold">{savedRound.session.total ? Math.round((savedRound.session.correct / savedRound.session.total) * 100) : 0}%</p>
                    <p className="text-lg">{savedRound.session.correct} of {savedRound.session.total} correct</p>
                  </div>
                  <MissedWords misses={savedRound.misses} />
                  {!hasPaid && (
                    <>
                      <p className="text-center text-muted-foreground">Letter A stays free. ₹499 unlocks B–Z and starts the next quiz.</p>
                      <PayButton nextHref="/practice?letter=B&mode=quiz&autostart=1" label="Unlock B–Z and start letter B" />
                    </>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <Button size="lg" variant="outline" onClick={startQuiz}>Practice letter {selectedLetter} again</Button>
                  </div>
                </div>
              ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Quiz letter {selectedLetter}</h2>
                  <p className="text-muted-foreground">Choose a length and a direction, then start. Keys 1–4 answer during the round.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[10, 20, 30, 50].map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={`rounded-xl border px-3 py-4 ${quizCount === count ? "border-primary bg-primary/15" : "hover:bg-secondary/50"}`}
                      onClick={() => setQuizCount(count)}
                    >
                      <span className="block text-2xl font-semibold">{count}</span>
                      <span className="text-xs text-muted-foreground">questions</span>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {([
                    ["mixed", "Mixed"],
                    ["en2hi", "English → Hindi"],
                    ["hi2en", "Hindi → English"],
                  ] as const).map(([value, label]) => (
                    <Button key={value} size="sm" variant={quizType === value ? "default" : "outline"} onClick={() => setQuizType(value)}>
                      {label}
                    </Button>
                  ))}
                </div>
                <Button size="lg" className="w-full" onClick={startQuiz}>Start quiz</Button>
              </div>
              )
            ) : quizDone ? (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">Letter {selectedLetter}</p>
                  <p className="text-6xl font-bold">{questions.length ? Math.round((quizScore / questions.length) * 100) : 0}%</p>
                  <p className="text-lg">{quizScore} of {questions.length} correct</p>
                </div>
                <MissedWords misses={shownMisses.map((term) => ({ en: term.en, hi: term.hi }))} />
                {!userEmail ? (
                  <div className="space-y-3 text-center">
                    <p className="text-muted-foreground">Sign in with Google to save this round. Letter A stays free.</p>
                    <Link href={SAVE_HREF} className="block">
                      <Button size="lg" className="w-full">Continue with Google</Button>
                    </Link>
                    <Button size="lg" variant="outline" className="w-full" onClick={startQuiz}>Play again</Button>
                  </div>
                ) : !hasPaid ? (
                  <div className="space-y-3">
                    <p className="text-center text-muted-foreground">Letter A stays free. ₹499 unlocks B–Z and starts the next quiz.</p>
                    <PayButton nextHref="/practice?letter=B&mode=quiz&autostart=1" label="Unlock B–Z and start letter B" />
                    <Button size="lg" variant="outline" className="w-full" onClick={startQuiz}>Play again</Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <Button size="lg" onClick={startQuiz}>Play again</Button>
                    <Button size="lg" variant="outline" onClick={resetSession}>Change settings</Button>
                  </div>
                )}
              </div>
            ) : currentQuestion ? (
              <div className="space-y-6">
                <div>
                  <div className="mb-2 flex justify-between text-sm text-muted-foreground">
                    <span>Question {quizIndex + 1} of {questions.length}</span>
                    <span>{quizScore} correct</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-primary transition-all" style={{ width: `${quizProgress}%` }} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{currentQuestion.isEn2Hi ? "Hindi meaning" : "English term"}</p>
                  <h2 className="mt-1 text-3xl font-semibold leading-tight">{currentQuestion.prompt}</h2>
                </div>
                <div className="grid gap-3">
                  {currentQuestion.options.map((option, index) => {
                    const revealed = picked !== null
                    const isCorrect = option === currentQuestion.correct
                    const isWrongPick = revealed && option === picked && !isCorrect
                    return (
                      <button
                        key={`${index}-${option}`}
                        type="button"
                        disabled={revealed}
                        onClick={() => chooseOption(option)}
                        className={`flex items-start gap-3 rounded-xl border px-4 py-4 text-left transition-colors hover:border-primary disabled:hover:border-border ${revealed && isCorrect ? "border-green-500 bg-green-950/60" : ""} ${isWrongPick ? "border-red-500 bg-red-950/60" : ""}`}
                      >
                        <span className="mt-0.5 w-5 shrink-0 text-sm text-muted-foreground">{index + 1}</span>
                        <span className="text-base">{option}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null
          ) : mode === "flash" ? (
            !flashStarted || !flashTerm ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Flashcards for {selectedLetter}</h2>
                  <p className="text-muted-foreground">Click the card to flip. Arrow keys move, K means knew it, D means you didn’t.</p>
                </div>
                <Button size="lg" className="w-full" onClick={startFlash}>Start flashcards</Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Card {flashIndex + 1} of {deck.length}</span>
                  <span>{showHindi ? "Hindi" : "English"}</span>
                </div>
                <button
                  type="button"
                  className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border bg-secondary/40 px-6 py-10 text-center"
                  onClick={() => setShowHindi((value) => !value)}
                >
                  <p className="text-3xl font-semibold leading-snug sm:text-4xl">{showHindi ? flashTerm.hi : flashTerm.en}</p>
                  <p className="mt-4 text-sm text-muted-foreground">Tap to {showHindi ? "see English" : "see Hindi"}</p>
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <Button size="lg" variant="outline" onClick={() => stepFlash(-1)}>Previous</Button>
                  <Button size="lg" variant="outline" onClick={() => stepFlash(1)}>Next</Button>
                  <Button size="lg" className="bg-green-600 hover:bg-green-700" onClick={() => rateFlash(true)}>Knew it</Button>
                  <Button size="lg" variant="destructive" onClick={() => rateFlash(false)}>Didn't know</Button>
                </div>
              </div>
            )
          ) : !guessTerm ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Guess letter {selectedLetter}</h2>
                <p className="text-muted-foreground">A term appears in English or Hindi. Type the other side and press Enter.</p>
              </div>
              <Button size="lg" className="w-full" onClick={nextGuess}>Start guessing</Button>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">{guessEnglishPrompt ? "Type the Hindi" : "Type the English"}</p>
              <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">{guessEnglishPrompt ? guessTerm.en : guessTerm.hi}</h2>
              <Input
                ref={guessInput}
                value={guessAnswer}
                onChange={(event) => setGuessAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return
                  event.preventDefault()
                  if (guessFeedback) nextGuess()
                  else checkGuess()
                }}
                placeholder={guessEnglishPrompt ? "Hindi meaning" : "English term"}
                disabled={guessFeedback !== null}
                className="h-12 text-base"
              />
              {guessFeedback && (
                <div className={`rounded-xl border px-4 py-3 ${guessFeedback.ok ? "border-green-500 bg-green-950/50 text-green-300" : "border-red-500 bg-red-950/50 text-red-300"}`}>
                  <p className="font-medium">{guessFeedback.ok ? "Correct" : "Not quite"}</p>
                  <p>{guessFeedback.answer}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Button size="lg" onClick={checkGuess} disabled={guessFeedback !== null || guessAnswer.trim().length === 0}>Check</Button>
                <Button size="lg" variant="outline" onClick={nextGuess} disabled={!guessFeedback}>Next</Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function MissedWords({ misses }: { misses: { en: string; hi: string }[] }) {
  if (misses.length === 0) {
    return <p className="text-center text-muted-foreground">No misses in this round.</p>
  }
  return (
    <div className="space-y-3 text-left">
      <p className="text-sm font-medium">Missed words</p>
      <ul className="space-y-3">
        {misses.slice(0, 3).map((term) => (
          <li key={term.en} className="flex items-baseline justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
            <span className="font-medium">{term.en}</span>
            <span className="text-muted-foreground">{term.hi}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
