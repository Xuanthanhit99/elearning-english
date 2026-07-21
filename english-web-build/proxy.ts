import { NextRequest, NextResponse } from "next/server";
import { getAuthRouteDecision } from "./src/lib/auth-route-policy";

const AUTH_COOKIE = "logged_in";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isLoggedIn = request.cookies.get(AUTH_COOKIE)?.value === "true";
  const decision = getAuthRouteDecision({ pathname, search, isLoggedIn });

  if (decision.type === "redirect") {
    return NextResponse.redirect(new URL(decision.href, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
