import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import db from "@/db";
import Payload from "@/types/payload.type";
import { Role } from "@/types/role.type";


const TOKEN_NAME_SALT = process.env.TOKEN_NAME_SALT || "auth";
export const TOKEN_COOKIE_NAME = `${TOKEN_NAME_SALT}-token`;


const IS_PROD = process.env.NODE_ENV === "production";


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
      
      return res.status(401).json({ success: false, message: "Unauthorized (invalid or expired token)." });
    }

    const user = await db.query.UserModel.findFirst({
      where: (m, { eq, and }) =>
        and(
          eq(m.id, payload.id),
          
          
          
          
          
          
          eq(m.username, payload.username)
        ),
      columns: { id: true, username: true, role: true, banned: true, bannedTill: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized (user not found)." });
    }

    
    
    
    
    if (!payload.isShadowAdmin) {
      
      if (user.banned) {
        return res.status(403).json({
          success: false,
          message: "Your account has been banned.",
          reason: "banned",
        });
      }

      
      if (user.bannedTill && user.bannedTill > new Date()) {
        return res.status(403).json({
          success: false,
          message: `Your account is suspended until ${user.bannedTill.toUTCString()}.`,
          reason: "suspended",
          bannedTill: user.bannedTill,
        });
      }
    }

    
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
  
  const expiry = days ? JWT_REMEMBER_EXPIRY : JWT_DEFAULT_EXPIRY;
  const { exp, iat, nbf, ...signablePayload } = payload as Payload & {
    exp?: number;
    iat?: number;
    nbf?: number;
  };
  const token = jwt.sign(signablePayload, process.env.JWT_SECRET!, { expiresIn: expiry });

  const maxAge = days
    ? days * 24 * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000; 

  res.cookie(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    
    secure: IS_PROD,
    
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