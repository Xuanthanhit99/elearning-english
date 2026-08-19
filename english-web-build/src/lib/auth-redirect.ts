export const DEFAULT_AUTHENTICATED_PATH = "/dashboard";
export const LOGIN_PATH = "/login";

const BLOCKED_PREFIXES = ["/auth", "/login", "/register"];

// Placeholder base for resolving a relative candidate through the URL
// parser so we can inspect its origin/pathname safely. Must stay lowercase:
// URL always normalizes the *parsed* origin's hostname to lowercase, so
// comparing against a mixed-case literal here would never match and would
// silently reject every candidate.
const SAFE_ORIGIN = "https://beaconvie.local";

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
    const parsed = new URL(candidate, SAFE_ORIGIN);
    if (parsed.origin !== SAFE_ORIGIN) return false;
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
