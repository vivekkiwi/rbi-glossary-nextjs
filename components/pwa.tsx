"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

type InstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {})
  }, [])

  return null
}

export function InstallHint() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [ios, setIos] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
    setInstalled(standalone)
    const apple = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIos(apple && !standalone)

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallPrompt)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    return () => window.removeEventListener("beforeinstallprompt", onPrompt)
  }, [])

  if (installed) return null

  if (prompt) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3">
        <p className="text-sm">Add Glossary to your home screen and open it like an app.</p>
        <Button
          size="sm"
          onClick={async () => {
            await prompt.prompt()
            setPrompt(null)
          }}
        >
          Add to home screen
        </Button>
      </div>
    )
  }

  if (ios) {
    return (
      <p className="rounded-2xl border px-4 py-3 text-sm text-muted-foreground">
        On iPhone, tap the Share button, then <span className="text-foreground">Add to Home Screen</span>.
      </p>
    )
  }

  return null
}
