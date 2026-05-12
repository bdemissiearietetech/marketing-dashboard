import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const UNAUTHORIZED = new NextResponse("Authentication required", {
  status: 401,
  headers: { "WWW-Authenticate": 'Basic realm="Marketing Dashboard", charset="UTF-8"' },
});

export default function middleware(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;

  if (user && pass) {
    const header = request.headers.get("authorization");
    if (!header?.startsWith("Basic ")) return UNAUTHORIZED.clone();

    let decoded: string;
    try {
      decoded = atob(header.slice(6));
    } catch {
      return UNAUTHORIZED.clone();
    }

    const sep = decoded.indexOf(":");
    const u = sep === -1 ? decoded : decoded.slice(0, sep);
    const p = sep === -1 ? "" : decoded.slice(sep + 1);
    if (u !== user || p !== pass) return UNAUTHORIZED.clone();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
