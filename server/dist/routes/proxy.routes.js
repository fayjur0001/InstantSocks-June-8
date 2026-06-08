"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("@/middleware/auth.middleware");
const proxy_controller_1 = require("@/controllers/proxy.controller");
const router = (0, express_1.Router)();
// সব proxy routes এ login লাগবে
router.use((0, auth_middleware_1.requireAuth)());
// I1 — Proxy List & Cart & Rent
router.get("/list", proxy_controller_1.getProxyList);
router.get("/cart", proxy_controller_1.getCart);
router.post("/cart", proxy_controller_1.addToCart);
router.delete("/cart/:id", proxy_controller_1.removeFromCart);
router.post("/rent", proxy_controller_1.rentProxy);
// I2 — My Rentals & Auth & Swap Port & Renew
router.get("/my-rentals", proxy_controller_1.getMyRentals);
router.get("/auth", proxy_controller_1.getProxyAuth);
router.put("/auth", proxy_controller_1.updateProxyAuth); // ✅ FIXED: এটা আগে ছিল না
router.post("/swap-port", proxy_controller_1.swapPort);
router.post("/renew", proxy_controller_1.renewProxy);
exports.default = router;
