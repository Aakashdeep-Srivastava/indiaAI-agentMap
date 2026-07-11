import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — ONDC & MSME Guides",
  description:
    "Plain-language guides for Indian MSMEs: what ONDC is, how to go from Udyam registration to selling online, and how to pick the right seller app.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "MSMEMate Blog — ONDC & MSME Guides",
    description:
      "Plain-language guides that take Indian MSMEs from Udyam registration to selling on ONDC.",
    url: "https://www.msmemate.com/blog",
    type: "website",
  },
};

export default function BlogIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 pb-20 pt-28 sm:pt-32">
      {/* Header */}
      <div className="max-w-2xl">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-saffron-500">
          MSMEMate Blog
        </span>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">
          Guides for Bharat&rsquo;s businesses
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-surface-600 sm:text-base">
          Plain-language answers on ONDC, Udyam and selling online — written
          for MSME owners, not consultants. हिन्दी में भी समझाया गया।
        </p>
      </div>

      {/* Post cards */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {BLOG_POSTS.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="glass-card group flex flex-col p-5"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
              {new Date(post.datePublished).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}{" "}
              · {post.readMinutes} min read
            </span>
            <h2 className="mt-2 font-display text-lg font-bold leading-snug text-brand-900 transition-colors group-hover:text-brand-500">
              {post.title}
            </h2>
            <p className="mt-1 text-[13px] font-medium text-saffron-500">
              {post.hindiTagline}
            </p>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-surface-500">
              {post.description}
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500">
              Read the guide
              <svg
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </Link>
        ))}
      </div>

      {/* CTA band */}
      <div className="glass-card mt-12 flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h3 className="font-display text-lg font-bold text-brand-900">
            Ready to take your business onto ONDC?
          </h3>
          <p className="mt-1 text-sm text-surface-500">
            Register by voice in your language — your Udyam certificate does
            the paperwork.
          </p>
        </div>
        <Link href="/register" className="btn-saffron shrink-0">
          Start free registration
        </Link>
      </div>
    </div>
  );
}
