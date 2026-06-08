import { Router } from "express";
import {
  getLastFunds,
  getTopupTransactions,
  generateNowPayments,
  generateYaanPay,
  generateBlockonomics,
  topUpCallback,
  convertCurrency,
  getAdminTransactions,
  createAdminTransaction,
  updateAdminTransaction,
  deleteAdminTransaction,
} from "@/controllers/topup.controller";
import { requireAuth } from "@/middleware/auth.middleware";
import { rateLimit } from "@/middleware/rate-limit.middleware";

// Payment initiation: per user per IP — 10 requests per 10 minutes
const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: "Too many payment requests. Please try again in 10 minutes.",
});

const router = Router();

// ── Public (callback — no auth needed) ────────────────────────────────────
router.post("/callback", topUpCallback);

// ── Authenticated routes ───────────────────────────────────────────────────
router.use(requireAuth());

// User routes
router.get("/last-funds", getLastFunds);
router.get("/transactions", getTopupTransactions);
router.post("/now-payments", paymentLimiter, generateNowPayments);
router.post("/yaan-pay", paymentLimiter, generateYaanPay);
router.post("/blockonomics", paymentLimiter, generateBlockonomics);
router.post("/convert", convertCurrency);

// ── Admin-only routes ──────────────────────────────────────────────────────
router.get("/admin/transactions", requireAuth(["admin", "super admin"]), getAdminTransactions);
router.post("/admin/transactions", requireAuth(["admin", "super admin"]), createAdminTransaction);
router.put("/admin/transactions/:id", requireAuth(["admin", "super admin"]), updateAdminTransaction);
router.delete("/admin/transactions/:id", requireAuth(["admin", "super admin"]), deleteAdminTransaction);

export default router;