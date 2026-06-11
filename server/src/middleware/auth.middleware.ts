import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import db from "@/db";
import Payload from "@/types/payload.type";
import { Role } from "@/types/role.type";

// ─── Cookie name — server ও client দুইটাতেই একই env var থেকে আসবে ─────────
// Server  : TOKEN_NAME_SALT
// Client  : NEXT_PUBLIC_TOKEN_NAME_SALT  (same value, different prefix)
const TOKEN_NAME_SALT = process.env.TOKEN_NAME_SALT || "auth";
export const TOKEN_COOKIE_NAME = `${TOKEN_NAME_SALT}-token`;

// Production এ HTTPS বাধ্যতামূলক
const IS_PROD = process.env.NODE_ENV === "production";

// JWT lifetime — 30 দিন পর্যন্ত valid (rememberMe), default session 1 দিন
const JWT_DEFAULT_EXPIRY = "1d";
const JWT_REMEMBER_EXPIRY = "30d";

declare global {
  namespace Express {
    interface Request {
      payload?: Payload;
      token?: string;
    }
  }
}

export function getTokenFromRequest(req: Request): string | null {
  const token = req.cookies?.[TOKEN_COOKIE_NAME];
  return token ? String(token) : null;
}

export function getPayloadFromToken(token: string): Payload | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as Payload;
  } catch {
    // expired বা tampered — null return
    return null;
  }
}

export function attachAuth(req: Request, _res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);
  if (token) {
    req.token = token;
    const payload = getPayloadFromToken(token);
    if (payload) req.payload = payload;
  }
  next();
}

export function requireAuth(acceptedRoles: Role[] = []) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized (no token)." });
    }

    const payload = getPayloadFromToken(token);
    if (!payload) {
      // expired বা invalid
      return res.status(401).json({ success: false, message: "Unauthorized (invalid or expired token)." });
    }

    const user = await db.query.UserModel.findFirst({
      where: (m, { eq, and }) =>
        and(
          eq(m.id, payload.id),
          // ✅ FIX: role JWT থেকে match করা বন্ধ।
          // Admin যদি role change করে (general → support), DB তে role update হয়
          // কিন্তু JWT এ পুরনো role থাকে। eq(m.role, payload.role) condition এ
          // user not found → 401 → forced logout হয়ে যায়।
          // শুধু id + username দিয়ে identify করাই যথেষ্ট (username change হলে
          // auth.controller updateProfile এ JWT reissue হয়)।
          eq(m.username, payload.username)
        ),
      columns: { id: true, username: true, role: true, banned: true, bannedTill: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized (user not found)." });
    }

    // ✅ FIX: shadow admin session এ banned/suspended check skip করো।
    // Admin যখন banned user এ login as করে, তখন প্রতিটা API call এ
    // এই middleware চলে। banned check করলে 403 → client logout হয়ে যায়।
    // Shadow admin নিজেই authenticated admin — ban তার উপর apply হবে না।
    if (!payload.isShadowAdmin) {
      // Permanently banned
      if (user.banned) {
        return res.status(403).json({
          success: false,
          message: "Your account has been banned.",
          reason: "banned",
        });
      }

      // Temporarily suspended
      if (user.bannedTill && user.bannedTill > new Date()) {
        return res.status(403).json({
          success: false,
          message: `Your account is suspended until ${user.bannedTill.toUTCString()}.`,
          reason: "suspended",
          bannedTill: user.bannedTill,
        });
      }
    }

    // Shadow admin এর device check দরকার নেই
    if (!payload.isShadowAdmin) {
      const device = await db.query.UserDeviceModel.findFirst({
        where: (m, { eq, and }) =>
          and(eq(m.userId, payload.id), eq(m.token, payload.deviceToken!)),
        columns: { id: true },
      });
      if (!device) {
        return res.status(401).json({ success: false, message: "Unauthorized (invalid device)." });
      }
    }

    // ✅ FIX: DB থেকে fresh role নিয়ে payload update করো।
    // Role change হলে JWT এর stale role এর বদলে DB এর current role ব্যবহার হবে।
    // Shadow admin session এ JWT payload এর role ই valid — DB user এর role নয়।
    const freshPayload = payload.isShadowAdmin
      ? payload
      : { ...payload, role: user.role as typeof payload.role };

    if (acceptedRoles.length > 0 && !acceptedRoles.includes(freshPayload.role)) {
      return res.status(403).json({ success: false, message: "Forbidden." });
    }

    req.payload = freshPayload;
    req.token = token;
    next();
  };
}

export function setAuthCookie(res: Response, payload: Payload, days = 0): string {
  // ✅ FIX: JWT এ expiresIn যোগ করা হয়েছে — token নিজেও expire হবে
  const expiry = days ? JWT_REMEMBER_EXPIRY : JWT_DEFAULT_EXPIRY;
  const { exp, iat, nbf, ...signablePayload } = payload as Payload & {
    exp?: number;
    iat?: number;
    nbf?: number;
  };
  const token = jwt.sign(signablePayload, process.env.JWT_SECRET!, { expiresIn: expiry });

  const maxAge = days
    ? days * 24 * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000; // default 1 দিন

  res.cookie(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    // ✅ FIX: production এ secure: true — HTTPS only
    secure: IS_PROD,
    // ✅ FIX: production এ sameSite: "strict" — CSRF protection
    sameSite: IS_PROD ? "strict" : "lax",
    path: "/",
    maxAge,
  });

  if (payload.isShadowAdmin) {
    res.cookie("is-shadow-session", "1", {
      httpOnly: false,
      secure: IS_PROD,
      sameSite: IS_PROD ? "strict" : "lax",
      path: "/",
      maxAge,
    });
  } else {
    res.clearCookie("is-shadow-session", {
      path: "/",
      sameSite: IS_PROD ? "strict" : "lax",
      secure: IS_PROD,
    });
  }

  return token;
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(TOKEN_COOKIE_NAME, {
    path: "/",
    httpOnly: true,
    sameSite: IS_PROD ? "strict" : "lax",
    secure: IS_PROD,
  });
  res.clearCookie("is-shadow-session", {
    path: "/",
    sameSite: IS_PROD ? "strict" : "lax",
    secure: IS_PROD,
  });
}