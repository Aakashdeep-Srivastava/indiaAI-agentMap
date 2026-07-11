import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog";

const BASE = "https://www.msmemate.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE,
      lastModified: new Date("2026-07-11"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE}/register`,
      lastModified: new Date("2026-07-11"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE}/blog`,
      lastModified: new Date("2026-07-11"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE}/privacy`,
      lastModified: new Date("2026-07-11"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/terms`,
      lastModified: new Date("2026-07-11"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...BLOG_POSTS.map((post) => ({
      url: `${BASE}/blog/${post.slug}`,
      lastModified: new Date(post.dateModified),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
