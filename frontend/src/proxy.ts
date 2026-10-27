import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // This quick check is only for redirects; Django still verifies the session.
  const hasSessionCookie = Boolean(request.cookies.get("sessionid")?.value);
  if (hasSessionCookie) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

// Only protected ERP pages need the quick session-cookie check.
export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/inventory/:path*",
    "/sales/:path*",
    "/purchasing/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
};
