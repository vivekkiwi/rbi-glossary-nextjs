import type { MetadataRoute } from "next"
import { siteUrl } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/practice", "/payment", "/login", "/signup", "/api/", "/auth/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
