/* Lightweight PoC session — role-based portal access (RBAC).
 * Stage-2 replaces this with server-side sessions + Udyam-verified identity. */

export type Role = "mse" | "admin";

export interface Session {
  role: Role;
  name: string;
  loginAt: number;
}

const KEY = "agentmap_session";

/** Demo portal credentials (PoC only — not a production auth system). */
export const DEMO_CREDENTIALS: Record<Role, { id: string; passcode: string }> = {
  mse: { id: "mse@demo", passcode: "bharat123" },
  admin: { id: "nsic@demo", passcode: "nsic123" },
};

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (s.role !== "mse" && s.role !== "admin") return null;
    return s;
  } catch {
    return null;
  }
}

export function login(role: Role, name: string): Session {
  const session: Session = { role, name, loginAt: Date.now() };
  window.localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  window.localStorage.removeItem(KEY);
}

/** Routes only NSIC administrators may open. */
export const ADMIN_ONLY = ["/review", "/audit"];

export function canAccess(session: Session | null, pathname: string): boolean {
  if (!session) return false;
  if (session.role === "admin") return true;
  return !ADMIN_ONLY.some((p) => pathname.startsWith(p));
}
