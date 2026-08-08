import type { Metadata } from "next";
import FeedbackForm from "@/components/FeedbackForm";

export const metadata: Metadata = {
  title: "Share Your Feedback",
  description:
    "Tell us what you think of MSMEMate — rate the application and share what worked and what we can improve. Your feedback shapes how we serve Bharat's businesses.",
  alternates: { canonical: "/feedback" },
};

export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 pb-20 pt-28 sm:pt-32">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-saffron-500">
        We&apos;re listening
      </span>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">
        Share your feedback
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-surface-600">
        MSMEMate is built for India&apos;s micro and small enterprises. Your honest
        review helps us improve — rate the app and tell us anything, in English or Hindi.
        अपनी राय हमारे साथ साझा करें।
      </p>

      <div className="mt-8">
        <FeedbackForm />
      </div>
    </div>
  );
}
