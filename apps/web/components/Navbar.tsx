"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "Platform", href: "/match" },
  { label: "Classify", href: "/classify" },
  { label: "Register", href: "/register" },
  { label: "Blog", href: "/blog" },
  { label: "Solutions", href: "/#solutions" },
  { label: "About", href: "/#about" },
];

export default function Navbar() {
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastY, setLastY] = useState(0);
  const pathname = usePathname();
  /* The landing page opens on a dark hero; inner marketing pages sit on a
   * light surface — the navbar adapts its scheme to stay legible. */
  const light =
    pathname.startsWith("/blog") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/dpdp") ||
    pathname.startsWith("/sovereign-ai") ||
    pathname.startsWith("/ondc");

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      // Show when scrolling up or near the top
      if (y < 60 || y < lastY) {
        setVisible(true);
      } else if (y > lastY + 5) {
        setVisible(false);
      }
      setScrolled(y > 40);
      setLastY(y);
    };
    setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastY]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-3 transition-all duration-500 ease-in-out ${
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0"
      }`}
    >
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between rounded-2xl border px-5 py-2.5 transition-colors duration-300 ${
          light
            ? "border-surface-200 bg-white/85 shadow-lg shadow-brand-900/5 backdrop-blur-2xl"
            : scrolled
              ? "border-white/10 bg-brand-900/85 shadow-lg shadow-black/10 backdrop-blur-2xl"
              : "border-transparent bg-transparent shadow-none"
        }`}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo-mark.png"
            alt="MSMEMate — two entrepreneurs joining hands"
            width={32}
            height={32}
            className={`h-8 w-8 rounded-lg ${
              light ? "" : "drop-shadow-[0_0_10px_rgba(255,169,66,0.45)]"
            }`}
          />
          <span
            className={`font-display text-lg font-bold leading-tight tracking-tight ${
              light ? "text-brand-900" : "text-saffron-400"
            }`}
          >
            MSME
            <span className={light ? "text-brand-500" : "text-white"}>
              Mate
            </span>
          </span>
        </Link>

        {/* Center nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                light
                  ? "text-surface-600 hover:bg-surface-100 hover:text-brand-900"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Mobile menu toggle — the center nav is hidden below md */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors md:hidden ${
              light
                ? "text-surface-600 hover:bg-surface-100"
                : "text-white/80 hover:bg-white/10"
            }`}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <Link
            href="/login"
            className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:px-4 ${
              light
                ? "text-surface-600 hover:bg-surface-100 hover:text-brand-900"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="whitespace-nowrap rounded-xl bg-saffron-500 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-saffron-600 sm:px-5"
          >
            Get Started
          </Link>
        </div>
      </div>

      {/* Mobile dropdown — solid panel so it stays readable over the hero */}
      {menuOpen && (
        <nav
          className={`mx-auto mt-2 max-w-7xl rounded-2xl border p-2 shadow-lg backdrop-blur-2xl md:hidden ${
            light
              ? "border-surface-200 bg-white/95"
              : "border-white/10 bg-brand-900/95"
          }`}
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                light
                  ? "text-surface-600 hover:bg-surface-100 hover:text-brand-900"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
