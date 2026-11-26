import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/admin/", "/me", "/add", "/login", "/search", "/styleguide", "/entry/*/edit"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
