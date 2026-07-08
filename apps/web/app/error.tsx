"use client";

import { useEffect } from "react";
import { RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[MSMEMate] page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
        <svg className="h-7 w-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <h2 className="mt-5 font-display text-xl font-bold text-brand-900">
        Something went wrong
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-surface-500">
        The page hit an unexpected error. Your data is safe — try again, or
        return to the start. कुछ गड़बड़ हो गई — कृपया दोबारा प्रयास करें।
      </p>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="btn-primary flex items-center gap-2">
          <RefreshCcw className="h-4 w-4" />
          Try again
        </button>
        <Link href="/" className="btn-secondary flex items-center gap-2">
          <Home className="h-4 w-4" />
          Home
        </Link>
      </div>
    </div>
  );
}
