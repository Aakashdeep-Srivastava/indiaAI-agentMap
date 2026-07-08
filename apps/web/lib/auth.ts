/* Real session handling — server-issued JWT, role signed into the token.
 * The role stored locally is a UI hint only; every API call is authorized
 * server-side against the Bearer token, so editing localStorage grants nothing. */

export type Role = "mse" | "admin";

export interface Session {
  token: string;
  role: Role;
  name: string;
  loginAt: number;
}

const KEY = "agentmap_session";

export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (!s.token || (s.role !== "mse" && s.role !== "admin")) return null;
    return s;
  } catch {
    return null;
  }
}

/** Authenticate against the backend. Throws Error with a human message on failure
 * (invalid credentials, attempts remaining, account lockout). */
export async function login(userId: string, passcode: string): Promise<Session> {
  let res: Response;
  try {
    res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: userId.trim().toLowerCase(), password: passcode }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Cannot reach the server. Please check your connection and try again.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.detail === "string" ? data.detail : "Sign-in failed. Please try again.",
    );
  }

  const session: Session = {
    token: data.access_token,
    role: data.role === "admin" ? "admin" : "mse",
    name: data.name ?? userId,
    loginAt: Date.now(),
  };
  window.localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}

/** Routes only NSIC administrators may open (UI hint — server enforces too). */
export const ADMIN_ONLY = ["/review", "/audit", "/allocate"];

export function canAccess(session: Session | null, pathname: string): boolean {
  if (!session) return false;
  if (session.role === "admin") return true;
  return !ADMIN_ONLY.some((p) => pathname.startsWith(p));
}

/** Central API fetch: base URL + Bearer token + timeout; expired/invalid
 * sessions are cleared and the user is sent back to the login page. */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
  timeoutMs = 30000,
): Promise<Response> {
  const session = getSession();
  const headers = new Headers(init.headers);
  if (session?.token) headers.set("Authorization", `Bearer ${session.token}`);

  const res = await fetch(path.startsWith("http") ? path : `${API}${path}`, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(timeoutMs),
  });

  if (res.status === 401 && session) {
    logout();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Session expired — please sign in again.");
  }
  return res;
}
