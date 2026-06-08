"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.editMessage = editMessage;
exports.deleteMessage = deleteMessage;
exports.getMyTickets = getMyTickets;
exports.getOtherTickets = getOtherTickets;
exports.getUnclaimedTickets = getUnclaimedTickets;
exports.getTicket = getTicket;
exports.createTicket = createTicket;
exports.sendMessage = sendMessage;
exports.getMessages = getMessages;
exports.closeTicket = closeTicket;
exports.reopenTicket = reopenTicket;
exports.claimTicket = claimTicket;
const db_1 = __importDefault(require("@/db"));
const schema_1 = require("@/db/schema");
const unlogging_error_1 = __importDefault(require("@/utils/unlogging-error"));
const pusher_1 = __importDefault(require("@/utils/pusher"));
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
async function editMessage(req, res) {
    try {
        const userId = req.payload.id;
        const messageId = zod_1.z.coerce.number().int().min(1).parse(req.params.messageId);
        const { message } = zod_1.z.object({ message: zod_1.z.string().min(1) }).parse(req.body);
        const existing = await db_1.default.query.TicketMessageModel.findFirst({
            where: (m, { eq }) => eq(m.id, messageId),
        });
        if (!existing) {
            res.status(404).json({ success: false, message: "Message not found." });
            return;
        }
        if (existing.userId !== userId) {
            res.status(403).json({ success: false, message: "Access denied." });
            return;
        }
        await db_1.default.update(schema_1.TicketMessageModel).set({ message }).where((0, drizzle_orm_1.eq)(schema_1.TicketMessageModel.id, messageId));
        const ticket = await db_1.default.query.TicketModel.findFirst({ where: (m, { eq }) => eq(m.id, existing.ticketId) });
        if (ticket) {
            const page = `/support/${existing.ticketId}`;
            await (0, pusher_1.default)({ page, to: `user-${ticket.userId}` });
            if (ticket.agentId && ticket.agentId !== ticket.userId) {
                await (0, pusher_1.default)({ page, to: `user-${ticket.agentId}` });
            }
        }
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
async function deleteMessage(req, res) {
    try {
        const userId = req.payload.id;
        const messageId = zod_1.z.coerce.number().int().min(1).parse(req.params.messageId);
        const existing = await db_1.default.query.TicketMessageModel.findFirst({
            where: (m, { eq }) => eq(m.id, messageId),
        });
        if (!existing) {
            res.status(404).json({ success: false, message: "Message not found." });
            return;
        }
        if (existing.userId !== userId) {
            res.status(403).json({ success: false, message: "Access denied." });
            return;
        }
        await db_1.default.delete(schema_1.TicketMessageModel).where((0, drizzle_orm_1.eq)(schema_1.TicketMessageModel.id, messageId));
        const ticket = await db_1.default.query.TicketModel.findFirst({ where: (m, { eq }) => eq(m.id, existing.ticketId) });
        if (ticket) {
            const page = `/support/${existing.ticketId}`;
            await (0, pusher_1.default)({ page, to: `user-${ticket.userId}` });
            if (ticket.agentId && ticket.agentId !== ticket.userId) {
                await (0, pusher_1.default)({ page, to: `user-${ticket.agentId}` });
            }
        }
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─── Helper: ticket list এ agentInfo যোগ করো ─────────────────────────────────
async function enrichTicketsWithAgent(tickets) {
    // agentId আছে এমন unique agent IDs বের করো
    const agentIds = [...new Set(tickets.map((t) => t.agentId).filter(Boolean))];
    if (agentIds.length === 0)
        return tickets.map((t) => ({ ...t, agentInfo: null }));
    // একটা bulk query তে সব agent info আনো
    const agents = await db_1.default.query.UserModel.findMany({
        where: (u, { inArray }) => inArray(u.id, agentIds),
        columns: { id: true, username: true, agentSerial: true },
    });
    const agentMap = new Map(agents.map((a) => [a.id, a]));
    return tickets.map((t) => ({
        ...t,
        agentInfo: t.agentId ? (agentMap.get(t.agentId) ?? null) : null,
    }));
}
async function getMyTickets(req, res) {
    try {
        const rawTickets = await db_1.default.query.TicketModel.findMany({ where: (m, { eq }) => eq(m.userId, req.payload.id), orderBy: (m, { desc }) => desc(m.updatedAt) });
        const tickets = await enrichTicketsWithAgent(rawTickets);
        res.json({ success: true, tickets });
    }
    catch {
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
async function getOtherTickets(req, res) {
    try {
        const agentId = req.payload.id;
        const rawTickets = await db_1.default.query.TicketModel.findMany({ where: (m, { eq }) => eq(m.agentId, agentId), orderBy: (m, { desc }) => desc(m.updatedAt) });
        const tickets = await enrichTicketsWithAgent(rawTickets);
        res.json({ success: true, tickets });
    }
    catch {
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
async function getUnclaimedTickets(_req, res) {
    try {
        const rawTickets = await db_1.default.query.TicketModel.findMany({ where: (m, { isNull, and, eq }) => and(isNull(m.agentId), eq(m.status, "opened")), orderBy: (m, { desc }) => desc(m.updatedAt) });
        const tickets = await enrichTicketsWithAgent(rawTickets);
        res.json({ success: true, tickets });
    }
    catch {
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─── Ownership helper ─────────────────────────────────────────────────────────
// Ticket টা fetch করে এবং check করে যে requester হয় ticket owner অথবা assigned agent।
// Staff/admin role হলে সব ticket access পাবে।
async function fetchTicketWithAccess(ticketId, requesterId, requesterRole) {
    const ticket = await db_1.default.query.TicketModel.findFirst({ where: (m, { eq }) => eq(m.id, ticketId) });
    if (!ticket)
        return { ticket: null, forbidden: false };
    const isStaff = requesterRole === "admin" || requesterRole === "super admin" || requesterRole === "support";
    const isOwner = ticket.userId === requesterId;
    const isAgent = ticket.agentId === requesterId;
    if (!isStaff && !isOwner && !isAgent) {
        return { ticket: null, forbidden: true };
    }
    return { ticket, forbidden: false };
}
async function getTicket(req, res) {
    try {
        const ticketId = zod_1.z.coerce.number().parse(req.params.ticketId);
        const { ticket, forbidden } = await fetchTicketWithAccess(ticketId, req.payload.id, req.payload.role);
        if (forbidden) {
            res.status(403).json({ success: false, message: "Access denied." });
            return;
        }
        if (!ticket) {
            res.status(404).json({ success: false, message: "Ticket not found." });
            return;
        }
        // Agent info যোগ করো — agentSerial + username
        let agentInfo = null;
        if (ticket.agentId) {
            const agent = await db_1.default.query.UserModel.findFirst({
                where: (u, { eq }) => eq(u.id, ticket.agentId),
                columns: { username: true, agentSerial: true },
            });
            if (agent) {
                agentInfo = { agentSerial: agent.agentSerial, username: agent.username };
            }
        }
        res.json({ success: true, ticket: { ...ticket, agentInfo } });
    }
    catch {
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
async function createTicket(req, res) {
    try {
        const userId = req.payload.id;
        const { subject, message, toUserId } = zod_1.z.object({ subject: zod_1.z.string().min(1), message: zod_1.z.string().min(1), toUserId: zod_1.z.number().optional() }).parse(req.body);
        const [ticket] = await db_1.default.insert(schema_1.TicketModel).values({ userId, subject, agentId: toUserId }).returning();
        const [msg] = await db_1.default.insert(schema_1.TicketMessageModel).values({ ticketId: ticket.id, userId, message }).returning();
        await db_1.default.insert(schema_1.TicketMessageSeenByModel).values({ messageId: msg.id, userId });
        await (0, pusher_1.default)({ page: "/support/my-tickets", to: `user-${userId}` });
        res.json({ success: true, ticketId: ticket.id });
    }
    catch (e) {
        if (e instanceof unlogging_error_1.default) {
            res.status(400).json({ success: false, message: e.message });
            return;
        }
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
async function sendMessage(req, res) {
    try {
        const userId = req.payload.id;
        const ticketId = zod_1.z.coerce.number().parse(req.params.ticketId);
        const { message } = zod_1.z.object({ message: zod_1.z.string().min(1) }).parse(req.body);
        const { ticket, forbidden } = await fetchTicketWithAccess(ticketId, userId, req.payload.role);
        if (forbidden) {
            res.status(403).json({ success: false, message: "Access denied." });
            return;
        }
        if (!ticket) {
            res.status(404).json({ success: false, message: "Ticket not found." });
            return;
        }
        if (ticket.status === "closed") {
            res.status(400).json({ success: false, message: "Ticket is closed." });
            return;
        }
        const [msg] = await db_1.default.insert(schema_1.TicketMessageModel).values({ ticketId, userId, message }).returning();
        await db_1.default.insert(schema_1.TicketMessageSeenByModel).values({ messageId: msg.id, userId });
        const page = `/support/${ticketId}`;
        await (0, pusher_1.default)({ page, to: `user-${ticket.userId}` });
        if (ticket.agentId && ticket.agentId !== ticket.userId) {
            await (0, pusher_1.default)({ page, to: `user-${ticket.agentId}` });
        }
        // Staff ও admin channel এ notify করো যাতে their ticket list refresh হয়
        await (0, pusher_1.default)({ page: "/support/other-tickets", to: "admin" });
        await (0, pusher_1.default)({ page: "/support/my-tickets", to: "staff" });
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
async function getMessages(req, res) {
    try {
        const userId = req.payload.id;
        const ticketId = zod_1.z.coerce.number().parse(req.params.ticketId);
        const { ticket, forbidden } = await fetchTicketWithAccess(ticketId, userId, req.payload.role);
        if (forbidden) {
            res.status(403).json({ success: false, message: "Access denied." });
            return;
        }
        if (!ticket) {
            res.status(404).json({ success: false, message: "Ticket not found." });
            return;
        }
        const messages = await db_1.default.query.TicketMessageModel.findMany({
            where: (m, { eq }) => eq(m.ticketId, ticketId),
            orderBy: (m, { asc }) => asc(m.createdAt),
        });
        // Seen records fetch করো
        const messageIds = messages.map((m) => m.id);
        const seenRecords = messageIds.length > 0
            ? await db_1.default.query.TicketMessageSeenByModel.findMany({
                where: (s, { inArray }) => inArray(s.messageId, messageIds),
            })
            : [];
        // নিজে না-দেখা অন্যের messages গুলো seen mark করো
        const otherUserId = ticket.userId === userId ? ticket.agentId : ticket.userId;
        const unseenIds = messages
            .filter((msg) => msg.userId !== userId && !seenRecords.some((s) => s.messageId === msg.id && s.userId === userId))
            .map((msg) => msg.id);
        if (unseenIds.length > 0) {
            await db_1.default.insert(schema_1.TicketMessageSeenByModel).values(unseenIds.map((messageId) => ({ messageId, userId }))).onConflictDoNothing();
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
    }
    catch {
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
async function closeTicket(req, res) {
    try {
        const ticketId = zod_1.z.coerce.number().parse(req.params.ticketId);
        const { ticket, forbidden } = await fetchTicketWithAccess(ticketId, req.payload.id, req.payload.role);
        if (forbidden) {
            res.status(403).json({ success: false, message: "Access denied." });
            return;
        }
        if (!ticket) {
            res.status(404).json({ success: false, message: "Ticket not found." });
            return;
        }
        await db_1.default.update(schema_1.TicketModel).set({ status: "closed" }).where((0, drizzle_orm_1.eq)(schema_1.TicketModel.id, ticketId));
        await (0, pusher_1.default)({ page: "/support/my-tickets", to: `user-${ticket.userId}` });
        // Agent কেও notify করো
        if (ticket.agentId) {
            await (0, pusher_1.default)({ page: "/support/my-tickets", to: `user-${ticket.agentId}` });
        }
        // Admin/staff list refresh
        await (0, pusher_1.default)({ page: "/support/other-tickets", to: "admin" });
        await (0, pusher_1.default)({ page: "/support/unclaimed-tickets", to: "staff" });
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
async function reopenTicket(req, res) {
    try {
        const ticketId = zod_1.z.coerce.number().parse(req.params.ticketId);
        const { ticket, forbidden } = await fetchTicketWithAccess(ticketId, req.payload.id, req.payload.role);
        if (forbidden) {
            res.status(403).json({ success: false, message: "Access denied." });
            return;
        }
        if (!ticket) {
            res.status(404).json({ success: false, message: "Ticket not found." });
            return;
        }
        await db_1.default.update(schema_1.TicketModel).set({ status: "opened" }).where((0, drizzle_orm_1.eq)(schema_1.TicketModel.id, ticketId));
        await (0, pusher_1.default)({ page: "/support/my-tickets", to: `user-${ticket.userId}` });
        if (ticket.agentId) {
            await (0, pusher_1.default)({ page: "/support/my-tickets", to: `user-${ticket.agentId}` });
        }
        // Admin/staff list refresh — reopened ticket unclaimed এ ফিরে আসতে পারে
        await (0, pusher_1.default)({ page: "/support/unclaimed-tickets", to: "staff" });
        await (0, pusher_1.default)({ page: "/support/other-tickets", to: "admin" });
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// Converted from: claim.action.ts
async function claimTicket(req, res) {
    try {
        const agentId = req.payload.id;
        const ticketId = zod_1.z.coerce.number().int().min(1).parse(req.params.ticketId);
        const ticket = await db_1.default.query.TicketModel.findFirst({
            where: (m, { eq, and, isNull }) => and(eq(m.id, ticketId), isNull(m.agentId), eq(m.status, "opened")),
            columns: { userId: true },
        });
        if (!ticket)
            throw new unlogging_error_1.default("Ticket not found.");
        await db_1.default.update(schema_1.TicketModel).set({ agentId }).where((0, drizzle_orm_1.eq)(schema_1.TicketModel.id, ticketId));
        await (0, pusher_1.default)({ page: "/support/unclaimed-tickets", to: "staff" });
        await (0, pusher_1.default)({ page: "/support/my-tickets", to: `user-${ticket.userId}` });
        await (0, pusher_1.default)({ page: "/support/my-tickets", to: `user-${agentId}` });
        await (0, pusher_1.default)({ page: "/support/other-tickets", to: "admin" });
        res.json({ success: true });
    }
    catch (e) {
        if (e instanceof unlogging_error_1.default) {
            res.status(400).json({ success: false, message: e.message });
            return;
        }
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
