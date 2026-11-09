"use client"

import { useState } from "react"
import Script from "next/script"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function PayButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handlePayment = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/payment/create-order", { method: "POST" })
      const order = await res.json()
      if (!res.ok || !order.orderId || !order.key) {
        alert("Failed to initiate payment")
        return
      }

      const email = (await supabase.auth.getUser()).data.user?.email
      const options = {
        key: order.key,
        amount: order.amount,
        currency: "INR",
        name: "RBI Glossary Mastery",
        description: "Lifetime Access",
        order_id: order.orderId,
        handler: async (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) => {
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          })
          const data = await verifyRes.json()
          if (data.success) {
            router.refresh()
          } else {
            alert("Payment verification failed")
          }
        },
        prefill: { email },
        theme: { color: "#3b82f6" },
      }

      const RazorpayCheckout = (window as Window & { Razorpay?: new (options: unknown) => { open: () => void } }).Razorpay
      if (!RazorpayCheckout) {
        alert("Failed to initiate payment")
        return
      }
      new RazorpayCheckout(options).open()
    } catch (error) {
      console.error(error)
      alert("Failed to initiate payment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Button
        className="w-full bg-green-600 hover:bg-green-700"
        onClick={handlePayment}
        disabled={loading}
      >
        {loading ? "Processing..." : "Pay with Razorpay"}
      </Button>
    </>
  )
}
