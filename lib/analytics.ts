import { track } from "@vercel/analytics"

type EventValue = string | number | boolean | null
type EventProps = Record<string, EventValue>

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

/** Sends a custom event to Vercel Web Analytics and, when configured, GA4. */
export function trackEvent(name: string, properties?: EventProps) {
  if (typeof window === "undefined") return
  track(name, properties)
  if (typeof window.gtag === "function") {
    window.gtag("event", name, properties ?? {})
  }
}
