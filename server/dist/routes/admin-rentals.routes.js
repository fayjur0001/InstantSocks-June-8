"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rentals_controller_1 = require("@/controllers/rentals.controller");
const auth_middleware_1 = require("@/middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.requireAuth)(["admin", "super admin"]));
// GET /api/admin/rentals/numbers  — সব users এর rentals (admin only)
router.get("/numbers", rentals_controller_1.getAllNumberRentals);
exports.default = router;
