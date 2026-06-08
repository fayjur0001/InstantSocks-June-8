import { Router } from "express";
import {
  getMyTickets,
  getUnclaimedTickets,
  getOtherTickets,
  getTicket,
  createTicket,
  getMessages,
  sendMessage,
  closeTicket,
  reopenTicket,
  claimTicket,
  editMessage,
  deleteMessage,
} from "@/controllers/support.controller";
import { requireAuth } from "@/middleware/auth.middleware";

const router = Router();

// All support routes require authentication
router.use(requireAuth());

// User routes
router.get("/my-tickets", getMyTickets);
router.post("/", createTicket);

// Admin / agent routes
router.get("/unclaimed", requireAuth(["support", "admin", "super admin"]), getUnclaimedTickets);
router.get("/other-tickets", requireAuth(["support", "admin", "super admin"]), getOtherTickets);

// Ticket-specific routes (any authenticated user)
router.get("/:ticketId", getTicket);
router.get("/:ticketId/messages", getMessages);
router.post("/:ticketId/messages", sendMessage);
router.patch("/:ticketId/close", requireAuth(["support", "admin", "super admin"]), closeTicket);
router.patch("/:ticketId/reopen", reopenTicket); // ticket owner + staff উভয়েই reopen করতে পারবে
router.patch("/:ticketId/claim", requireAuth(["support", "admin", "super admin"]), claimTicket);

// Message edit / delete (owner only)
router.patch("/messages/:messageId", editMessage);
router.delete("/messages/:messageId", deleteMessage);

export default router;