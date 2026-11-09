"use client"

import { useRef, useState } from "react"

const VIDEO_SRC = "/shabdawali-hindi.mp4"
const POSTER_SRC = "/shabdawali-hindi-poster.png"

export function DemoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)

  const start = () => {
    const video = videoRef.current
    if (!video || started) return
    video.src = VIDEO_SRC
    video.load()
    setStarted(true)
    void video.play()
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Watch the Hindi demo</h2>
          <p className="text-sm text-muted-foreground">A short walkthrough of the glossary. The video loads when you press play.</p>
        </div>
        <p className="text-sm text-muted-foreground">2 min</p>
      </div>
      <div className="relative aspect-video overflow-hidden rounded-2xl border bg-black">
        <video
          ref={videoRef}
          className="h-full w-full"
          controls={started}
          playsInline
          preload="none"
          poster={POSTER_SRC}
        />
        {!started && (
          <button
            type="button"
            onClick={start}
            className="absolute inset-0 cursor-pointer"
            aria-label="Play the Hindi glossary demo"
          >
            <img
              src={POSTER_SRC}
              alt=""
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 bg-black/25 transition-colors hover:bg-black/35" />
            <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-950 shadow-lg">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current">
                <path d="M8 5.5v13l11-6.5-11-6.5z" />
              </svg>
            </span>
          </button>
        )}
      </div>
    </section>
  )
}
