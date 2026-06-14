import { Router } from "express";
import { getDashboardContent, getUserDashboardStats } from "@/controllers/dashboard.controller";
import { requireAuth } from "@/middleware/auth.middleware";

const router = Router();


router.get("/content", requireAuth(), getDashboardContent);


router.get("/stats", requireAuth(), getUserDashboardStats);

export default router;