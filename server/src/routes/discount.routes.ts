import { Router } from "express";
import { requireAuth } from "@/middleware/auth.middleware";
import {
  getDiscountTiers,
  updateDiscountTier,
  getDiscountUsers,
} from "@/controllers/discount.controller";

const router = Router();
router.use(requireAuth(["admin", "super admin"]));

router.get("/tiers",         getDiscountTiers);     
router.patch("/tiers/:tier", updateDiscountTier);   
router.get("/users",         getDiscountUsers);     

export default router;