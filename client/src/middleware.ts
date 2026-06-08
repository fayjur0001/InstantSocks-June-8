import { NextRequest, NextResponse } from "next/server";

// Server TOKEN_NAME_SALT এর সাথে sync — NEXT_PUBLIC_ prefix দিয়ে
// .env তে:  TOKEN_NAME_SALT=xyz  (server)
//           NEXT_PUBLIC_TOKEN_NAME_SALT=xyz  (client/middleware)
const TOKEN_NAME_SALT = process.env.NEXT_PUBLIC_TOKEN_NAME_SALT || "auth";
const TOKEN_COOKIE_NAME = `${TOKEN_NAME_SALT}-token`;

const PROTECTED_USER_ROUTES  = ["/user"];
const PROTECTED_ADMIN_ROUTES = ["/admin"];

// Edge runtime এ `jose` দিয়ে JWT verify — `jsonwebtoken` Node.js-only
interface JWTPayload {
  id: number;
  username: string;
  role: "general" | "support" | "admin" | "super admin";
  isShadowAdmin?: boolean;
}

async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const { jwtVerify } = await import("jose");
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as JWTPayload;
  } catch {
    // expired, tampered, বা invalid
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;

  // cookie থাকলেই logged-in না — JWT verify + payload decode
  const jwtPayload = token ? await verifyJWT(token) : null;
  const isLoggedIn = jwtPayload !== null;

  // Shadow routing must trust only the signed JWT payload. The helper
  // is-shadow-session cookie can become stale and incorrectly block /admin.
  const isShadowSession = jwtPayload?.isShadowAdmin === true;

  // Root "/" — logged in হলে role অনুযায়ী dashboard, না হলে login
  if (pathname === "/") {
    if (isLoggedIn) {
      const role = jwtPayload?.role;
      // support/general/shadow session → user dashboard
      // admin/super admin → admin dashboard
      const dest =
        isShadowSession || role === "general" || role === "support" || !role
          ? "/user/dashboard"
          : "/admin/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ✅ FIX: Shadow session এ /admin যেকোনো route block — browser back button ও কাজ করবে না
  if (isShadowSession && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/user/dashboard", request.url));
  }

  // Protect /user/*
  if (PROTECTED_USER_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!isLoggedIn) {
      const url = new URL("/login", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Protect /admin/*
  if (PROTECTED_ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!isLoggedIn) {
      const url = new URL("/login/instants", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    const role = jwtPayload?.role;

    // support শুধু /admin/support এবং /admin/support/* এ ঢুকতে পারবে
    // বাকি /admin/* — user dashboard এ redirect
    if (role === "support") {
      const isSupportRoute =
        pathname === "/admin/support" ||
        pathname.startsWith("/admin/support/");
      if (!isSupportRoute) {
        return NextResponse.redirect(new URL("/user/dashboard", request.url));
      }
      return NextResponse.next();
    }

    // logged-in হলেও role check — general user /admin এ ঢুকতে পারবে না
    const isAdmin = role === "admin" || role === "super admin";
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/user/dashboard", request.url));
    }
  }

  // Already logged-in → auth pages থেকে redirect
  if (
    (pathname === "/login" ||
      pathname === "/login/instants" ||
      pathname === "/register" ||
      pathname === "/forgot-password" ||
      pathname === "/reset-password") &&
    isLoggedIn
  ) {
    // support/general/shadow session → user dashboard
    // admin/super admin → admin dashboard
    const role = jwtPayload?.role;
    const dest =
      isShadowSession || role === "general" || role === "support" || !role
        ? "/user/dashboard"
        : "/admin/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/user/:path*",
    "/admin/:path*",
    "/login",
    "/login/instants",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
