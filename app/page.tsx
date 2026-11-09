import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

const modes = [
  {
    title: "Quiz",
    detail: "Multiple choice from English to Hindi, or the other way. Rounds of 10, 20, 30, or 50.",
    className: "border-blue-500/40 bg-blue-500/10",
    label: "text-blue-300",
  },
  {
    title: "Flashcards",
    detail: "Flip a term, then mark whether you knew it. Arrow keys move through the letter.",
    className: "border-violet-500/40 bg-violet-500/10",
    label: "text-violet-300",
  },
  {
    title: "Guess",
    detail: "Read the term and type the other language. Enter checks the answer and loads the next one.",
    className: "border-emerald-500/40 bg-emerald-500/10",
    label: "text-emerald-300",
  },
]

const steps = [
  ["Sign in", "Use your Google account. There is no password to remember."],
  ["Unlock once", "A single ₹499 payment opens every letter and every practice mode."],
  ["Practice daily", "Pick a letter. Your accuracy, streak, and weak terms stay on the dashboard."],
]

const samples = [
  ["Account", "खाता"],
  ["Balance", "शेष"],
  ["Credit", "जमा"],
  ["Interest", "ब्याज"],
]

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const nextHref = user ? "/dashboard" : "/login"
  const nextLabel = user ? "Go to dashboard" : "Start practicing"

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <p className="font-semibold tracking-tight">Glossary Mastery</p>
        <Link href={nextHref}>
          <Button variant="outline">{user ? "Dashboard" : "Sign in"}</Button>
        </Link>
      </header>

      <main className="mx-auto max-w-5xl space-y-16 px-4 pb-20">
        <section className="grid items-end gap-10 pt-8 md:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-6">
            <p className="text-sm font-medium uppercase tracking-widest text-blue-300">English–Hindi banking glossary</p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              Learn the terms.
              <span className="block bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Remember them.
              </span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              7,894 English–Hindi banking terms, practiced by letter. Quiz, flip cards, or type the meaning, then see exactly which words still slip.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href={nextHref}>
                <Button size="lg">{nextLabel}</Button>
              </Link>
              {!user && <p className="text-sm text-muted-foreground">Google sign-in · one-time ₹499</p>}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">From the glossary</p>
            <ul className="mt-4 space-y-3">
              {samples.map(([en, hi]) => (
                <li key={en} className="flex items-baseline justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
                  <span className="font-medium">{en}</span>
                  <span className="text-muted-foreground">{hi}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {modes.map((mode) => (
            <Link
              key={mode.title}
              href={nextHref}
              className={`flex min-h-40 flex-col justify-between rounded-2xl border p-5 transition-colors hover:brightness-110 ${mode.className}`}
            >
              <span className={`text-2xl font-semibold ${mode.label}`}>{mode.title}</span>
              <span className="text-sm text-muted-foreground">{mode.detail}</span>
            </Link>
          ))}
        </section>

        <section className="grid gap-8 md:grid-cols-[1fr_280px] md:items-center">
          <ol className="space-y-5">
            {steps.map(([title, detail], index) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-muted-foreground">{detail}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="rounded-2xl border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Lifetime access</p>
            <p className="mt-2 text-5xl font-bold text-green-400">₹499</p>
            <p className="mt-2 text-sm text-muted-foreground">One payment. Every letter. No subscription.</p>
            <Link href={nextHref} className="mt-5 block">
              <Button size="lg" className="w-full bg-green-600 hover:bg-green-700">
                {user ? "Open dashboard" : "Unlock and practice"}
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
