"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("@/controllers/dashboard.controller");
const auth_middleware_1 = require("@/middleware/auth.middleware");
const router = (0, express_1.Router)();
// GET /api/dashboard/stats
router.get("/stats", (0, auth_middleware_1.requireAuth)(), dashboard_controller_1.getUserDashboardStats);
exports.default = router;
