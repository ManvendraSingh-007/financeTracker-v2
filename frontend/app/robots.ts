import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/"],
      disallow: ["/dashboard", "/auth"],
    },
    sitemap: "https://finance-tracker-v2-five.vercel.app/sitemap.xml",
    host: "https://finance-tracker-v2-five.vercel.app",
  }
}
