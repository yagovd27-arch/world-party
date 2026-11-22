import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/checkout", "/t/", "/auth/", "/club"] },
    sitemap: "https://www.lanit.club/sitemap.xml",
    host: "https://www.lanit.club",
  };
}
