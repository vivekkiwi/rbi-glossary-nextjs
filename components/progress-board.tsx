"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PROGRESS_EVENT, summarize, type ProgressSummary, type Term } from "@/lib/progress"

function formatWhen(timestamp: number) {
  const diff = Date.now() - timestamp
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

const modeLabel = { quiz: "Quiz", flash: "Flashcard", guess: "Guess" }

function PracticeActions({ letter }: { letter: string }) {
  const actions = [
    {
      href: `/practice?letter=${letter}&mode=quiz`,
      title: "Quiz",
      detail: `Multiple choice on letter ${letter}`,
      className: "border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20",
      titleClass: "text-blue-300",
    },
    {
      href: `/practice?letter=${letter}&mode=flash`,
      title: "Flashcards",
      detail: `Flip and rate letter ${letter}`,
      className: "border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20",
      titleClass: "text-violet-300",
    },
    {
      href: `/practice?letter=${letter}&mode=guess`,
      title: "Guess",
      detail: `Type the meaning for letter ${letter}`,
      className: "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20",
      titleClass: "text-emerald-300",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {actions.map((action) => (
        <Link
          key={action.title}
          href={action.href}
          className={`flex min-h-32 flex-col justify-between rounded-xl border p-5 transition-colors ${action.className}`}
        >
          <span className={`text-2xl font-semibold ${action.titleClass}`}>{action.title}</span>
          <span className="text-sm text-muted-foreground">{action.detail}</span>
        </Link>
      ))}
    </div>
  )
}

export function ProgressBoard() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetch("/terms.json")
        const data = await response.json()
        if (!active || !Array.isArray(data)) return
        const terms = data.filter((term: Term) => term && typeof term.en === "string") as Term[]
        setSummary(summarize(terms))
      } catch {
        if (active) setSummary(null)
      }
    }
    load()
    window.addEventListener(PROGRESS_EVENT, load)
    window.addEventListener("focus", load)
    return () => {
      active = false
      window.removeEventListener(PROGRESS_EVENT, load)
      window.removeEventListener("focus", load)
    }
  }, [])

  if (!summary) {
    return <p className="text-muted-foreground">Loading your progress…</p>
  }

  const coverage = summary.total ? Math.round((summary.attempted / summary.total) * 100) : 0
  const modeRows = [
    ["Quiz", summary.quiz, "bg-blue-500"],
    ["Flashcards", summary.flash, "bg-violet-500"],
    ["Guess", summary.guess, "bg-emerald-500"],
    ["Earlier practice", summary.earlier, "bg-slate-500"],
  ].filter(([, count]) => Number(count) > 0)

  return (
    <div className="space-y-6">
      <PracticeActions letter={summary.focusLetter} />
      <Card className="overflow-hidden">
        <CardContent className="grid gap-6 p-6 md:grid-cols-[180px_1fr] md:items-center">
          <div className="relative mx-auto h-36 w-36">
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: `conic-gradient(#60a5fa ${coverage * 3.6}deg, #1e293b 0)` }}
            />
            <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-background">
              <span className="text-3xl font-bold">{coverage}%</span>
              <span className="text-xs text-muted-foreground">covered</span>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <h2 className="text-2xl font-semibold">Your progress</h2>
              <p className="text-muted-foreground">
                {summary.attempted === 0
                  ? "Nothing practiced in this browser yet. Your first answer fills in the numbers below."
                  : `${summary.attempted.toLocaleString()} of ${summary.total.toLocaleString()} terms practiced · ${summary.accuracy}% accurate · ${summary.streak} day streak`}
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary" style={{ width: `${coverage}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Answers today", summary.today],
          ["Correct", summary.correct],
          ["Missed", summary.wrong],
          ["Mastered", summary.mastered],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How you practiced</CardTitle>
          <CardDescription>
            {summary.learning} still learning · {summary.weakCount} need another look
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {modeRows.length === 0 ? (
            <p className="text-muted-foreground">Quiz, flashcard, and guess answers will split out here.</p>
          ) : modeRows.map(([label, count, color]) => {
            const total = summary.quiz + summary.flash + summary.guess + summary.earlier || 1
            const width = Math.round((Number(count) / total) * 100)
            return (
              <div key={String(label)}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="text-muted-foreground">{count} answers · {width}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className={`h-full ${color}`} style={{ width: `${width}%` }} />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Letters</CardTitle>
          <CardDescription>Practiced terms in each letter. Open a letter to keep going.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {summary.letters.filter((letter) => letter.total > 0).map((letter) => {
            const percent = Math.round((letter.attempted / letter.total) * 100)
            const answers = letter.correct + letter.wrong
            const accuracy = answers ? Math.round((letter.correct / answers) * 100) : 0
            return (
              <Link key={letter.letter} href={`/practice?letter=${letter.letter}`} className="rounded-lg border p-3 hover:bg-secondary/40">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-semibold">{letter.letter}</span>
                  <span className="text-sm text-muted-foreground">{percent}%</span>
                </div>
                <div className="my-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {letter.attempted}/{letter.total} · {answers ? `${accuracy}% right` : "not started"}
                </p>
              </Link>
            )
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Needs review</CardTitle>
            <CardDescription>Terms you missed more often than you got right.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.weak.length === 0 ? (
              <p className="text-muted-foreground">Missed terms show up here after you answer a few.</p>
            ) : summary.weak.map((term) => (
              <div key={term.en} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium">{term.en}</p>
                  <p className="text-sm text-muted-foreground">{term.hi}</p>
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">{term.stat.wrong} missed · {term.stat.mastery}/5</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent answers</CardTitle>
            <CardDescription>The latest quiz, flashcard, and guess results.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.activity.length === 0 ? (
              <p className="text-muted-foreground">Each quiz choice, card rating, and guess will show up here.</p>
            ) : summary.activity.map((item) => (
              <div key={`${item.at}-${item.en}`} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium">{item.en}</p>
                  <p className="text-sm text-muted-foreground">{modeLabel[item.mode]} · letter {item.letter}</p>
                </div>
                <div className="text-right">
                  <p className={item.ok ? "text-sm text-green-500" : "text-sm text-red-400"}>{item.ok ? "Correct" : "Missed"}</p>
                  <p className="text-xs text-muted-foreground">{formatWhen(item.at)}</p>
                </div>
              </div>
            ))}
            {summary.sessions.length > 0 && (
              <div className="pt-2">
                <p className="mb-2 text-sm font-medium">Finished quizzes</p>
                {summary.sessions.map((session) => (
                  <p key={session.at} className="text-sm text-muted-foreground">
                    Letter {session.letter}: {session.correct}/{session.total} · {formatWhen(session.at)}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
