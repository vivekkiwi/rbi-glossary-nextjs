"use client"

import { telegramChannel, telegramUrl } from "@/lib/site"
import { cn } from "@/lib/utils"

type Variant = "card" | "compact" | "link"

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M21.94 4.3a1.2 1.2 0 0 0-1.62-1.08L2.8 10.05c-1.03.4-.99 1.88.06 2.22l4.42 1.42 1.7 5.36c.25.8 1.26 1.04 1.84.44l2.48-2.53 4.5 3.32c.73.54 1.78.13 1.96-.76L21.94 4.3Zm-4.3 3.22-8.1 7.4-.32 3.24-1.2-3.8 9.62-6.84Z" />
    </svg>
  )
}

function trackClick(location: string) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", "telegram_join_click", { location, channel: telegramChannel })
  }
}

/** Invites visitors to the daily Telegram quiz. Renders nothing until a channel is configured. */
export function TelegramJoin({ variant = "card", location }: { variant?: Variant; location: string }) {
  if (!telegramUrl) return null

  const link = (label: string, className: string) => (
    <a
      href={telegramUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackClick(location)}
      className={className}
    >
      <TelegramIcon className="h-4 w-4 shrink-0" />
      {label}
    </a>
  )

  if (variant === "link") {
    return link("Daily quiz on Telegram", "inline-flex items-center gap-1.5 hover:text-foreground")
  }

  const button = link(
    "Join free on Telegram",
    "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[#229ED9] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1c8cc2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  )

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-sky-500/40 bg-sky-500/10 sm:flex-row sm:items-center sm:justify-between",
        variant === "card" ? "p-5 sm:p-6" : "p-4",
      )}
    >
      <div className="space-y-1">
        <p className={cn("font-semibold", variant === "card" ? "text-lg" : "text-base")}>
          रोज़ 5 RBI बैंकिंग शब्द · Daily quiz on Telegram
        </p>
        <p className="text-sm text-muted-foreground">
          {variant === "card"
            ? "Every morning at 7:30 IST: five quick quiz polls from the RBI glossary, English↔Hindi. Free, no sign-up."
            : "Keep practising every morning: five quiz polls at 7:30 IST. Free."}
        </p>
      </div>
      {button}
    </div>
  )
}
