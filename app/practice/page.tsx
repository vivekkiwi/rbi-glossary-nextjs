"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"

type Term = { en: string; hi: string; letter: string }

export default function PracticePage() {
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLetter, setSelectedLetter] = useState("A")
  const [mode, setMode] = useState<"quiz" | "flash" | "guess">("quiz")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.user_metadata?.has_paid !== true) {
        router.push("/dashboard")
        return
      }
      // Load terms
      try {
        const res = await fetch("/terms.json")
        const data = await res.json()
        setTerms(data)
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    }
    checkAccess()
  }, [router, supabase])

  if (loading) return <div className="p-8 text-center">Loading practice platform...</div>

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
  const letterTerms = terms.filter(t => t.letter === selectedLetter)

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Practice</h1>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {letters.map(l => (
            <Button
              key={l}
              variant={selectedLetter === l ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedLetter(l)}
            >
              {l}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          <Button variant={mode === "quiz" ? "default" : "outline"} onClick={() => setMode("quiz")}>MCQ Quiz</Button>
          <Button variant={mode === "flash" ? "default" : "outline"} onClick={() => setMode("flash")}>Flashcards</Button>
          <Button variant={mode === "guess" ? "default" : "outline"} onClick={() => setMode("guess")}>Guess Meaning</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {mode === "quiz" && `Quiz - Letter ${selectedLetter} (${letterTerms.length} terms)`}
              {mode === "flash" && `Flashcards - Letter ${selectedLetter}`}
              {mode === "guess" && `Guess the Meaning`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {letterTerms.length === 0 ? (
              <p>No terms for this letter in the current dataset.</p>
            ) : (
              <p className="text-muted-foreground">
                Practice mode ready. Full interactive quiz, flashcard flip, and guess functionality 
                can be expanded here using the loaded {terms.length.toLocaleString()} terms.
                Selected letter has {letterTerms.length} terms.
              </p>
            )}
            <div className="mt-4 p-4 bg-secondary rounded-lg">
              <p className="font-medium">Sample term:</p>
              <p className="text-lg">{letterTerms[0]?.en || "—"}</p>
              <p className="text-muted-foreground">{letterTerms[0]?.hi || ""}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
