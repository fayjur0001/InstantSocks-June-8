import { Router } from "express";
import {
  getAdminDashboardStats,
  getAdminStatistics,
  getAdminTopUsers,
  getAdminSummaryBoxes,
  getAdminProxyTransactions,
} from "@/controllers/dashboard.controller";
import { requireAuth } from "@/middleware/auth.middleware";

const router = Router();

router.use(requireAuth(["admin", "super admin"]));

router.get("/dashboard",                  getAdminDashboardStats);
router.get("/statistics",                 getAdminStatistics);
router.get("/statistics/top-users",       getAdminTopUsers);
router.get("/statistics/summary",         getAdminSummaryBoxes);
router.get("/statistics/proxy-transactions", getAdminProxyTransactions);

export default router;