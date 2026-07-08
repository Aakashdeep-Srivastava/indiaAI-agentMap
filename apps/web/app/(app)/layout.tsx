"use client";

import { useEffect, useState } from "react";
import { Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import { canAccess, getSession } from "@/lib/auth";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [authed, setAuthed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  /* Portal gate — everyone signs in at /login; MSE users can't open admin pages.
   * Exception: /register is PUBLIC — a brand-new MSE has no account yet
   * (PS2 voice-first onboarding is the entry point, not a logged-in feature). */
  useEffect(() => {
    const session = getSession();
    if (pathname.startsWith("/register")) {
      setAuthed(true);
      return;
    }
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!canAccess(session, pathname)) {
      router.replace("/register");
      return;
    }
    setAuthed(true);
  }, [router, pathname]);

  if (!authed) {
    return <div className="h-screen bg-surface-50" />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />
      <div className={`flex flex-1 flex-col ${collapsed ? "lg:ml-[72px]" : "lg:ml-64"}`}>
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
