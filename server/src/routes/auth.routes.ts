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


const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many login attempts. Please try again in 15 minutes.",
});


const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many registration attempts. Please try again later.",
});


const forgotPasswordLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 5,
  message: "Too many password reset requests. Please try again in 30 minutes.",
});

const router = Router();


router.post("/login", loginLimiter, login);
router.post("/register", registerLimiter, register);
router.post("/logout", logout);


router.get("/me", requireAuth(), me);
router.get("/balance", requireAuth(), getUserBalance);
router.get("/notifications/count", requireAuth(), getNotificationCount);


router.post(
  "/login-as",
  requireAuth(["admin", "super admin"]),
  loginAs
);


router.post("/exit-login-as", requireAuth(), exitLoginAs);


router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPassword);


router.get("/profile", requireAuth(), getProfile);
router.put("/profile", requireAuth(), updateProfile);


router.post("/profile/change-password", requireAuth(), changePassword);
router.post("/profile/change-pin", requireAuth(), changePin);


router.post("/profile/avatar", requireAuth(), uploadAvatar);

export default router;