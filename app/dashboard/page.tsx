import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { PayButton } from "@/components/pay-button"
import { ProgressBoard } from "@/components/progress-board"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const hasPaid = user.user_metadata?.has_paid === true

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {user.email}</p>
          </div>
          <form action="/api/auth/signout" method="post">
            <Button variant="outline" type="submit">Logout</Button>
          </form>
        </div>

        {!hasPaid && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Letter A is free</CardTitle>
              <CardDescription>
                Quiz, flashcards, and guess stay open on A. ₹499 unlocks B–Z and starts the next quiz.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-4xl font-bold text-green-500">₹499</p>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-64">
                <Link href="/practice">
                  <Button variant="outline" className="w-full">Practice letter A</Button>
                </Link>
                <PayButton label="Unlock B–Z · ₹499" />
              </div>
            </CardContent>
          </Card>
        )}
        <ProgressBoard />
      </div>
    </div>
  )
}
