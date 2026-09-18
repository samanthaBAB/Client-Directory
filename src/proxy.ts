import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isLoginPage = pathname.startsWith("/login");
  const isChangePwPage = pathname.startsWith("/change-password");
  const isApiRoute = pathname.startsWith("/api");

  if (!isLoggedIn && isApiRoute) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  if (isLoggedIn && req.auth?.user.mustChangePw && !isChangePwPage) {
    return NextResponse.redirect(new URL("/change-password", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|apple-touch-icon.png).*)",
  ],
};
