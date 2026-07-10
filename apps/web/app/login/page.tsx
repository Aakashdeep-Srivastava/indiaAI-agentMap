"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Store, ShieldCheck, LogIn, KeyRound, User } from "lucide-react";
import { apiFetch, getSession, login, type Role } from "@/lib/auth";

/** Demo usernames shown as a hint — passcodes are issued separately (never shipped in the bundle). */
const DEMO_IDS: Record<Role, string> = { mse: "mse@msmemate.com", admin: "nsic@msmemate.com" };

const ROLES: {
  role: Role;
  label: string;
  labelHi: string;
  desc: string;
  icon: typeof Store;
}[] = [
  {
    role: "mse",
    label: "MSE Owner",
    labelHi: "उद्यमी",
    desc: "Register your enterprise and find your seller platform",
    icon: Store,
  },
  {
    role: "admin",
    label: "NSIC Administrator",
    labelHi: "प्रशासक",
    desc: "Review AI decisions, audit trail and match oversight",
    icon: ShieldCheck,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("mse");
  const [userId, setUserId] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  /* Already signed in? Straight to the app. */
  useEffect(() => {
    const s = getSession();
    if (s) router.replace(s.role === "admin" ? "/review" : "/classify");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!userId.trim() || !passcode) {
      setError("Please enter your user ID and passcode.");
      return;
    }
    setBusy(true);
    try {
      const session = await login(userId, passcode);
      if (session.role === "admin") {
        router.replace("/review");
      } else {
        // Registered business? Continue the journey at Classify; else Register.
        const me = await apiFetch(`/auth/me`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        router.replace(me?.mse_id ? "/classify" : "/register");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Tricolour top bar */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-[3px]">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* ── Brand panel ─────────────────────────────────────────── */}
      <div className="relative flex flex-col justify-between bg-brand-900 px-10 py-12 lg:w-[44%]">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="MSMEMate"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <span className="font-display text-xl font-bold text-saffron-400">
            MSME<span className="text-white">Mate</span>
          </span>
        </Link>

        <div className="py-16 lg:py-0">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-3xl font-extrabold leading-tight text-white lg:text-4xl"
          >
            One portal.
            <br />
            <span className="text-saffron-400">Every doorway to ONDC.</span>
          </motion.h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
            Enterprises register in their own language. Administrators oversee
            every AI decision. One secure entry point for both.
          </p>
        </div>

        <p className="text-[11px] tracking-wide text-white/40">
          Bridging Bharat&apos;s Businesses · भारत के व्यवसायों को जोड़ना
        </p>
      </div>

      {/* ── Login card ──────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-surface-50 px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-md"
        >
          <h2 className="font-display text-xl font-bold text-brand-900">
            Sign in to continue
          </h2>
          <p className="mt-1 text-sm text-surface-500">
            Choose your role — one portal for enterprises and administrators.
          </p>

          {/* Role selector */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const active = role === r.role;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => {
                    setRole(r.role);
                    setError("");
                  }}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    active
                      ? "border-brand-500 bg-brand-50 shadow-sm"
                      : "border-surface-200 bg-white hover:border-surface-300"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      active ? "text-brand-500" : "text-surface-400"
                    }`}
                  />
                  <div className="mt-2 text-sm font-semibold text-brand-900">
                    {r.label}{" "}
                    <span className="font-normal text-surface-400">
                      · {r.labelHi}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] leading-snug text-surface-500">
                    {r.desc}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Credentials form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-surface-500">
                User ID
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder={DEMO_IDS[role]}
                  autoComplete="username"
                  className="input-field w-full pl-10"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-surface-500">
                Passcode
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="input-field w-full pl-10"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* New-enterprise registration — PS2 entry point, no account needed */}
          <div className="mt-6 rounded-2xl border border-saffron-400/40 bg-saffron-500/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-brand-900">
                  New enterprise? Register free
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-surface-500">
                  Voice-first, in your language — no account needed.
                  नया उद्यम? बोलकर रजिस्टर करें।
                </p>
              </div>
              <Link href="/register" className="btn-saffron shrink-0 !px-4 !py-2 !text-xs">
                Register →
              </Link>
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
