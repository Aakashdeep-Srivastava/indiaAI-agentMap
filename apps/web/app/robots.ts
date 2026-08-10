import type { MetadataRoute } from "next";

/* Marketing pages + public registration are crawlable; the logged-in
 * dashboard is not (it carries no public content, only user data). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/classify",
          "/match",
          "/catalogue",
          "/review",
          "/reviews",
          "/audit",
          "/allocate",
          "/certificate",
          "/upload",
          "/login",
          // Admin-only oversight surfaces. Both are gated, but leaving them
          // out of this list advertised their existence to anyone reading
          // robots.txt.
          "/claims",
          "/model-health",
        ],
      },
    ],
    sitemap: "https://www.msmemate.com/sitemap.xml",
  };
}
