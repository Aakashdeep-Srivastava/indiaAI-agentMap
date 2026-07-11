"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  UserPlus,
  Layers,
  GitMerge,
  ClipboardList,
  Shield,
  ShieldCheck,
  Store,
  LogOut,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  PackageOpen,
} from "lucide-react";
import { getSession, logout, type Session } from "@/lib/auth";

/* ── Journey steps (Sathi → VargBot → JodakAI) ──────────────── */
const JOURNEY = [
  { label: "Register", codename: "Sathi", href: "/register", icon: UserPlus },
  { label: "Classify", codename: "VargBot", href: "/classify", icon: Layers },
  { label: "Match", codename: "JodakAI", href: "/match", icon: GitMerge },
  { label: "Catalogue", codename: "ONDC-ready", href: "/catalogue", icon: PackageOpen },
] as const;

/* ── NSIC officer navigation (oversight-first — a different job entirely) ── */
const OVERSIGHT = [
  { label: "Review Queue", desc: "Approve registrations", href: "/review", icon: ClipboardList },
  { label: "SNP Allocation", desc: "Official mapping", href: "/allocate", icon: GitMerge },
  { label: "Claims Copilot", desc: "TEAM incentive claims", href: "/claims", icon: ShieldCheck },
  { label: "Audit Trail", desc: "Every AI decision", href: "/audit", icon: Shield },
] as const;

const ADMIN_AI_TOOLS = [
  { label: "Classify", desc: "VargBot spot-check", href: "/classify", icon: Layers },
  { label: "Match", desc: "JodakAI spot-check", href: "/match", icon: GitMerge },
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
  collapsed = false,
  onToggleCollapse,
}: {
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mseId = searchParams.get("mseId");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    setSession(getSession());
  }, [pathname]);

  const isAdmin = session?.role === "admin";

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  /* Logged-in owners are already registered — Register is only for visitors */
  const journeySteps = session
    ? JOURNEY.filter((s) => s.href !== "/register")
    : JOURNEY;

  /* Which journey step is active? */
  const activeJourneyIndex = journeySteps.findIndex((s) =>
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
        className={`fixed top-0 left-0 z-50 flex h-full flex-col border-r border-surface-200 bg-white transition-all duration-300 lg:translate-x-0 ${
          collapsed ? "w-64 lg:w-[72px]" : "w-64"
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* ── Logo ──────────────────────────────────────────────── */}
        <div className={`flex h-14 shrink-0 items-center border-b border-surface-100 ${collapsed ? "justify-center px-2 lg:flex-col lg:h-auto lg:gap-1 lg:py-2" : "justify-between px-5"}`}>
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo-mark.png"
              alt="MSMEMate — two entrepreneurs joining hands"
              width={28}
              height={28}
              className="h-7 w-7 rounded-md"
            />
            {!collapsed && (
              <span className="font-display text-sm font-bold tracking-tight text-brand-900">
                MSME<span className="text-brand-500">Mate</span>
              </span>
            )}
          </Link>
          {/* Desktop collapse toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden h-7 w-7 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 lg:flex"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Content (scrollbar hidden) ──────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-5 sidebar-no-scrollbar">
          {/* MSE Context Card */}
          {!isAdmin && mseId && (
            <div className={`mb-5 rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3 ${collapsed ? "lg:hidden" : ""}`}>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                Active MSE
              </span>
              <p className="mt-0.5 font-mono text-sm font-bold text-brand-900">
                MSE #{mseId}
              </p>
            </div>
          )}

          {/* ── JOURNEY (entrepreneur onboarding path — MSE role only) ── */}
          {!isAdmin && (
          <div className="mb-6">
            <span className={`mb-2 block text-[10px] font-semibold uppercase tracking-widest text-surface-400 ${collapsed ? "lg:hidden" : ""}`}>
              Journey
            </span>
            <nav className="space-y-1">
              {journeySteps.map((step, i) => {
                const state = getStepState(i, activeJourneyIndex);
                const Icon = step.icon;
                return (
                  <Link
                    key={step.href}
                    href={journeyHref(step.href)}
                    onClick={onClose}
                    title={`${step.label} · ${step.codename}`}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${collapsed ? "lg:justify-center lg:px-0" : ""} ${
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

                    <div className={`flex-1 ${collapsed ? "lg:hidden" : ""}`}>
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

          )}

          {/* ── NSIC OFFICER NAV (oversight-first — different job, different nav) ── */}
          {isAdmin && (
            <>
              <div className="mb-6">
                <span className={`mb-2 block text-[10px] font-semibold uppercase tracking-widest text-brand-500 ${collapsed ? "lg:hidden" : ""}`}>
                  Oversight
                </span>
                <nav className="space-y-1">
                  {OVERSIGHT.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        title={item.label}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${collapsed ? "lg:justify-center lg:px-0" : ""} ${
                          active
                            ? "bg-brand-50 text-brand-900"
                            : "text-surface-500 hover:bg-surface-50 hover:text-surface-700"
                        }`}
                      >
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${active ? "bg-brand-500 text-white" : "bg-surface-100 text-surface-400"}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className={`flex-1 ${collapsed ? "lg:hidden" : ""}`}>
                          <span className="block leading-tight">{item.label}</span>
                          <span className={`text-[10px] ${active ? "text-brand-500" : "text-surface-400"}`}>
                            {item.desc}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </nav>
              </div>
              <div className="mb-6">
                <span className={`mb-2 block text-[10px] font-semibold uppercase tracking-widest text-surface-400 ${collapsed ? "lg:hidden" : ""}`}>
                  AI Tools
                </span>
                <nav className="space-y-1">
                  {ADMIN_AI_TOOLS.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        title={item.label}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${collapsed ? "lg:justify-center lg:px-0" : ""} ${
                          active
                            ? "bg-brand-50 text-brand-900"
                            : "text-surface-500 hover:bg-surface-50 hover:text-surface-700"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${active ? "text-brand-500" : ""}`} />
                        <div className={`flex-1 ${collapsed ? "lg:hidden" : ""}`}>
                          <span className="block leading-tight">{item.label}</span>
                          <span className="text-[10px] text-surface-400">{item.desc}</span>
                        </div>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* ── Signed-in identity (role-coloured) ──────────────── */}
          {session && (
            <div
              className={`mb-4 flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${collapsed ? "lg:flex-col lg:gap-1.5 lg:px-1.5" : ""} ${
                session.role === "admin"
                  ? "border-brand-100 bg-brand-50/60"
                  : "border-saffron-400/30 bg-saffron-500/5"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  session.role === "admin" ? "bg-brand-500" : "bg-saffron-500"
                }`}
              >
                {session.role === "admin" ? (
                  <ShieldCheck className="h-4 w-4 text-white" />
                ) : (
                  <Store className="h-4 w-4 text-white" />
                )}
              </div>
              <div className={`min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}>
                <p className="truncate text-xs font-semibold text-brand-900">
                  {session.name}
                </p>
                <span
                  className={`mt-0.5 inline-block rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wider ${
                    session.role === "admin"
                      ? "bg-brand-500/10 text-brand-500"
                      : "bg-saffron-500/10 text-saffron-500"
                  }`}
                >
                  {session.role === "admin" ? "NSIC Administrator" : "MSE Owner"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-surface-100 hover:text-red-500"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* ── Bottom badge ─────────────────────────────────────── */}
          <div className="border-t border-surface-100 pt-4">
            <div className={`flex items-center gap-2 text-[11px] text-surface-400 ${collapsed ? "lg:justify-center" : ""}`}>
              <span className="inline-flex gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF9933]" />
                <span className="h-1.5 w-1.5 rounded-full bg-surface-300" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#138808]" />
              </span>
              <span className={collapsed ? "lg:hidden" : ""}>Sovereign AI</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
