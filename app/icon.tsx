import { ImageResponse } from "next/og"

export const size = { width: 64, height: 64 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2563eb",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "white",
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1,
            marginBottom: 6,
          }}
        >
          अ
        </div>
      </div>
    ),
    { ...size }
  )
}
