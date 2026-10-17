import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate: bounce signed-out visitors away from private areas
 * before any rendering. The real checks (session validity, role, house
 * scope) still run on the server for every page, action and command.
 */
export function proxy(req: NextRequest) {
  if (!req.cookies.has("sc_session")) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/account/:path*", "/me/:path*"] };
