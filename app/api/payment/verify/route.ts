import { NextResponse } from "next/server"
import crypto from "crypto"
import { monetisationEnabled } from "@/lib/flags"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  if (!monetisationEnabled()) {
    return NextResponse.json({ success: false, error: "Payments are disabled" }, { status: 404 })
  }

  const body = await request.json()
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex")

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 400 })
  }

  // Mark user as paid
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.updateUser({
      data: {
        has_paid: true,
        paid_at: new Date().toISOString(),
        razorpay_payment_id,
        razorpay_order_id,
      },
    })
  }

  return NextResponse.json({ success: true })
}
