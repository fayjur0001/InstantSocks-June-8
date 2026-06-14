import { Router } from "express";
import { getNotifications, markAllRead, markOneRead } from "@/controllers/notification.controller";
import { requireAuth } from "@/middleware/auth.middleware";

const router = Router();

router.use(requireAuth());


router.get("/", getNotifications);


router.patch("/read", markAllRead);


router.patch("/:id/read", markOneRead);

export default router;