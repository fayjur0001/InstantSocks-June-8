import { Router } from "express";
import { getUserDashboardStats } from "@/controllers/dashboard.controller";
import { requireAuth } from "@/middleware/auth.middleware";

const router = Router();

// GET /api/dashboard/stats
router.get("/stats", requireAuth(), getUserDashboardStats);

export default router;