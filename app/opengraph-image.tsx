import { ImageResponse } from "next/og"

export const alt = "RBI Banking Glossary Mastery — English and Hindi practice"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#020617",
          color: "white",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#2563eb",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            अ
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#93c5fd" }}>English–Hindi banking glossary</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1 }}>
            RBI Banking Glossary Mastery
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#cbd5e1" }}>
            7,894 terms. Quiz, flashcards, and typed recall.
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
