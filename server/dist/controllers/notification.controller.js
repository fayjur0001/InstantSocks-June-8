"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = getNotifications;
exports.markAllRead = markAllRead;
exports.createNotification = createNotification;
const db_1 = __importDefault(require("@/db"));
const schema_1 = require("@/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
// ─── Helper: filter → date range ─────────────────────────────────────────────
function getFilterRange(filter) {
    const now = new Date();
    if (filter === "today") {
        const from = new Date(now);
        from.setHours(0, 0, 0, 0);
        return { from };
    }
    if (filter === "week") {
        const from = new Date(now);
        from.setDate(from.getDate() - 7);
        from.setHours(0, 0, 0, 0);
        const to = new Date(now);
        to.setHours(0, 0, 0, 0);
        return { from, to };
    }
    if (filter === "earlier") {
        const to = new Date(now);
        to.setDate(to.getDate() - 7);
        to.setHours(0, 0, 0, 0);
        return { to };
    }
    // "all" — no range
    return {};
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications?filter=today|week|earlier|all
// ─────────────────────────────────────────────────────────────────────────────
async function getNotifications(req, res) {
    try {
        const userId = req.payload.id;
        const filter = req.query.filter || "all";
        const { from, to } = getFilterRange(filter);
        const conditions = [(0, drizzle_orm_1.eq)(schema_1.NotificationModel.userId, userId)];
        if (from)
            conditions.push((0, drizzle_orm_1.gte)(schema_1.NotificationModel.createdAt, from));
        if (to)
            conditions.push((0, drizzle_orm_1.lt)(schema_1.NotificationModel.createdAt, to));
        const notifications = await db_1.default
            .select()
            .from(schema_1.NotificationModel)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.NotificationModel.createdAt))
            .limit(100);
        res.json({ success: true, data: notifications });
    }
    catch (e) {
        console.error("GET NOTIFICATIONS ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/notifications/read — সব notification isRead = true
// ─────────────────────────────────────────────────────────────────────────────
async function markAllRead(req, res) {
    try {
        const userId = req.payload.id;
        await db_1.default
            .update(schema_1.NotificationModel)
            .set({ isRead: true })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.NotificationModel.userId, userId), (0, drizzle_orm_1.eq)(schema_1.NotificationModel.isRead, false)));
        res.json({ success: true });
    }
    catch (e) {
        console.error("MARK ALL READ ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Helper: notification insert করার জন্য — controller থেকে call হবে
// ─────────────────────────────────────────────────────────────────────────────
async function createNotification({ userId, type, title, message, }) {
    try {
        await db_1.default.insert(schema_1.NotificationModel).values({ userId, type, title, message });
    }
    catch (e) {
        console.error("CREATE NOTIFICATION ERROR:", e);
    }
}
