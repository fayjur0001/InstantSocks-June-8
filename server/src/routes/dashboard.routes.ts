import { Router } from "express";
import { getDashboardContent, getUserDashboardStats } from "@/controllers/dashboard.controller";
import { requireAuth } from "@/middleware/auth.middleware";

const router = Router();

// GET /api/dashboard/content — notice, rules, terms, privacy
router.get("/content", requireAuth(), getDashboardContent);

// GET /api/dashboard/stats
router.get("/stats", requireAuth(), getUserDashboardStats);

export default router;