export const siteName = "RBI Banking Glossary Mastery"

export const siteDescription =
  "Practice 11,537 RBI banking glossary terms in English and Hindi with quizzes, flashcards, and typed recall."

// Public Telegram channel for the daily quiz, without the "@".
// NEXT_PUBLIC_TELEGRAM_CHANNEL overrides it. Join buttons hide while it's empty.
export const telegramChannel = (process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL || "").trim().replace(/^@/, "")
export const telegramUrl = telegramChannel ? `https://t.me/${telegramChannel}` : ""

export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000"
  return configured.replace(/\/$/, "")
}
