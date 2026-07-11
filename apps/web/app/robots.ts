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
          "/audit",
          "/allocate",
          "/certificate",
          "/upload",
          "/login",
        ],
      },
    ],
    sitemap: "https://www.msmemate.com/sitemap.xml",
  };
}
