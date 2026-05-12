import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { AUTH_COOKIE, hashPassword } from "@/lib/auth";

const intlMiddleware = createMiddleware(routing);

// Default locale (en) has no prefix; /it/* is the only prefixed locale.
const LOGIN_RE = /^\/(?:it\/)?login(?:\/|$)/;

function detectLocale(pathname: string): "it" | "en" {
  return pathname === "/it" || pathname.startsWith("/it/") ? "it" : "en";
}

export default async function middleware(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;

  // Gate is opt-in: leave DASHBOARD_PASSWORD empty on localhost to skip it.
  if (!password) return intlMiddleware(request);

  const { pathname } = request.nextUrl;
  if (LOGIN_RE.test(pathname)) return intlMiddleware(request);

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  const expected = await hashPassword(password);
  if (cookie === expected) return intlMiddleware(request);

  const locale = detectLocale(pathname);
  const url = request.nextUrl.clone();
  url.pathname = locale === "it" ? "/it/login" : "/login";
  url.search = "";
  if (pathname !== "/" && pathname !== "/it") {
    url.searchParams.set("from", pathname + request.nextUrl.search);
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
