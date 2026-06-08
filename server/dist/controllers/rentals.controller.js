"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyNumberRentals = getMyNumberRentals;
exports.getAllNumberRentals = getAllNumberRentals;
const db_1 = __importDefault(require("@/db"));
const schema_1 = require("@/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
// ─────────────────────────────────────────────
// GET /api/rentals/numbers
// Current user এর সব LTR + OTR rentals
// ─────────────────────────────────────────────
async function getMyNumberRentals(req, res) {
    try {
        const payload = req.payload;
        const { page, limit, type } = zod_1.z.object({
            page: zod_1.z.coerce.number().int().min(1).catch(1),
            limit: zod_1.z.coerce.number().int().min(1).max(100).catch(20),
            type: zod_1.z.enum(["ltr", "otr", "all"]).catch("all"),
        }).parse(req.query);
        const offset = (page - 1) * limit;
        // FIX: in-memory pagination সরানো হয়েছে।
        // LTR + OTR আলাদা type হওয়ায় একটাই DB query তে merge+sort+paginate সম্ভব না।
        // তাই count query আলাদা করে total বের করা হচ্ছে, তারপর প্রতিটা থেকে
        // প্রয়োজনীয় rows টেনে JS এ final sort+slice — কিন্তু এখন শুধু
        // (offset + limit) rows পর্যন্ত টানা হচ্ছে, সব নয়।
        const [ltrRentals, otrRentals, ltrCount, otrCount] = await Promise.all([
            type !== "otr"
                ? db_1.default.query.LongTermRentsModel.findMany({
                    where: (m, { eq }) => eq(m.userId, payload.id),
                    orderBy: [(0, drizzle_orm_1.desc)(schema_1.LongTermRentsModel.createdAt)],
                    limit: offset + limit,
                })
                : [],
            type !== "ltr"
                ? db_1.default.query.OneTimeRentModel.findMany({
                    where: (m, { eq }) => eq(m.userId, payload.id),
                    orderBy: [(0, drizzle_orm_1.desc)(schema_1.OneTimeRentModel.createdAt)],
                    limit: offset + limit,
                })
                : [],
            type !== "otr"
                ? db_1.default.select({ c: (0, drizzle_orm_1.sql) `count(*)::int` })
                    .from(schema_1.LongTermRentsModel)
                    .where((0, drizzle_orm_1.eq)(schema_1.LongTermRentsModel.userId, payload.id))
                    .then((r) => r.at(0)?.c ?? 0)
                : 0,
            type !== "ltr"
                ? db_1.default.select({ c: (0, drizzle_orm_1.sql) `count(*)::int` })
                    .from(schema_1.OneTimeRentModel)
                    .where((0, drizzle_orm_1.eq)(schema_1.OneTimeRentModel.userId, payload.id))
                    .then((r) => r.at(0)?.c ?? 0)
                : 0,
        ]);
        const merged = [
            ...ltrRentals.map((r) => ({ ...r, rentKind: "ltr" })),
            ...otrRentals.map((r) => ({ ...r, rentKind: "otr" })),
        ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const total = ltrCount + otrCount;
        const paginated = merged.slice(offset, offset + limit);
        res.json({
            success: true,
            rentals: paginated,
            total,
            totalPage: Math.ceil(total / limit),
        });
    }
    catch {
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─────────────────────────────────────────────
// GET /api/admin/rentals/numbers
// Admin — সব users এর LTR + OTR rentals
// ─────────────────────────────────────────────
async function getAllNumberRentals(req, res) {
    try {
        const { page, limit, type, userId } = zod_1.z.object({
            page: zod_1.z.coerce.number().int().min(1).catch(1),
            limit: zod_1.z.coerce.number().int().min(1).max(100).catch(20),
            type: zod_1.z.enum(["ltr", "otr", "all"]).catch("all"),
            userId: zod_1.z.coerce.number().int().positive().optional(),
        }).parse(req.query);
        const offset = (page - 1) * limit;
        // FIX: in-memory pagination সরানো হয়েছে — count query আলাদা করে total বের করা।
        const [ltrRentals, otrRentals, ltrCount, otrCount] = await Promise.all([
            type !== "otr"
                ? db_1.default.query.LongTermRentsModel.findMany({
                    where: userId ? (m, { eq }) => eq(m.userId, userId) : undefined,
                    orderBy: [(0, drizzle_orm_1.desc)(schema_1.LongTermRentsModel.createdAt)],
                    limit: offset + limit,
                })
                : [],
            type !== "ltr"
                ? db_1.default.query.OneTimeRentModel.findMany({
                    where: userId ? (m, { eq }) => eq(m.userId, userId) : undefined,
                    orderBy: [(0, drizzle_orm_1.desc)(schema_1.OneTimeRentModel.createdAt)],
                    limit: offset + limit,
                })
                : [],
            type !== "otr"
                ? db_1.default.select({ c: (0, drizzle_orm_1.sql) `count(*)::int` })
                    .from(schema_1.LongTermRentsModel)
                    .where(userId ? (0, drizzle_orm_1.eq)(schema_1.LongTermRentsModel.userId, userId) : undefined)
                    .then((r) => r.at(0)?.c ?? 0)
                : 0,
            type !== "ltr"
                ? db_1.default.select({ c: (0, drizzle_orm_1.sql) `count(*)::int` })
                    .from(schema_1.OneTimeRentModel)
                    .where(userId ? (0, drizzle_orm_1.eq)(schema_1.OneTimeRentModel.userId, userId) : undefined)
                    .then((r) => r.at(0)?.c ?? 0)
                : 0,
        ]);
        const userIds = [...new Set([
                ...ltrRentals.map((r) => r.userId),
                ...otrRentals.map((r) => r.userId),
            ])];
        const users = userIds.length
            ? await db_1.default.query.UserModel.findMany({
                where: (m, { inArray }) => inArray(m.id, userIds),
                columns: { id: true, username: true, email: true },
            })
            : [];
        const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
        const merged = [
            ...ltrRentals.map((r) => ({
                ...r,
                rentKind: "ltr",
                user: userMap[r.userId] || null,
            })),
            ...otrRentals.map((r) => ({
                ...r,
                rentKind: "otr",
                user: userMap[r.userId] || null,
            })),
        ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const total = ltrCount + otrCount;
        const paginated = merged.slice(offset, offset + limit);
        res.json({
            success: true,
            rentals: paginated,
            total,
            totalPage: Math.ceil(total / limit),
        });
    }
    catch {
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
