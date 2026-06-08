"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const numbers_controller_1 = require("@/controllers/numbers.controller");
const auth_middleware_1 = require("@/middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use((0, auth_middleware_1.requireAuth)());
router.get("/services", numbers_controller_1.getServices);
router.post("/rent/otr", numbers_controller_1.rentOneTime); // ← নতুন
router.post("/rent/ltr", numbers_controller_1.rentLongTerm);
exports.default = router;
