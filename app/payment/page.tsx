"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import Script from "next/script"

export default function PaymentPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push("/login")
      if (user?.user_metadata?.has_paid) router.push("/dashboard")
    }
    check()
  }, [router, supabase])

  const handlePayment = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/payment/create-order", { method: "POST" })
      const { orderId, amount, key } = await res.json()

      const options = {
        key,
        amount,
        currency: "INR",
        name: "RBI Glossary Mastery",
        description: "Lifetime Access",
        order_id: orderId,
        handler: async function (response: any) {
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          })
          const data = await verifyRes.json()
          if (data.success) {
            alert("Payment successful! Access unlocked.")
            router.push("/dashboard")
            router.refresh()
          } else {
            alert("Payment verification failed")
          }
        },
        prefill: {
          email: (await supabase.auth.getUser()).data.user?.email,
        },
        theme: { color: "#3b82f6" },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (e) {
      console.error(e)
      alert("Failed to initiate payment")
    }
    setLoading(false)
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Unlock Lifetime Access</CardTitle>
            <CardDescription>One-time payment • All practice modes • ~7,900 terms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-5xl font-bold text-green-500">₹499</div>
            <Button
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handlePayment}
              disabled={loading}
            >
              {loading ? "Processing..." : "Pay with Razorpay"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Secure payment. Access granted immediately after successful payment.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
