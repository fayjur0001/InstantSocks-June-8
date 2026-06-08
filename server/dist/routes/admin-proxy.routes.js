"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("@/middleware/auth.middleware");
const proxy_controller_1 = require("@/controllers/proxy.controller");
const router = (0, express_1.Router)();
// Admin only
router.use((0, auth_middleware_1.requireAuth)(["admin", "super admin"]));
// I3 — Admin Proxy Management
router.get("/all", proxy_controller_1.adminGetAllProxies); // GET /api/admin/proxy/all
router.get("/ips", proxy_controller_1.adminGetProxyIPs); // GET /api/admin/proxy/ips
exports.default = router;
