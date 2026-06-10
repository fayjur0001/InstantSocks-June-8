import { Router } from "express";

import {
  login,
  logout,
  me,
  getUserBalance,
  getNotificationCount,
  loginAs,
  exitLoginAs,
  register,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
  changePin,
  uploadAvatar,
} from "@/controllers/auth.controller";

import { requireAuth } from "@/middleware/auth.middleware";
import { rateLimit } from "@/middleware/rate-limit.middleware";

// ✅ FIX: Brute-force ও credential stuffing এর বিরুদ্ধে rate limiting
// Login: 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many login attempts. Please try again in 15 minutes.",
});

// Register: 10 attempts per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many registration attempts. Please try again later.",
});

// Forgot password: 5 attempts per 30 minutes per IP
const forgotPasswordLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 5,
  message: "Too many password reset requests. Please try again in 30 minutes.",
});

const router = Router();

// ── Auth ─────────────────────────────────────────
router.post("/login", loginLimiter, login);
router.post("/register", registerLimiter, register);
router.post("/logout", logout);

// ── Current user ────────────────────────────────
router.get("/me", requireAuth(), me);
router.get("/balance", requireAuth(), getUserBalance);
router.get("/notifications/count", requireAuth(), getNotificationCount);

// ── Admin only ──────────────────────────────────
router.post(
  "/login-as",
  requireAuth(["admin", "super admin"]),
  loginAs
);

// ── Exit impersonation ──────────────────────────
router.post("/exit-login-as", requireAuth(), exitLoginAs);

// ── Password reset (public) ─────────────────────
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPassword);

// ── Profile ─────────────────────────────────────
router.get("/profile", requireAuth(), getProfile);
router.put("/profile", requireAuth(), updateProfile);

// ── Password & PIN ───────────────────────────────
router.post("/profile/change-password", requireAuth(), changePassword);
router.post("/profile/change-pin", requireAuth(), changePin);

// ── Avatar upload ────────────────────────────────
// NOTE: এই route টা /profile/change-password ও /profile/change-pin এর
// নিচে রাখা হয়েছে — Express route matching order মেনে চলতে।
// Static path (avatar) আগে, wildcard পরে — কোনো conflict নেই।
router.post("/profile/avatar", requireAuth(), uploadAvatar);

export default router;