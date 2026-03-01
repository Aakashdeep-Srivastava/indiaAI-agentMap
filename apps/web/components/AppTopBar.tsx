"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/register": "MSE Registration",
  "/classify": "Domain Classification",
  "/match": "SNP Matching",
  "/review": "Review Queue",
  "/audit": "Audit Trail",
  "/upload": "Upload Taxonomy",
};

export default function AppTopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-surface-200 bg-white/80 px-5 backdrop-blur">
      <button
        onClick={onMenuClick}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-700 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="font-display text-sm font-bold text-brand-900">
        {title}
      </h1>
    </header>
  );
}
