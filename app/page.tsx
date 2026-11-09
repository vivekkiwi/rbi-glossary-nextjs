import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            RBI Banking Glossary Mastery
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Master all ~7,900 English-Hindi banking terms from the official RBI glossary. 
            Daily letter quizzes, flashcards, weak-term review, and progress tracking.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link href="/login">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">Login</Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <Card>
            <CardHeader>
              <CardTitle>Full A-Z Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Every term from the official RBI Banking Glossary with English and Hindi meanings.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Multiple Practice Modes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Alphabet MCQs, flashcards, guess meaning, and focused weak-term review.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Track Your Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Persistent progress with mastery levels and automatic prioritization of weak terms.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-12 text-center">
          <CardHeader>
            <CardTitle>Lifetime Access</CardTitle>
            <CardDescription>One-time payment • Unlimited practice</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-500 mb-4">₹499</div>
            <Link href="/login">
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                Unlock Full Access
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
