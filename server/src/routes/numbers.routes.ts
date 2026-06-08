import { Router } from "express";
import { getServices, rentLongTerm, rentOneTime } from "@/controllers/numbers.controller";
import { requireAuth } from "@/middleware/auth.middleware";

const router = Router();
router.use(requireAuth());

router.get("/services", getServices);
router.post("/rent/otr", rentOneTime);   // ← নতুন
router.post("/rent/ltr", rentLongTerm);

export default router;