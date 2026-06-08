"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rentals_controller_1 = require("@/controllers/rentals.controller");
const auth_middleware_1 = require("@/middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.requireAuth)());
// GET /api/rentals/numbers  — logged-in user এর rentals
router.get("/numbers", rentals_controller_1.getMyNumberRentals);
exports.default = router;
