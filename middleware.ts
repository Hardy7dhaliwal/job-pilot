import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Route guard. Everything requires a valid session except:
 * - /login and /api/auth/* (so you can actually log in)
 * - Next.js internals and static assets (excluded via `matcher` below)
 *
 * Runs on the Edge runtime — lib/auth.ts uses WebCrypto only, so it is
 * safe to import here.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname === "/login" || pathname.startsWith("/api/auth/");

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = await verifySessionToken(token);

  if (!authed && !isPublic) {
    // API calls get a JSON 401; page navigations get redirected to /login.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Already logged in and visiting /login → send to dashboard.
  if (authed && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Skip _next internals, static files (anything with an extension), favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
