import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://beaconvie.com";

// Only list routes that are actually public and worth indexing. Every other
// route in this app requires authentication (see
// src/lib/auth-route-policy.ts) and would just redirect a crawler to
// /login, so it has no business in a sitemap. Add entries here as real
// public content (e.g. /learn/* articles) ships.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
