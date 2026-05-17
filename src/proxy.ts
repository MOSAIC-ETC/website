// Chains next-intl routing with Auth.js v5 access checks.
// Next.js 16 renamed `middleware.ts` to `proxy.ts`; the semantics are unchanged.
// The intl middleware handles locale prefix rewrites; we layer permission gates
// on top using the JWT carried by Auth.js.

import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { routing } from "@/i18n/routing";

const intl = createIntlMiddleware(routing);

const ADMIN_PATH_RE = /\/admin(\/|$)/;

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const isAdminPage = ADMIN_PATH_RE.test(path);
  const isAdminApi = path.startsWith("/api/admin");

  if ((isAdminPage || isAdminApi) && !req.auth) {
    if (isAdminApi) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // API routes (other than admin, already handled above) skip i18n routing.
  if (path.startsWith("/api")) return NextResponse.next();

  return intl(req);
});

export const config = {
  matcher: [
    // Skip Next internals, files with extensions, and public API routes
    // (auth handler, file streaming, manifest) that don't need locale routing.
    "/((?!_next|_vercel|favicon\\.ico|api/auth|api/files|api/manifest|api/invites|.*\\..*).*)",
    "/api/admin/:path*",
  ],
};
