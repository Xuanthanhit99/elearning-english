export const DEFAULT_AUTHENTICATED_PATH = "/dashboard";
export const LOGIN_PATH = "/auth";

const BLOCKED_PREFIXES = ["/auth", "/login", "/register"];

function decodeOnce(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function candidatePath(value: string | null | undefined) {
  if (!value) return null;
  if (value.startsWith("/")) return value;

  const decoded = decodeOnce(value);
  return decoded.startsWith("/") ? decoded : value;
}

export function isSafeRedirectPath(value: string | null | undefined) {
  const candidate = candidatePath(value);

  if (!candidate) return false;
  if (!candidate.startsWith("/")) return false;
  if (candidate.startsWith("//")) return false;
  if (
    candidate.includes("\\") ||
    candidate.includes("\n") ||
    candidate.includes("\r")
  ) {
    return false;
  }

  try {
    const parsed = new URL(candidate, "https://lumiverse.local");
    if (parsed.origin !== "https://lumiverse.local") return false;
    return !BLOCKED_PREFIXES.some((prefix) => parsed.pathname.startsWith(prefix));
  } catch {
    return false;
  }
}

export function normalizeRedirectPath(value: string | null | undefined): string {
  const candidate = candidatePath(value);
  return isSafeRedirectPath(candidate) && candidate
    ? candidate
    : DEFAULT_AUTHENTICATED_PATH;
}

export function buildLoginUrl(destination?: string | null) {
  if (!destination || !isSafeRedirectPath(destination)) return LOGIN_PATH;
  return `${LOGIN_PATH}?redirect=${encodeURIComponent(destination)}`;
}
