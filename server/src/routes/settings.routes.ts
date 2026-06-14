import { Router } from "express";
import { requireAuth } from "@/middleware/auth.middleware";
import {
  getSiteStatus,
  getSiteInfo,
  getAuthInfo,
  getPublicContent,
  getSettings, updateSettings,
  getPaymentApi, updatePaymentApi,
  getProductsApi, updateProductsApi,
  getPricing, updatePricing,
  getCallback, updateCallback,
  getPublicTopUpSettings,
} from "@/controllers/settings.controller";

const router = Router();
const adminOnly = requireAuth(["admin", "super admin"]);


router.get("/site-status", getSiteStatus);
router.get("/api/site-info", getSiteInfo);
router.get("/auth-info", getAuthInfo);
router.get("/public-topup-settings", getPublicTopUpSettings);


router.get("/public-content", requireAuth(), getPublicContent);

router.get("/settings",      adminOnly, getSettings);
router.put("/settings",      adminOnly, updateSettings);
router.get("/payment-api",   adminOnly, getPaymentApi);
router.put("/payment-api",   adminOnly, updatePaymentApi);
router.get("/products-api",  adminOnly, getProductsApi);
router.put("/products-api",  adminOnly, updateProductsApi);
router.get("/pricing",       adminOnly, getPricing);
router.put("/pricing",       adminOnly, updatePricing);
router.get("/callback",      adminOnly, getCallback);
router.put("/callback",      adminOnly, updateCallback);

export default router;