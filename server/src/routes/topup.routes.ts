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


const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: "Too many payment requests. Please try again in 10 minutes.",
});

const router = Router();


router.post("/callback", topUpCallback);


router.use(requireAuth());


router.get("/last-funds", getLastFunds);
router.get("/transactions", getTopupTransactions);
router.post("/now-payments", paymentLimiter, generateNowPayments);
router.post("/yaan-pay", paymentLimiter, generateYaanPay);
router.post("/blockonomics", paymentLimiter, generateBlockonomics);
router.post("/convert", convertCurrency);


router.get("/admin/transactions", requireAuth(["admin", "super admin"]), getAdminTransactions);
router.post("/admin/transactions", requireAuth(["admin", "super admin"]), createAdminTransaction);
router.put("/admin/transactions/:id", requireAuth(["admin", "super admin"]), updateAdminTransaction);
router.delete("/admin/transactions/:id", requireAuth(["admin", "super admin"]), deleteAdminTransaction);

export default router;