import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const hasPaid = user.user_metadata?.has_paid === true

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {user.email}</p>
          </div>
          <form action="/api/auth/signout" method="post">
            <Button variant="outline" type="submit">Logout</Button>
          </form>
        </div>

        {!hasPaid ? (
          <Card className="max-w-md mx-auto text-center">
            <CardHeader>
              <CardTitle>Unlock Full Access</CardTitle>
              <CardDescription>One-time payment for lifetime access to all practice modes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-4xl font-bold text-green-500">₹499</div>
              <Link href="/payment">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Pay Now
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">Secure payment via Razorpay</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Start Practicing</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href="/practice">
                  <Button className="w-full">Go to Practice</Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Your Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Progress tracking is active. Keep practicing daily!</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
