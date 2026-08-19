import type { MetadataRoute } from "next";
import { protectedPrefixes } from "@/src/lib/auth-route-policy";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://beaconvie.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Everything under these prefixes requires a session (see
      // src/lib/auth-route-policy.ts) and just redirects a crawler to
      // /login, so keep crawl budget off it.
      disallow: protectedPrefixes,
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
