"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("@/controllers/notification.controller");
const auth_middleware_1 = require("@/middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.requireAuth)());
// GET  /api/notifications?filter=today|week|earlier|all
router.get("/", notification_controller_1.getNotifications);
// PATCH /api/notifications/read
router.patch("/read", notification_controller_1.markAllRead);
exports.default = router;
