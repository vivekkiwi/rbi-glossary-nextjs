export const siteName = "RBI Banking Glossary Mastery"

export const siteDescription =
  "Practice 11,537 RBI banking glossary terms in English and Hindi with quizzes, flashcards, and typed recall."

export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000"
  return configured.replace(/\/$/, "")
}
