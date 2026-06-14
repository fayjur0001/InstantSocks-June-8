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
  deleteTicket,
} from "@/controllers/support.controller";
import { requireAuth } from "@/middleware/auth.middleware";

const router = Router();


router.use(requireAuth());


router.get("/my-tickets", getMyTickets);
router.post("/", createTicket);


router.get("/unclaimed", requireAuth(["support", "admin", "super admin"]), getUnclaimedTickets);
router.get("/other-tickets", requireAuth(["support", "admin", "super admin"]), getOtherTickets);


router.patch("/messages/:messageId", editMessage);
router.delete("/messages/:messageId", deleteMessage);


router.get("/:ticketId", getTicket);
router.get("/:ticketId/messages", getMessages);
router.post("/:ticketId/messages", sendMessage);
router.patch("/:ticketId/close", requireAuth(["support", "admin", "super admin"]), closeTicket);
router.patch("/:ticketId/reopen", reopenTicket); 
router.patch("/:ticketId/claim", requireAuth(["support", "admin", "super admin"]), claimTicket);
router.delete("/:ticketId", requireAuth(["admin", "super admin"]), deleteTicket);

export default router;