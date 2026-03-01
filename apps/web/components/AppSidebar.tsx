"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  UserPlus,
  Layers,
  GitMerge,
  ClipboardList,
  Shield,
  Upload,
  X,
} from "lucide-react";

/* ── Journey steps (Sathi → VargBot → JodakAI) ──────────────── */
const JOURNEY = [
  { label: "Register", codename: "Sathi", href: "/register", icon: UserPlus },
  { label: "Classify", codename: "VargBot", href: "/classify", icon: Layers },
  { label: "Match", codename: "JodakAI", href: "/match", icon: GitMerge },
] as const;

/* ── Tool links ──────────────────────────────────────────────── */
const TOOLS = [
  { label: "Review Queue", href: "/review", icon: ClipboardList },
  { label: "Audit Trail", href: "/audit", icon: Shield },
] as const;

const ADMIN = [
  { label: "Upload Taxonomy", href: "/upload", icon: Upload },
] as const;

/* ── Step state helper ───────────────────────────────────────── */
function getStepState(
  stepIndex: number,
  activeIndex: number,
): "completed" | "active" | "pending" {
  if (activeIndex < 0) return "pending";
  if (stepIndex < activeIndex) return "completed";
  if (stepIndex === activeIndex) return "active";
  return "pending";
}

export default function AppSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mseId = searchParams.get("mseId");

  /* Which journey step is active? */
  const activeJourneyIndex = JOURNEY.findIndex((s) =>
    pathname.startsWith(s.href),
  );

  /* Append mseId to journey links when context exists */
  function journeyHref(base: string) {
    return mseId ? `${base}?mseId=${mseId}` : base;
  }

  function isActive(href: string) {
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* ── Mobile overlay backdrop ─────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-surface-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* ── Logo ──────────────────────────────────────────────── */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-surface-100 px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo.svg"
              alt="AgentMap AI"
              width={28}
              height={28}
              className="h-7 w-7"
            />
            <span className="font-display text-sm font-bold tracking-tight text-brand-900">
              AgentMap<span className="text-brand-500">AI</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Scrollable content ────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-5">
          {/* MSE Context Card */}
          {mseId && (
            <div className="mb-5 rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                Active MSE
              </span>
              <p className="mt-0.5 font-mono text-sm font-bold text-brand-900">
                MSE #{mseId}
              </p>
            </div>
          )}

          {/* ── JOURNEY ─────────────────────────────────────────── */}
          <div className="mb-6">
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-surface-400">
              Journey
            </span>
            <nav className="space-y-1">
              {JOURNEY.map((step, i) => {
                const state = getStepState(i, activeJourneyIndex);
                const Icon = step.icon;
                return (
                  <Link
                    key={step.href}
                    href={journeyHref(step.href)}
                    onClick={onClose}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      state === "active"
                        ? "bg-brand-50 text-brand-900"
                        : state === "completed"
                          ? "text-surface-600 hover:bg-surface-50"
                          : "text-surface-400 hover:bg-surface-50 hover:text-surface-600"
                    }`}
                  >
                    {/* Step indicator */}
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        state === "active"
                          ? "bg-brand-500 text-white"
                          : state === "completed"
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-surface-100 text-surface-400"
                      }`}
                    >
                      {state === "completed" ? (
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <Icon className="h-3.5 w-3.5" />
                      )}
                    </div>

                    <div className="flex-1">
                      <span className="block leading-tight">{step.label}</span>
                      <span
                        className={`text-[10px] ${
                          state === "active"
                            ? "text-brand-500"
                            : "text-surface-400"
                        }`}
                      >
                        {step.codename}
                      </span>
                    </div>

                    {/* Connecting line (except last) */}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* ── TOOLS ───────────────────────────────────────────── */}
          <div className="mb-6">
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-surface-400">
              Tools
            </span>
            <nav className="space-y-1">
              {TOOLS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? "bg-brand-50 text-brand-900"
                        : "text-surface-500 hover:bg-surface-50 hover:text-surface-700"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? "text-brand-500" : ""}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* ── ADMIN ───────────────────────────────────────────── */}
          <div className="mb-6">
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-surface-400">
              Admin
            </span>
            <nav className="space-y-1">
              {ADMIN.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? "bg-brand-50 text-brand-900"
                        : "text-surface-500 hover:bg-surface-50 hover:text-surface-700"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? "text-brand-500" : ""}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* ── Bottom badge ─────────────────────────────────────── */}
          <div className="border-t border-surface-100 pt-4">
            <div className="flex items-center gap-2 text-[11px] text-surface-400">
              <span className="inline-flex gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF9933]" />
                <span className="h-1.5 w-1.5 rounded-full bg-surface-300" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#138808]" />
              </span>
              Sovereign AI
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
