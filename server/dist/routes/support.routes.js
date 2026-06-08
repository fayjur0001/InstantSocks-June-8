"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const support_controller_1 = require("@/controllers/support.controller");
const auth_middleware_1 = require("@/middleware/auth.middleware");
const router = (0, express_1.Router)();
// All support routes require authentication
router.use((0, auth_middleware_1.requireAuth)());
// User routes
router.get("/my-tickets", support_controller_1.getMyTickets);
router.post("/", support_controller_1.createTicket);
// Admin / agent routes
router.get("/unclaimed", (0, auth_middleware_1.requireAuth)(["support", "admin", "super admin"]), support_controller_1.getUnclaimedTickets);
router.get("/other-tickets", (0, auth_middleware_1.requireAuth)(["support", "admin", "super admin"]), support_controller_1.getOtherTickets);
// Ticket-specific routes (any authenticated user)
router.get("/:ticketId", support_controller_1.getTicket);
router.get("/:ticketId/messages", support_controller_1.getMessages);
router.post("/:ticketId/messages", support_controller_1.sendMessage);
router.patch("/:ticketId/close", (0, auth_middleware_1.requireAuth)(["support", "admin", "super admin"]), support_controller_1.closeTicket);
router.patch("/:ticketId/reopen", support_controller_1.reopenTicket); // ticket owner + staff উভয়েই reopen করতে পারবে
router.patch("/:ticketId/claim", (0, auth_middleware_1.requireAuth)(["support", "admin", "super admin"]), support_controller_1.claimTicket);
// Message edit / delete (owner only)
router.patch("/messages/:messageId", support_controller_1.editMessage);
router.delete("/messages/:messageId", support_controller_1.deleteMessage);
exports.default = router;
