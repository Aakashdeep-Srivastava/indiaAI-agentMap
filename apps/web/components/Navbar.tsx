"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  const [visible, setVisible] = useState(true);
  const [lastY, setLastY] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      // Show when scrolling up or near the top
      if (y < 60 || y < lastY) {
        setVisible(true);
      } else if (y > lastY + 5) {
        setVisible(false);
      }
      setLastY(y);
    };
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
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-5 py-2.5 backdrop-blur-2xl shadow-lg shadow-black/10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="AgentMap AI"
            width={32}
            height={32}
            className="h-8 w-8 invert brightness-200 drop-shadow-[0_0_10px_rgba(255,169,66,0.5)]"
          />
          <span className="font-display text-lg font-bold leading-tight tracking-tight text-saffron-400">
            AgentMap<span className="text-white">AI</span>
          </span>
        </Link>

        {/* Center nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {[
            { label: "Platform", href: "/match" },
            { label: "Classify", href: "/classify" },
            { label: "Upload", href: "/upload" },
            { label: "Solutions", href: "/#solutions" },
            { label: "About", href: "/#about" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right action — single CTA */}
        <Link
          href="/register"
          className="rounded-xl bg-saffron-500 px-5 py-2 text-xs font-semibold text-white transition-all hover:bg-saffron-600"
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}
