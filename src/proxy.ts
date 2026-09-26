import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isLoginPage = pathname.startsWith("/login");
  const isChangePwPage = pathname.startsWith("/change-password");
  const isApiRoute = pathname.startsWith("/api");
  // The public marketing/sign-up page and its contact-form endpoint — the
  // whole point is that a stranger with no account can load these.
  const isPublicMarketingRoute = pathname.startsWith("/get-started");
  const isContactApiRoute = pathname.startsWith("/api/contact");

  if (!isLoggedIn && isApiRoute && !isContactApiRoute) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isLoggedIn && !isLoginPage && !isPublicMarketingRoute && !isContactApiRoute) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  if (isLoggedIn && req.auth?.user.mustChangePw && !isChangePwPage) {
    return NextResponse.redirect(new URL("/change-password", req.nextUrl));
  }

  const isSuperAdmin = req.auth?.user.role === "SUPER_ADMIN";
  const isAdminRoute = pathname.startsWith("/admin");

  if (isLoggedIn && isSuperAdmin && pathname === "/") {
    return NextResponse.redirect(new URL("/admin", req.nextUrl));
  }
  if (isLoggedIn && !isSuperAdmin && isAdminRoute) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|apple-touch-icon.png).*)",
  ],
};
