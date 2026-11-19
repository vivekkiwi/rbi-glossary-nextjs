"use client"

import Script from "next/script"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef } from "react"
import { track } from "@vercel/analytics"
import { trackEvent } from "@/lib/analytics"

const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? ""

const validGaId = /^G-[A-Z0-9]+$/.test(gaId) ? gaId : ""

function RouteAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const path = searchParams.size ? `${pathname}?${searchParams}` : pathname
  const firstView = useRef(true)

  useEffect(() => {
    track("page_view", { path })
    if (typeof window.clarity === "function") {
      window.clarity("set", "page", path)
    }
    if (firstView.current) {
      firstView.current = false
      return
    }
    if (!validGaId || typeof window.gtag !== "function") return
    window.gtag("config", validGaId, { page_path: path })
  }, [path])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const el = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-cta]")
      if (!el) return
      const href = el.getAttribute("href") ?? el.closest("a")?.getAttribute("href") ?? null
      trackEvent("cta_click", {
        id: el.dataset.cta || "unknown",
        location: el.dataset.ctaLocation || pathname,
        href,
      })
    }
    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [pathname])

  return null
}

export function Analytics() {
  return (
    <>
      <Suspense fallback={null}>
        <RouteAnalytics />
      </Suspense>
      {validGaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${validGaId}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${validGaId}');
            `}
          </Script>
        </>
      )}
    </>
  )
}
