"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? ""

const validGaId = /^G-[A-Z0-9]+$/.test(gaId) ? gaId : ""

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export function Analytics() {
  const pathname = usePathname()
  const firstView = useRef(true)

  useEffect(() => {
    if (firstView.current) {
      firstView.current = false
      return
    }
    if (!validGaId || typeof window.gtag !== "function") return
    window.gtag("config", validGaId, { page_path: pathname })
  }, [pathname])

  return (
    <>
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
