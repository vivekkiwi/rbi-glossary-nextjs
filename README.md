# RBI Banking Glossary Mastery – Next.js App

A modern Next.js 15 application with Supabase authentication, Razorpay payments, and a full practice platform for the RBI Banking Glossary (~7,900 English-Hindi terms).

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS** + custom design system (shadcn/ui style components)
- **Supabase** Auth
- **Razorpay** Payment Gateway
- Dark theme optimized for focused study

## Features

- Landing page with clear pricing
- Email/password authentication
- Protected dashboard
- One-time ₹499 lifetime access payment
- Practice area with letter selection and multiple modes
- Full glossary data served from `/public/terms.json`

## Setup

1. **Clone / copy the project**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase and Razorpay keys.

4. **Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - Copy URL and anon key into `.env.local`
   - (Optional) Disable email confirmation for faster testing

5. **Razorpay**
   - Create account at [razorpay.com](https://razorpay.com)
   - Get Test Key ID and Key Secret
   - Add them to `.env.local`

6. **Run the app**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
  (auth)/login/page.tsx
  (auth)/signup/page.tsx
  dashboard/page.tsx
  payment/page.tsx
  practice/page.tsx
  api/payment/...
components/ui/          # Design system components
lib/supabase/           # Supabase clients
public/terms.json       # Full glossary
```

## Payment Flow

1. User signs up / logs in
2. On dashboard, if not paid → redirect to `/payment`
3. Server creates Razorpay order
4. Client opens Razorpay Checkout
5. On success, server verifies signature and updates `user_metadata.has_paid = true`
6. User gains access to `/practice`

## Notes

- Progress tracking in the practice page is a starting point. You can extend it with localStorage or a Supabase table for cross-device sync.
- For production, consider adding a webhook endpoint for more reliable payment confirmation.
- The design system uses Tailwind + CSS variables for easy theming.

## Original Data

The full A–Z glossary was extracted from the official RBI Banking Glossary PDF.
