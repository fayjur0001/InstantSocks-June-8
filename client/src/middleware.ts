import { NextRequest, NextResponse } from "next/server";


const TOKEN_NAME_SALT = process.env.NEXT_PUBLIC_TOKEN_NAME_SALT || "auth";
const TOKEN_COOKIE_NAME = `${TOKEN_NAME_SALT}-token`;

const PROTECTED_USER_ROUTES  = ["/user"];
const PROTECTED_ADMIN_ROUTES = ["/admin"];


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
    
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;

  
  const jwtPayload = token ? await verifyJWT(token) : null;
  const isLoggedIn = jwtPayload !== null;

  
  
  const isShadowSession = jwtPayload?.isShadowAdmin === true;

  
  if (pathname === "/") {
    if (isLoggedIn) {
      const role = jwtPayload?.role;
      
      
      const dest =
        isShadowSession || role === "general" || role === "support" || !role
          ? "/user/dashboard"
          : "/admin/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  
  if (isShadowSession && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/user/dashboard", request.url));
  }

  
  if (PROTECTED_USER_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!isLoggedIn) {
      const url = new URL("/login", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  
  if (PROTECTED_ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!isLoggedIn) {
      const url = new URL("/login/instants", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    const role = jwtPayload?.role;

    
    
    if (role === "support") {
      const isSupportRoute =
        pathname === "/admin/support" ||
        pathname.startsWith("/admin/support/") ||
        pathname === "/admin/profile";
      if (!isSupportRoute) {
        return NextResponse.redirect(new URL("/user/dashboard", request.url));
      }
      return NextResponse.next();
    }

    
    const isAdmin = role === "admin" || role === "super admin";
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/user/dashboard", request.url));
    }
  }

  
  if (
    (pathname === "/login" ||
      pathname === "/login/instants" ||
      pathname === "/register" ||
      pathname === "/forgot-password" ||
      pathname === "/reset-password") &&
    isLoggedIn
  ) {
    
    
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