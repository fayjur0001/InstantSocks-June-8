import { Request, Response } from "express";
import db from "@/db";
import { TicketModel, TicketMessageModel, TicketMessageSeenByModel, UserModel } from "@/db/schema";
import UnloggingError from "@/utils/unlogging-error";
import pusher from "@/utils/pusher";
import { and, asc, desc, eq, inArray, isNull, isNotNull } from "drizzle-orm";
import { z } from "zod";

export async function editMessage(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;
    const messageId = z.coerce.number().int().min(1).parse(req.params.messageId);
    const { message } = z.object({ message: z.string().min(1) }).parse(req.body);

    const existing = await db.query.TicketMessageModel.findFirst({
      where: (m, { eq }) => eq(m.id, messageId),
    });
    if (!existing) { res.status(404).json({ success: false, message: "Message not found." }); return; }
    if (existing.userId !== userId) { res.status(403).json({ success: false, message: "Access denied." }); return; }

    await db.update(TicketMessageModel).set({ message }).where(eq(TicketMessageModel.id, messageId));

    const ticket = await db.query.TicketModel.findFirst({ where: (m, { eq }) => eq(m.id, existing.ticketId) });
    if (ticket) {
      const page = `/support/${existing.ticketId}`;
      const notifies = [pusher({ page, to: `user-${ticket.userId}` })];
      if (ticket.agentId && ticket.agentId !== ticket.userId) {
        notifies.push(pusher({ page, to: `user-${ticket.agentId}` }));
      }
      await Promise.all(notifies);
    }
    res.json({ success: true });
  } catch { res.status(500).json({ success: false, message: "Internal server error." }); }
}

export async function deleteMessage(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;
    const messageId = z.coerce.number().int().min(1).parse(req.params.messageId);

    const existing = await db.query.TicketMessageModel.findFirst({
      where: (m, { eq }) => eq(m.id, messageId),
    });
    if (!existing) { res.status(404).json({ success: false, message: "Message not found." }); return; }
    if (existing.userId !== userId) { res.status(403).json({ success: false, message: "Access denied." }); return; }

    // FK constraint: seen_by records আগে delete করতে হবে, তারপর message
    await db.delete(TicketMessageSeenByModel).where(eq(TicketMessageSeenByModel.messageId, messageId));
    await db.delete(TicketMessageModel).where(eq(TicketMessageModel.id, messageId));

    const ticket = await db.query.TicketModel.findFirst({ where: (m, { eq }) => eq(m.id, existing.ticketId) });
    if (ticket) {
      const page = `/support/${existing.ticketId}`;
      const notifies = [pusher({ page, to: `user-${ticket.userId}` })];
      if (ticket.agentId && ticket.agentId !== ticket.userId) {
        notifies.push(pusher({ page, to: `user-${ticket.agentId}` }));
      }
      await Promise.all(notifies);
    }
    res.json({ success: true });
  } catch { res.status(500).json({ success: false, message: "Internal server error." }); }
}

// ─── Helper: ticket list এ agentInfo যোগ করো ─────────────────────────────────
async function enrichTicketsWithAgent(tickets: any[]) {
  // agentId আছে এমন unique agent IDs বের করো
  const agentIds = [...new Set(tickets.map((t) => t.agentId).filter(Boolean))] as number[];
  if (agentIds.length === 0) return tickets.map((t) => ({ ...t, agentInfo: null }));

  // একটা bulk query তে সব agent info আনো
  const agents = await db.query.UserModel.findMany({
    where: (u, { inArray }) => inArray(u.id, agentIds),
    columns: { id: true, username: true, agentSerial: true },
  });

  const agentMap = new Map(agents.map((a) => [a.id, a]));

  return tickets.map((t) => ({
    ...t,
    agentInfo: t.agentId ? (agentMap.get(t.agentId) ?? null) : null,
  }));
}

export async function getMyTickets(req: Request, res: Response) {
  try {
    const requesterId = req.payload!.id;
    const role = req.payload!.role;
    const isStaff = role === "admin" || role === "super admin" || role === "support";

    let rawTickets;
    if (isStaff) {
      // Agent/Admin: নিজে যে টিকেটগুলো handle করছে (agentId = self)
      rawTickets = await db.query.TicketModel.findMany({
        where: (m, { eq }) => eq(m.agentId, requesterId),
        orderBy: (m, { desc }) => desc(m.updatedAt),
      });
    } else {
      // Regular user: নিজে যে টিকেটগুলো তৈরি করেছে (userId = self)
      rawTickets = await db.query.TicketModel.findMany({
        where: (m, { eq }) => eq(m.userId, requesterId),
        orderBy: (m, { desc }) => desc(m.updatedAt),
      });
    }

    const tickets = await enrichTicketsWithAgent(rawTickets);
    res.json({ success: true, tickets });
  } catch { res.status(500).json({ success: false, message: "Internal server error." }); }
}

export async function getOtherTickets(_req: Request, res: Response) {
  try {
    // All Tickets: agentId আছে এমন টিকেট (In Progress + Completed), unclaimed বাদ
    const rawTickets = await db.query.TicketModel.findMany({
      where: (m, { isNotNull }) => isNotNull(m.agentId),
      orderBy: (m, { desc }) => desc(m.updatedAt),
    });
    const tickets = await enrichTicketsWithAgent(rawTickets);
    res.json({ success: true, tickets });
  } catch { res.status(500).json({ success: false, message: "Internal server error." }); }
}

export async function getUnclaimedTickets(_req: Request, res: Response) {
  try {
    // Unclaimed: agentId নেই এবং opened status
    const rawTickets = await db.query.TicketModel.findMany({
      where: (m, { isNull, and, eq }) => and(isNull(m.agentId), eq(m.status, "opened")),
      orderBy: (m, { desc }) => desc(m.updatedAt),
    });
    const tickets = await enrichTicketsWithAgent(rawTickets);
    res.json({ success: true, tickets });
  } catch { res.status(500).json({ success: false, message: "Internal server error." }); }
}

// ─── Ownership helper ─────────────────────────────────────────────────────────
// Ticket টা fetch করে এবং check করে যে requester হয় ticket owner অথবা assigned agent।
// Staff/admin role হলে সব ticket access পাবে।
async function fetchTicketWithAccess(ticketId: number, requesterId: number, requesterRole: string) {
  const ticket = await db.query.TicketModel.findFirst({ where: (m, { eq }) => eq(m.id, ticketId) });
  if (!ticket) return { ticket: null, forbidden: false };

  const isStaff = requesterRole === "admin" || requesterRole === "super admin" || requesterRole === "support";
  const isOwner = ticket.userId === requesterId;
  const isAgent = ticket.agentId === requesterId;

  if (!isStaff && !isOwner && !isAgent) {
    return { ticket: null, forbidden: true };
  }
  return { ticket, forbidden: false };
}

export async function getTicket(req: Request, res: Response) {
  try {
    const ticketId = z.coerce.number().parse(req.params.ticketId);
    const { ticket, forbidden } = await fetchTicketWithAccess(ticketId, req.payload!.id, req.payload!.role);
    if (forbidden) { res.status(403).json({ success: false, message: "Access denied." }); return; }
    if (!ticket) { res.status(404).json({ success: false, message: "Ticket not found." }); return; }

    // Agent info যোগ করো — agentSerial + username
    let agentInfo: { agentSerial: number | null; username: string } | null = null;
    if (ticket.agentId) {
      const agent = await db.query.UserModel.findFirst({
        where: (u, { eq }) => eq(u.id, ticket.agentId!),
        columns: { username: true, agentSerial: true },
      });
      if (agent) {
        agentInfo = { agentSerial: agent.agentSerial, username: agent.username };
      }
    }

    res.json({ success: true, ticket: { ...ticket, agentInfo } });
  } catch { res.status(500).json({ success: false, message: "Internal server error." }); }
}

export async function createTicket(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;
    const { subject, message, toUserId, category } = z.object({
      subject: z.string().min(1),
      message: z.string().min(1),
      toUserId: z.number().optional(),
      category: z.string().optional(),
    }).parse(req.body);
    const [ticket] = await db.insert(TicketModel).values({
      userId,
      subject,
      category: category ?? null,
      agentId: toUserId,
    }).returning();
    const [msg] = await db.insert(TicketMessageModel).values({ ticketId: ticket.id, userId, message }).returning();
    await db.insert(TicketMessageSeenByModel).values({ messageId: msg.id, userId });
    await pusher({ page: "/support/my-tickets", to: `user-${userId}` });
    res.json({ success: true, ticketId: ticket.id });
  } catch (e) {
    if (e instanceof UnloggingError) { res.status(400).json({ success: false, message: e.message }); return; }
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

export async function sendMessage(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;
    const ticketId = z.coerce.number().parse(req.params.ticketId);
    const { message } = z.object({ message: z.string().min(1) }).parse(req.body);
    const { ticket, forbidden } = await fetchTicketWithAccess(ticketId, userId, req.payload!.role);
    if (forbidden) { res.status(403).json({ success: false, message: "Access denied." }); return; }
    if (!ticket) { res.status(404).json({ success: false, message: "Ticket not found." }); return; }
    if (ticket.status === "closed") { res.status(400).json({ success: false, message: "Ticket is closed." }); return; }
    const [msg] = await db.insert(TicketMessageModel).values({ ticketId, userId, message }).returning();
    await db.insert(TicketMessageSeenByModel).values({ messageId: msg.id, userId });

    // Ticket updatedAt update করো এবং staff reply এ agentId সবসময় current replier-এ update করো
    const isStaff = req.payload!.role === "admin" || req.payload!.role === "super admin" || req.payload!.role === "support";
    const updateFields: Record<string, any> = { updatedAt: new Date() };
    if (isStaff) {
      // যেকোনো staff reply-এ agentId update — message-এর উপরে সঠিক agent ID দেখাবে
      updateFields.agentId = userId;
    }
    await db.update(TicketModel).set(updateFields).where(eq(TicketModel.id, ticketId));

    const page = `/support/${ticketId}`;
    const notifies: Promise<void>[] = [pusher({ page, to: `user-${ticket.userId}` })];
    // আগের agent (যদি ভিন্ন কেউ হয়) কে notify করো
    if (ticket.agentId && ticket.agentId !== userId && ticket.agentId !== ticket.userId) {
      notifies.push(pusher({ page, to: `user-${ticket.agentId}` }));
    }
    // Current replier কে notify করো
    if (isStaff && userId !== ticket.userId) {
      notifies.push(pusher({ page, to: `user-${userId}` }));
    }
    // Staff ও admin channel এ notify করো যাতে their ticket list refresh হয়
    notifies.push(pusher({ page: "/support/other-tickets", to: "admin" }));
    notifies.push(pusher({ page: "/support/my-tickets", to: "staff" }));
    await Promise.all(notifies);
    res.json({ success: true });
  } catch { res.status(500).json({ success: false, message: "Internal server error." }); }
}

export async function getMessages(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;
    const ticketId = z.coerce.number().parse(req.params.ticketId);
    const { ticket, forbidden } = await fetchTicketWithAccess(ticketId, userId, req.payload!.role);
    if (forbidden) { res.status(403).json({ success: false, message: "Access denied." }); return; }
    if (!ticket) { res.status(404).json({ success: false, message: "Ticket not found." }); return; }

    const messages = await db.query.TicketMessageModel.findMany({
      where: (m, { eq }) => eq(m.ticketId, ticketId),
      orderBy: (m, { asc }) => asc(m.createdAt),
    });

    // Seen records fetch করো
    const messageIds = messages.map((m) => m.id);
    const seenRecords = messageIds.length > 0
      ? await db.query.TicketMessageSeenByModel.findMany({
          where: (s, { inArray }) => inArray(s.messageId, messageIds),
        })
      : [];

    // নিজে না-দেখা অন্যের messages গুলো seen mark করো
    const otherUserId = ticket.userId === userId ? ticket.agentId : ticket.userId;
    const unseenIds = messages
      .filter((msg) => msg.userId !== userId && !seenRecords.some((s) => s.messageId === msg.id && s.userId === userId))
      .map((msg) => msg.id);

    if (unseenIds.length > 0) {
      await db.insert(TicketMessageSeenByModel).values(
        unseenIds.map((messageId) => ({ messageId, userId }))
      ).onConflictDoNothing();
      unseenIds.forEach((mid) => seenRecords.push({ id: 0, messageId: mid, userId, createdAt: new Date(), updatedAt: new Date() }));
    }

    // প্রতিটা message-এর sender info আলাদাভাবে fetch করো
    // যাতে multiple agent এর message সঠিক AGT-ID দেখায়
    const senderIds = [...new Set(messages.map((m) => m.userId))];
    const senders = senderIds.length > 0
      ? await db.query.UserModel.findMany({
          where: (u, { inArray }) => inArray(u.id, senderIds),
          columns: { id: true, agentSerial: true, role: true },
        })
      : [];
    const senderMap = new Map(senders.map((s) => [s.id, s]));

    const messagesWithSeen = messages.map((msg) => {
      const sender = senderMap.get(msg.userId);
      const isStaffSender = sender?.role === "admin" || sender?.role === "super admin" || sender?.role === "support";
      return {
        ...msg,
        seenByOther: otherUserId
          ? seenRecords.some((s) => s.messageId === msg.id && s.userId === otherUserId)
          : false,
        senderInfo: isStaffSender
          ? { agentSerial: sender?.agentSerial ?? null }
          : null,
      };
    });

    res.json({ success: true, messages: messagesWithSeen });
  } catch { res.status(500).json({ success: false, message: "Internal server error." }); }
}

export async function closeTicket(req: Request, res: Response) {
  try {
    const ticketId = z.coerce.number().parse(req.params.ticketId);
    const { ticket, forbidden } = await fetchTicketWithAccess(ticketId, req.payload!.id, req.payload!.role);
    if (forbidden) { res.status(403).json({ success: false, message: "Access denied." }); return; }
    if (!ticket) { res.status(404).json({ success: false, message: "Ticket not found." }); return; }
    await db.update(TicketModel).set({ status: "closed" }).where(eq(TicketModel.id, ticketId));
    const notifies: Promise<void>[] = [
      pusher({ page: "/support/my-tickets", to: `user-${ticket.userId}` }),
      pusher({ page: "/support/other-tickets", to: "admin" }),
      pusher({ page: "/support/unclaimed-tickets", to: "staff" }),
    ];
    if (ticket.agentId) {
      notifies.push(pusher({ page: "/support/my-tickets", to: `user-${ticket.agentId}` }));
    }
    await Promise.all(notifies);
    res.json({ success: true });
  } catch { res.status(500).json({ success: false, message: "Internal server error." }); }
}

export async function reopenTicket(req: Request, res: Response) {
  try {
    const ticketId = z.coerce.number().parse(req.params.ticketId);
    const requesterId = req.payload!.id;
    const { ticket, forbidden } = await fetchTicketWithAccess(ticketId, requesterId, req.payload!.role);
    if (forbidden) { res.status(403).json({ success: false, message: "Access denied." }); return; }
    if (!ticket) { res.status(404).json({ success: false, message: "Ticket not found." }); return; }

    const prevAgentId = ticket.agentId;

    // Reopen করা agent-এর ID set করো — এই agent এখন ticket handle করবে
    await db.update(TicketModel)
      .set({ status: "opened", agentId: requesterId })
      .where(eq(TicketModel.id, ticketId));

    const notifies: Promise<void>[] = [
      pusher({ page: "/support/my-tickets", to: `user-${ticket.userId}` }),
      pusher({ page: "/support/unclaimed-tickets", to: "staff" }),
      pusher({ page: "/support/other-tickets", to: "admin" }),
    ];
    if (prevAgentId && prevAgentId !== requesterId && prevAgentId !== ticket.userId) {
      notifies.push(pusher({ page: "/support/my-tickets", to: `user-${prevAgentId}` }));
    }
    if (requesterId !== ticket.userId) {
      notifies.push(pusher({ page: "/support/my-tickets", to: `user-${requesterId}` }));
    }
    await Promise.all(notifies);
    res.json({ success: true });
  } catch { res.status(500).json({ success: false, message: "Internal server error." }); }
}

// Converted from: claim.action.ts
export async function claimTicket(req: Request, res: Response) {
  try {
    const agentId = req.payload!.id;
    const ticketId = z.coerce.number().int().min(1).parse(req.params.ticketId);
    const ticket = await db.query.TicketModel.findFirst({
      where: (m, { eq, and, isNull }) => and(eq(m.id, ticketId), isNull(m.agentId), eq(m.status, "opened")),
      columns: { userId: true },
    });
    if (!ticket) throw new UnloggingError("Ticket not found.");
    await db.update(TicketModel).set({ agentId }).where(eq(TicketModel.id, ticketId));
    await Promise.all([
      pusher({ page: "/support/unclaimed-tickets", to: "staff" }),
      pusher({ page: "/support/my-tickets", to: `user-${ticket.userId}` }),
      pusher({ page: "/support/my-tickets", to: `user-${agentId}` }),
      pusher({ page: "/support/other-tickets", to: "admin" }),
    ]);
    res.json({ success: true });
  } catch (e) {
    if (e instanceof UnloggingError) { res.status(400).json({ success: false, message: e.message }); return; }
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

export async function deleteTicket(req: Request, res: Response) {
  try {
    const ticketId = z.coerce.number().int().min(1).parse(req.params.ticketId);
    const ticket = await db.query.TicketModel.findFirst({ where: (m, { eq }) => eq(m.id, ticketId) });
    if (!ticket) { res.status(404).json({ success: false, message: "Ticket not found." }); return; }

    // Ticket এর সব messages এর seen records delete করো
    const msgs = await db.query.TicketMessageModel.findMany({
      where: (m, { eq }) => eq(m.ticketId, ticketId),
      columns: { id: true },
    });
    if (msgs.length > 0) {
      const msgIds = msgs.map((m) => m.id);
      await db.delete(TicketMessageSeenByModel).where(inArray(TicketMessageSeenByModel.messageId, msgIds));
      await db.delete(TicketMessageModel).where(inArray(TicketMessageModel.id, msgIds));
    }
    await db.delete(TicketModel).where(eq(TicketModel.id, ticketId));

    const notifies: Promise<void>[] = [
      pusher({ page: "/support/other-tickets", to: "admin" }),
      pusher({ page: "/support/unclaimed-tickets", to: "staff" }),
      pusher({ page: "/support/my-tickets", to: `user-${ticket.userId}` }),
    ];
    if (ticket.agentId) {
      notifies.push(pusher({ page: "/support/my-tickets", to: `user-${ticket.agentId}` }));
    }
    await Promise.all(notifies);
    res.json({ success: true });
  } catch { res.status(500).json({ success: false, message: "Internal server error." }); }
}