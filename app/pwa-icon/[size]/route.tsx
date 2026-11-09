import { ImageResponse } from "next/og"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const size = Number((await params).size)
  const dimension = [180, 192, 512].includes(size) ? size : 192

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
        }}
      >
        <div
          style={{
            width: "78%",
            height: "78%",
            borderRadius: dimension * 0.18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#2563eb",
            color: "white",
            fontSize: dimension * 0.34,
            fontWeight: 700,
          }}
        >
          अ
        </div>
      </div>
    ),
    { width: dimension, height: dimension }
  )
}
