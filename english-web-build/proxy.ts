import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_AUTHENTICATED_PATH,
  normalizeRedirectPath,
} from "./src/lib/auth-redirect";

const AUTH_COOKIE = "logged_in";

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

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isLoggedIn = request.cookies.get(AUTH_COOKIE)?.value === "true";

  if (isLoggedIn && pathname === "/") {
    return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED_PATH, request.url));
  }

  if (isLoggedIn && ["/auth", "/login", "/register"].includes(pathname)) {
    const redirect = request.nextUrl.searchParams.get("redirect");
    const target = normalizeRedirectPath(redirect);
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (!isLoggedIn && isProtectedRoute(pathname) && !isPublicRoute(pathname)) {
    const loginUrl = new URL("/auth", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
