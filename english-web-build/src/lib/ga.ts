// Thin wrapper around the GA4 gtag() call already initialized in
// app/layout.tsx. No-ops on the server and when gtag hasn't loaded yet
// (blocked by an ad blocker, script still loading, etc.) so callers never
// need to guard for that themselves.
//
// Event params must never carry PII (email, full name, tokens, message or
// submission content) — see docs brief. Stick to non-identifying context
// like `source`, `route`, `skill`, `level`.

type GtagEventParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params?: GtagEventParams) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", name, params);
}
