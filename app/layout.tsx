import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Analytics } from "@/components/analytics"
import { PwaRegister } from "@/components/pwa"
import { siteDescription, siteName, siteUrl } from "@/lib/site"

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  applicationName: "Glossary Mastery",
  title: {
    default: `${siteName} | English–Hindi Practice`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    "RBI banking glossary",
    "RBI glossary English Hindi",
    "banking terms in Hindi",
    "RBI shabdavali practice",
    "banking quiz",
  ],
  openGraph: {
    type: "website",
    siteName: siteName,
    title: `${siteName} | English–Hindi Practice`,
    description: siteDescription,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | English–Hindi Practice`,
    description: siteDescription,
  },
  robots: { index: true, follow: true },
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
        <Analytics />
        {children}
      </body>
    </html>
  )
}
