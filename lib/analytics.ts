import { track } from "@vercel/analytics"

type EventValue = string | number | boolean | null
type EventProps = Record<string, EventValue>

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    clarity?: (...args: unknown[]) => void
  }
}

/** Sends a custom event to Vercel Web Analytics, GA4, and Clarity when each is loaded. */
export function trackEvent(name: string, properties?: EventProps) {
  if (typeof window === "undefined") return
  track(name, properties)
  if (typeof window.gtag === "function") {
    window.gtag("event", name, properties ?? {})
  }
  if (typeof window.clarity === "function") {
    window.clarity("event", name)
  }
}
