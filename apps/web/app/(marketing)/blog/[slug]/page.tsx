import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getPost } from "@/lib/blog";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.metaTitle,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      url: `https://www.msmemate.com/blog/${post.slug}`,
      title: post.metaTitle,
      description: post.description,
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
      authors: ["Team XphoraAI"],
    },
    twitter: {
      card: "summary",
      title: post.metaTitle,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  /* Article + FAQPage structured data — the AEO/GEO backbone of the post */
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.description,
      datePublished: post.datePublished,
      dateModified: post.dateModified,
      inLanguage: "en-IN",
      author: { "@type": "Organization", name: "Team XphoraAI" },
      publisher: {
        "@type": "Organization",
        name: "MSMEMate",
        logo: {
          "@type": "ImageObject",
          url: "https://www.msmemate.com/logo.png",
        },
      },
      mainEntityOfPage: `https://www.msmemate.com/blog/${post.slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Blog",
          item: "https://www.msmemate.com/blog",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: post.title,
          item: `https://www.msmemate.com/blog/${post.slug}`,
        },
      ],
    },
  ];

  return (
    <article className="mx-auto max-w-3xl px-6 pb-20 pt-28 sm:pt-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs text-surface-400">
        <Link href="/blog" className="font-medium hover:text-brand-500">
          Blog
        </Link>{" "}
        <span aria-hidden>/</span>{" "}
        <span className="text-surface-500">{post.title}</span>
      </nav>

      {/* Header */}
      <header className="mt-4">
        <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-brand-900 sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-2 text-base font-medium text-saffron-500">
          {post.hindiTagline}
        </p>
        <p className="mt-3 text-xs text-surface-400">
          By Team XphoraAI ·{" "}
          {new Date(post.datePublished).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          · {post.readMinutes} min read
        </p>
      </header>

      {/* TL;DR — the direct answer, first thing on the page */}
      <div className="glass-card mt-7 border-l-4 !border-l-saffron-500 p-5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-saffron-500">
          The short answer
        </span>
        <p className="mt-1.5 text-sm leading-relaxed text-surface-600 sm:text-[15px]">
          {post.tldr}
        </p>
      </div>

      {/* Sections */}
      <div className="mt-10 space-y-10">
        {post.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-xl font-bold tracking-tight text-brand-900 sm:text-2xl">
              {section.heading}
            </h2>
            {section.paragraphs.map((p) => (
              <p
                key={p.slice(0, 40)}
                className="mt-3 text-sm leading-relaxed text-surface-600 sm:text-[15px] sm:leading-7"
              >
                {p}
              </p>
            ))}
            {section.list && (
              <ul className="mt-4 space-y-2.5">
                {section.list.map((item) => (
                  <li key={item.slice(0, 40)} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron-500" />
                    <span className="text-sm leading-relaxed text-surface-600 sm:text-[15px]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {section.steps && (
              <ol className="mt-4 space-y-4">
                {section.steps.map((step, i) => (
                  <li key={step.title} className="flex items-start gap-3.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500 font-display text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-brand-900 sm:text-[15px]">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-surface-600">
                        {step.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>

      {/* FAQ */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-bold tracking-tight text-brand-900 sm:text-2xl">
          Frequently asked questions
        </h2>
        <div className="mt-4 space-y-3">
          {post.faq.map((f) => (
            <details
              key={f.q}
              className="glass-card group p-4 open:!shadow-card"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-brand-900">
                {f.q}
                <svg
                  className="h-4 w-4 shrink-0 text-surface-400 transition-transform group-open:rotate-180"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>
              <p className="mt-2.5 text-sm leading-relaxed text-surface-600">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="glass-card mt-12 flex flex-col items-center gap-4 p-7 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h3 className="font-display text-lg font-bold text-brand-900">
            Take the first step today
          </h3>
          <p className="mt-1 text-sm text-surface-500">
            Register your MSME by voice — free, in your language, DPDP-compliant.
          </p>
        </div>
        <Link href="/register" className="btn-saffron shrink-0">
          Register your business
        </Link>
      </div>

      {/* Related posts */}
      <div className="mt-10 border-t border-surface-200 pt-6">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-surface-400">
          Keep reading
        </span>
        <div className="mt-3 flex flex-col gap-2">
          {BLOG_POSTS.filter((p) => p.slug !== post.slug).map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="text-sm font-semibold text-brand-500 hover:underline"
            >
              {p.title} →
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}
