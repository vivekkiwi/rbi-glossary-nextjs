"use client"

import { useState } from "react"
import Script from "next/script"
import { useRouter } from "next/navigation"
import { trackEvent } from "@/lib/analytics"
import { monetisationEnabled } from "@/lib/flags"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function PayButton({
  nextHref = "/practice?letter=B&mode=quiz&autostart=1",
  label = "Pay ₹499",
  source = "pay_button",
}: {
  nextHref?: string
  label?: string
  source?: string
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  if (!monetisationEnabled()) return null

  const handlePayment = async () => {
    setLoading(true)
    trackEvent("payment_started", { source })
    try {
      const res = await fetch("/api/payment/create-order", { method: "POST" })
      const order = await res.json()
      if (!res.ok || !order.orderId || !order.key) {
        trackEvent("payment_failed", { source, reason: "create_order" })
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
            trackEvent("payment_succeeded", { source })
            await supabase.auth.refreshSession()
            router.push(nextHref)
            router.refresh()
          } else {
            trackEvent("payment_failed", { source, reason: "verify" })
            alert("Payment verification failed")
          }
        },
        prefill: { email },
        theme: { color: "#3b82f6" },
      }

      const RazorpayCheckout = (window as Window & { Razorpay?: new (options: unknown) => { open: () => void } }).Razorpay
      if (!RazorpayCheckout) {
        trackEvent("payment_failed", { source, reason: "checkout_script" })
        alert("Failed to initiate payment")
        return
      }
      new RazorpayCheckout(options).open()
    } catch (error) {
      console.error(error)
      trackEvent("payment_failed", { source, reason: "exception" })
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
        data-cta="pay"
        data-cta-location={source}
        onClick={handlePayment}
        disabled={loading}
      >
        {loading ? "Processing..." : label}
      </Button>
    </>
  )
}
