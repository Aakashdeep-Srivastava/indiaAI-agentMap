"use client";

/* Shares the sidebar's collapsed state so content panels (e.g. the
 * registration form) can widen when the icon-rail frees up space. */

import { createContext, useContext } from "react";

export const SidebarCollapsedContext = createContext(false);

export function useSidebarCollapsed() {
  return useContext(SidebarCollapsedContext);
}
