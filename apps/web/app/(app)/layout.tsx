"use client";

import { useState } from "react";
import { Suspense } from "react";
import { Menu } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col lg:ml-64">
        {/* Mobile-only hamburger */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-30 flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 bg-white shadow-sm lg:hidden"
        >
          <Menu className="h-4 w-4 text-surface-600" />
        </button>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <AppLayoutInner>{children}</AppLayoutInner>
    </Suspense>
  );
}
