import {
  DEFAULT_AUTHENTICATED_PATH,
  normalizeRedirectPath,
} from "./auth-redirect";

const publicRoutes = [
  "/",
  "/auth",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/about",
  "/privacy",
  "/terms",
];

const protectedPrefixes = [
  "/dashboard",
  "/profile",
  "/learning-path",
  "/learn",
  "/courses",
  "/vocabulary",
  "/grammar",
  "/reading",
  "/listening",
  "/speaking",
  "/writing",
  "/community",
  "/arena",
  "/leaderboard",
  "/notifications",
  "/settings",
  "/progress",
  "/history",
  "/achievements",
  "/analytics",
  "/reports",
  "/missions",
  "/search",
  "/placement",
  "/lesson-builder",
  "/study-rooms",
  "/admin",
];

type AuthRouteInput = {
  pathname: string;
  search: string;
  isLoggedIn: boolean;
};

type AuthRouteDecision =
  | { type: "next" }
  | { type: "redirect"; href: string };

function isPublicRoute(pathname: string) {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isProtectedRoute(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// The app runs with `trailingSlash: true` (next.config.ts), so
// `request.nextUrl.pathname` seen by middleware is `/login/`, not `/login`.
// Strip a single trailing slash (but keep "/" itself) before any exact-match
// comparison so this policy works the same whether or not a trailing slash
// is present.
function stripTrailingSlash(pathname: string) {
  return pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}

export function getAuthRouteDecision({
  pathname: rawPathname,
  search,
  isLoggedIn,
}: AuthRouteInput): AuthRouteDecision {
  const pathname = stripTrailingSlash(rawPathname);

  if (isLoggedIn && ["/auth", "/login", "/register"].includes(pathname)) {
    const params = new URLSearchParams(search);
    return {
      type: "redirect",
      href: normalizeRedirectPath(params.get("redirect")),
    };
  }

  if (!isLoggedIn && isProtectedRoute(pathname) && !isPublicRoute(pathname)) {
    const params = new URLSearchParams();
    params.set("redirect", `${pathname}${search}`);
    return {
      type: "redirect",
      href: `/login?${params.toString()}`,
    };
  }

  return { type: "next" };
}

export { DEFAULT_AUTHENTICATED_PATH };
