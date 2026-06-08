"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOKEN_COOKIE_NAME = void 0;
exports.getTokenFromRequest = getTokenFromRequest;
exports.getPayloadFromToken = getPayloadFromToken;
exports.attachAuth = attachAuth;
exports.requireAuth = requireAuth;
exports.setAuthCookie = setAuthCookie;
exports.clearAuthCookie = clearAuthCookie;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("@/db"));
// ─── Cookie name — server ও client দুইটাতেই একই env var থেকে আসবে ─────────
// Server  : TOKEN_NAME_SALT
// Client  : NEXT_PUBLIC_TOKEN_NAME_SALT  (same value, different prefix)
const TOKEN_NAME_SALT = process.env.TOKEN_NAME_SALT || "auth";
exports.TOKEN_COOKIE_NAME = `${TOKEN_NAME_SALT}-token`;
// Production এ HTTPS বাধ্যতামূলক
const IS_PROD = process.env.NODE_ENV === "production";
// JWT lifetime — 30 দিন পর্যন্ত valid (rememberMe), default session 1 দিন
const JWT_DEFAULT_EXPIRY = "1d";
const JWT_REMEMBER_EXPIRY = "30d";
function getTokenFromRequest(req) {
    const token = req.cookies?.[exports.TOKEN_COOKIE_NAME];
    return token ? String(token) : null;
}
function getPayloadFromToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
    }
    catch {
        // expired বা tampered — null return
        return null;
    }
}
function attachAuth(req, _res, next) {
    const token = getTokenFromRequest(req);
    if (token) {
        req.token = token;
        const payload = getPayloadFromToken(token);
        if (payload)
            req.payload = payload;
    }
    next();
}
function requireAuth(acceptedRoles = []) {
    return async (req, res, next) => {
        const token = getTokenFromRequest(req);
        if (!token) {
            return res.status(401).json({ success: false, message: "Unauthorized (no token)." });
        }
        const payload = getPayloadFromToken(token);
        if (!payload) {
            // expired বা invalid
            return res.status(401).json({ success: false, message: "Unauthorized (invalid or expired token)." });
        }
        const user = await db_1.default.query.UserModel.findFirst({
            where: (m, { eq, and }) => and(eq(m.id, payload.id), eq(m.role, payload.role), eq(m.username, payload.username)),
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
            const device = await db_1.default.query.UserDeviceModel.findFirst({
                where: (m, { eq, and }) => and(eq(m.userId, payload.id), eq(m.token, payload.deviceToken)),
                columns: { id: true },
            });
            if (!device) {
                return res.status(401).json({ success: false, message: "Unauthorized (invalid device)." });
            }
        }
        if (acceptedRoles.length > 0 && !acceptedRoles.includes(payload.role)) {
            return res.status(403).json({ success: false, message: "Forbidden." });
        }
        req.payload = payload;
        req.token = token;
        next();
    };
}
function setAuthCookie(res, payload, days = 0) {
    // ✅ FIX: JWT এ expiresIn যোগ করা হয়েছে — token নিজেও expire হবে
    const expiry = days ? JWT_REMEMBER_EXPIRY : JWT_DEFAULT_EXPIRY;
    const { exp, iat, nbf, ...signablePayload } = payload;
    const token = jsonwebtoken_1.default.sign(signablePayload, process.env.JWT_SECRET, { expiresIn: expiry });
    const maxAge = days
        ? days * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000; // default 1 দিন
    res.cookie(exports.TOKEN_COOKIE_NAME, token, {
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
    }
    else {
        res.clearCookie("is-shadow-session", {
            path: "/",
            sameSite: IS_PROD ? "strict" : "lax",
            secure: IS_PROD,
        });
    }
    return token;
}
function clearAuthCookie(res) {
    res.clearCookie(exports.TOKEN_COOKIE_NAME, {
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
