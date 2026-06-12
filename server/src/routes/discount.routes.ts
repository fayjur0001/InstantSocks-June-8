import { Router } from "express";
import { requireAuth } from "@/middleware/auth.middleware";
import {
  getDiscountTiers,
  updateDiscountTier,
  getDiscountUsers,
} from "@/controllers/discount.controller";

const router = Router();
router.use(requireAuth(["admin", "super admin"]));

router.get("/tiers",         getDiscountTiers);     // GET  /api/admin/discount/tiers
router.patch("/tiers/:tier", updateDiscountTier);   // PATCH /api/admin/discount/tiers/:tier
router.get("/users",         getDiscountUsers);     // GET  /api/admin/discount/users

export default router;