"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("@/controllers/auth.controller");
const auth_middleware_1 = require("@/middleware/auth.middleware");
const rate_limit_middleware_1 = require("@/middleware/rate-limit.middleware");
// ✅ FIX: Brute-force ও credential stuffing এর বিরুদ্ধে rate limiting
// Login: 10 attempts per 15 minutes per IP
const loginLimiter = (0, rate_limit_middleware_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Too many login attempts. Please try again in 15 minutes.",
});
// Register: 5 attempts per hour per IP
const registerLimiter = (0, rate_limit_middleware_1.rateLimit)({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: "Too many registration attempts. Please try again later.",
});
// Forgot password: 5 attempts per 30 minutes per IP
const forgotPasswordLimiter = (0, rate_limit_middleware_1.rateLimit)({
    windowMs: 30 * 60 * 1000,
    max: 5,
    message: "Too many password reset requests. Please try again in 30 minutes.",
});
const router = (0, express_1.Router)();
// ── Auth ─────────────────────────────────────────
router.post("/login", loginLimiter, auth_controller_1.login);
router.post("/register", registerLimiter, auth_controller_1.register);
router.post("/logout", auth_controller_1.logout);
// ── Current user ────────────────────────────────
router.get("/me", (0, auth_middleware_1.requireAuth)(), auth_controller_1.me);
router.get("/balance", (0, auth_middleware_1.requireAuth)(), auth_controller_1.getUserBalance);
router.get("/notifications/count", (0, auth_middleware_1.requireAuth)(), auth_controller_1.getNotificationCount);
// ── Admin only ──────────────────────────────────
router.post("/login-as", (0, auth_middleware_1.requireAuth)(["admin", "super admin"]), auth_controller_1.loginAs);
// ── Exit impersonation ──────────────────────────
router.post("/exit-login-as", (0, auth_middleware_1.requireAuth)(), auth_controller_1.exitLoginAs);
// ── Password reset (public) ─────────────────────
router.post("/forgot-password", forgotPasswordLimiter, auth_controller_1.forgotPassword);
router.post("/reset-password", auth_controller_1.resetPassword);
// ── Profile ─────────────────────────────────────
router.get("/profile", (0, auth_middleware_1.requireAuth)(), auth_controller_1.getProfile);
router.put("/profile", (0, auth_middleware_1.requireAuth)(), auth_controller_1.updateProfile);
// ── Password & PIN ───────────────────────────────
router.post("/profile/change-password", (0, auth_middleware_1.requireAuth)(), auth_controller_1.changePassword);
router.post("/profile/change-pin", (0, auth_middleware_1.requireAuth)(), auth_controller_1.changePin);
exports.default = router;
