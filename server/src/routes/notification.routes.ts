import { Router } from "express";
import { getNotifications, markAllRead } from "@/controllers/notification.controller";
import { requireAuth } from "@/middleware/auth.middleware";

const router = Router();

router.use(requireAuth());

// GET  /api/notifications?filter=today|week|earlier|all
router.get("/", getNotifications);

// PATCH /api/notifications/read
router.patch("/read", markAllRead);

export default router;