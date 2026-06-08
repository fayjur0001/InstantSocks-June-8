import { Request, Response } from "express";
import db from "@/db";
import { TicketModel, TicketMessageModel, TicketMessageSeenByModel, UserModel } from "@/db/schema";
import UnloggingError from "@/utils/unlogging-error";
import pusher from "@/utils/pusher";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
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
      await pusher({ page, to: `user-${ticket.userId}` });
      if (ticket.agentId && ticket.agentId !== ticket.userId) {
        await pusher({ page, to: `user-${ticket.agentId}` });
      }
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

    await db.delete(TicketMessageModel).where(eq(TicketMessageModel.id, messageId));

    const ticket = await db.query.TicketModel.findFirst({ where: (m, { eq }) => eq(m.id, existing.ticketId) });
    if (ticket) {
      const page = `/support/${existing.ticketId}`;
      await pusher({ page, to: `user-${ticket.userId}` });
      if (ticket.agentId && ticket.agentId !== ticket.userId) {
        await pusher({ page, to: `user-${ticket.agentId}` });
      }
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
    const rawTickets = await db.query.TicketModel.findMany({ where: (m, { eq }) => eq(m.userId, req.payload!.id), orderBy: (m, { desc }) => desc(m.updatedAt) });
    const tickets = await enrichTicketsWithAgent(rawTickets);
    res.json({ success: true, tickets });
  } catch { res.status(500).json({ success: false, message: "Internal server error." }); }
}

export async function getOtherTickets(req: Request, res: Response) {
  try {
    const agentId = req.payload!.id;
    const rawTickets = await db.query.TicketModel.findMany({ where: (m, { eq }) => eq(m.agentId, agentId), orderBy: (m, { desc }) => desc(m.updatedAt) });
    const tickets = await enrichTicketsWithAgent(rawTickets);
    res.json({ success: true, tickets });
  } catch { res.status(500).json({ success: false, message: "Internal server error." }); }
}

export async function getUnclaimedTickets(_req: Request, res: Response) {
  try {
    const rawTickets = await db.query.TicketModel.findMany({ where: (m, { isNull, and, eq }) => and(isNull(m.agentId), eq(m.status, "opened")), orderBy: (m, { desc }) => desc(m.updatedAt) });
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
    const { subject, message, toUserId } = z.object({ subject: z.string().min(1), message: z.string().min(1), toUserId: z.number().optional() }).parse(req.body);
    const [ticket] = await db.insert(TicketModel).values({ userId, subject, agentId: toUserId }).returning();
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
    const page = `/support/${ticketId}`;
    await pusher({ page, to: `user-${ticket.userId}` });
    if (ticket.agentId && ticket.agentId !== ticket.userId) {
      await pusher({ page, to: `user-${ticket.agentId}` });
    }
    // Staff ও admin channel এ notify করো যাতে their ticket list refresh হয়
    await pusher({ page: "/support/other-tickets", to: "admin" });
    await pusher({ page: "/support/my-tickets", to: "staff" });
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
      // local seenRecords এ যোগ করো যাতে নিচের map এ ঠিক থাকে
      unseenIds.forEach((mid) => seenRecords.push({ id: 0, messageId: mid, userId, createdAt: new Date(), updatedAt: new Date() }));
    }

    const messagesWithSeen = messages.map((msg) => ({
      ...msg,
      seenByOther: otherUserId
        ? seenRecords.some((s) => s.messageId === msg.id && s.userId === otherUserId)
        : false,
    }));

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
    await pusher({ page: "/support/my-tickets", to: `user-${ticket.userId}` });
    // Agent কেও notify করো
    if (ticket.agentId) {
      await pusher({ page: "/support/my-tickets", to: `user-${ticket.agentId}` });
    }
    // Admin/staff list refresh
    await pusher({ page: "/support/other-tickets", to: "admin" });
    await pusher({ page: "/support/unclaimed-tickets", to: "staff" });
    res.json({ success: true });
  } catch { res.status(500).json({ success: false, message: "Internal server error." }); }
}

export async function reopenTicket(req: Request, res: Response) {
  try {
    const ticketId = z.coerce.number().parse(req.params.ticketId);
    const { ticket, forbidden } = await fetchTicketWithAccess(ticketId, req.payload!.id, req.payload!.role);
    if (forbidden) { res.status(403).json({ success: false, message: "Access denied." }); return; }
    if (!ticket) { res.status(404).json({ success: false, message: "Ticket not found." }); return; }
    await db.update(TicketModel).set({ status: "opened" }).where(eq(TicketModel.id, ticketId));
    await pusher({ page: "/support/my-tickets", to: `user-${ticket.userId}` });
    if (ticket.agentId) {
      await pusher({ page: "/support/my-tickets", to: `user-${ticket.agentId}` });
    }
    // Admin/staff list refresh — reopened ticket unclaimed এ ফিরে আসতে পারে
    await pusher({ page: "/support/unclaimed-tickets", to: "staff" });
    await pusher({ page: "/support/other-tickets", to: "admin" });
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
    await pusher({ page: "/support/unclaimed-tickets", to: "staff" });
    await pusher({ page: "/support/my-tickets", to: `user-${ticket.userId}` });
    await pusher({ page: "/support/my-tickets", to: `user-${agentId}` });
    await pusher({ page: "/support/other-tickets", to: "admin" });
    res.json({ success: true });
  } catch (e) {
    if (e instanceof UnloggingError) { res.status(400).json({ success: false, message: e.message }); return; }
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}