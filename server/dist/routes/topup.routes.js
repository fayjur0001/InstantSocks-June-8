"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const topup_controller_1 = require("@/controllers/topup.controller");
const auth_middleware_1 = require("@/middleware/auth.middleware");
const rate_limit_middleware_1 = require("@/middleware/rate-limit.middleware");
// Payment initiation: per user per IP — 10 requests per 10 minutes
const paymentLimiter = (0, rate_limit_middleware_1.rateLimit)({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: "Too many payment requests. Please try again in 10 minutes.",
});
const router = (0, express_1.Router)();
// ── Public (callback — no auth needed) ────────────────────────────────────
router.post("/callback", topup_controller_1.topUpCallback);
// ── Authenticated routes ───────────────────────────────────────────────────
router.use((0, auth_middleware_1.requireAuth)());
// User routes
router.get("/last-funds", topup_controller_1.getLastFunds);
router.get("/transactions", topup_controller_1.getTopupTransactions);
router.post("/now-payments", paymentLimiter, topup_controller_1.generateNowPayments);
router.post("/yaan-pay", paymentLimiter, topup_controller_1.generateYaanPay);
router.post("/blockonomics", paymentLimiter, topup_controller_1.generateBlockonomics);
router.post("/convert", topup_controller_1.convertCurrency);
// ── Admin-only routes ──────────────────────────────────────────────────────
router.get("/admin/transactions", (0, auth_middleware_1.requireAuth)(["admin", "super admin"]), topup_controller_1.getAdminTransactions);
router.post("/admin/transactions", (0, auth_middleware_1.requireAuth)(["admin", "super admin"]), topup_controller_1.createAdminTransaction);
router.put("/admin/transactions/:id", (0, auth_middleware_1.requireAuth)(["admin", "super admin"]), topup_controller_1.updateAdminTransaction);
router.delete("/admin/transactions/:id", (0, auth_middleware_1.requireAuth)(["admin", "super admin"]), topup_controller_1.deleteAdminTransaction);
exports.default = router;
