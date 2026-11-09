import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { PwaRegister } from "@/components/pwa"

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
}

export const metadata: Metadata = {
  applicationName: "Glossary Mastery",
  title: "RBI Banking Glossary Mastery",
  description: "Master the full RBI Banking Glossary with interactive quizzes, flashcards, and spaced repetition.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Glossary",
  },
  icons: {
    icon: [{ url: "/icon", sizes: "64x64", type: "image/png" }],
    apple: [{ url: "/pwa-icon/180", sizes: "180x180", type: "image/png" }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <PwaRegister />
        {children}
      </body>
    </html>
  )
}
