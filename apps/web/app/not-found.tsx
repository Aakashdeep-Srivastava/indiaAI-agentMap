import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-6xl font-extrabold text-surface-200">404</p>
      <h2 className="mt-3 font-display text-xl font-bold text-brand-900">
        Page not found
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-surface-500">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
        यह पृष्ठ उपलब्ध नहीं है।
      </p>
      <Link href="/" className="btn-primary mt-6">
        Back to home
      </Link>
    </div>
  );
}
