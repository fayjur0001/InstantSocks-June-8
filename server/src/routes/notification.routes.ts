import { Router } from "express";
import { getNotifications, markAllRead, markOneRead } from "@/controllers/notification.controller";
import { requireAuth } from "@/middleware/auth.middleware";

const router = Router();

router.use(requireAuth());

// GET  /api/notifications?filter=today|week|earlier|all
router.get("/", getNotifications);

// PATCH /api/notifications/read — mark all
router.patch("/read", markAllRead);

// PATCH /api/notifications/:id/read — mark one
router.patch("/:id/read", markOneRead);

export default router;