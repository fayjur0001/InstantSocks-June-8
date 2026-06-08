"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = getUsers;
exports.banUser = banUser;
exports.unbanUser = unbanUser;
exports.changePassword = changePassword;
exports.changeRole = changeRole;
exports.addBalance = addBalance;
exports.editUser = editUser;
exports.getAllTransactions = getAllTransactions;
const db_1 = __importDefault(require("@/db"));
const schema_1 = require("@/db/schema");
const unlogging_error_1 = __importDefault(require("@/utils/unlogging-error"));
const pusher_1 = __importDefault(require("@/utils/pusher"));
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function getUsers(req, res) {
    try {
        const { page, limit, username, email, role, type } = zod_1.z.object({
            page: zod_1.z.coerce.number().int().min(1).catch(1),
            limit: zod_1.z.coerce.number().int().min(1).catch(20),
            username: zod_1.z.string().optional(),
            email: zod_1.z.string().optional(),
            role: zod_1.z.string().catch("all role"),
            type: zod_1.z.string().catch("all"),
        }).parse(req.query);
        const offset = (page - 1) * limit;
        const userId = req.payload.id;
        const query = db_1.default.select({
            id: schema_1.UserModel.id,
            username: schema_1.UserModel.username,
            email: schema_1.UserModel.email,
            role: schema_1.UserModel.role,
            lastActivity: schema_1.UserModel.updatedAt,
            isOnline: schema_1.UserModel.isOnline,
            // FIXED: expose both banned fields separately so frontend can
            // distinguish permanent ban from time-limited suspension
            banned: schema_1.UserModel.banned,
            bannedTill: schema_1.UserModel.bannedTill,
        }).from(schema_1.UserModel).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.ne)(schema_1.UserModel.role, "super admin"), (0, drizzle_orm_1.ne)(schema_1.UserModel.id, userId), username ? (0, drizzle_orm_1.sql) `${schema_1.UserModel.username} ~* ${username}` : undefined, email ? (0, drizzle_orm_1.sql) `${schema_1.UserModel.email} ~* ${email}` : undefined, role === "all role" ? undefined : (0, drizzle_orm_1.eq)(schema_1.UserModel.role, role), type === "online" ? (0, drizzle_orm_1.eq)(schema_1.UserModel.isOnline, true) :
            type === "suspended" ? (0, drizzle_orm_1.sql) `${schema_1.UserModel.bannedTill} > now()` :
                type === "banned" ? (0, drizzle_orm_1.eq)(schema_1.UserModel.banned, true) : undefined)).as("query");
        const [users, total] = await Promise.all([
            db_1.default.select().from(query).offset(offset).limit(limit).orderBy((0, drizzle_orm_1.desc)(query.isOnline), (0, drizzle_orm_1.desc)(query.id), (0, drizzle_orm_1.asc)(query.username)),
            db_1.default.select({ total: (0, drizzle_orm_1.sql) `count(*)::int` }).from(query).then((r) => r.at(0)?.total || 0),
        ]);
        // ✅ FIX Bug 2: প্রতিটা user-এর জন্য আলাদা query না করে
        //    এই page-এর সব user-এর balance ও topUp একটা bulk query-তে বের করা হচ্ছে
        //    (getBalance() utility N বার call করলে N*8 DB query হতো — এটা তার পরিবর্তে)
        const pageUserIds = users.map((u) => u.id);
        if (pageUserIds.length === 0) {
            return res.json({ success: true, users: [], totalPage: Math.ceil(total / limit) });
        }
        // Bulk query: প্রতিটা user-এর approved deposit sum
        const topUpRows = await db_1.default
            .select({
            userId: schema_1.AddedFundModel.userId,
            total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.AddedFundModel.amount}), 0)::real`,
        })
            .from(schema_1.AddedFundModel)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.AddedFundModel.userId, pageUserIds), (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.status, "approved")))
            .groupBy(schema_1.AddedFundModel.userId);
        // Bulk query: প্রতিটা user-এর মোট spending (সব transaction table থেকে)
        // প্রতিটা table আলাদা query, কিন্তু pageUserIds-এ filter — loop নেই
        const spendingQueries = await Promise.all([
            db_1.default.select({ userId: schema_1.OneTimeRentModel.userId, total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.OneTimeRentModel.price}), 0)::real` })
                .from(schema_1.OneTimeRentModel)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.OneTimeRentModel.userId, pageUserIds), (0, drizzle_orm_1.inArray)(schema_1.OneTimeRentModel.status, ["Awaiting MDN", "Completed", "Reserved"])))
                .groupBy(schema_1.OneTimeRentModel.userId),
            db_1.default.select({ userId: schema_1.LongTermRentsModel.userId, total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.LongTermRentsModel.price}), 0)::real` })
                .from(schema_1.LongTermRentsModel)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.LongTermRentsModel.userId, pageUserIds), (0, drizzle_orm_1.inArray)(schema_1.LongTermRentsModel.status, ["Reserved", "Active", "Awaiting MDN", "Expired", "Completed"])))
                .groupBy(schema_1.LongTermRentsModel.userId),
            db_1.default.select({ userId: schema_1.DeviceTransactionModel.userId, total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.DeviceTransactionModel.price}), 0)::real` })
                .from(schema_1.DeviceTransactionModel)
                .where((0, drizzle_orm_1.inArray)(schema_1.DeviceTransactionModel.userId, pageUserIds))
                .groupBy(schema_1.DeviceTransactionModel.userId),
            db_1.default.select({ userId: schema_1.RentedProxyModel.userId, total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.RentedProxyModel.price}), 0)::real` })
                .from(schema_1.RentedProxyModel)
                .where((0, drizzle_orm_1.inArray)(schema_1.RentedProxyModel.userId, pageUserIds))
                .groupBy(schema_1.RentedProxyModel.userId),
            db_1.default.select({ userId: schema_1.Socks5ProxyTransactionModel.userId, total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.Socks5ProxyTransactionModel.price}), 0)::real` })
                .from(schema_1.Socks5ProxyTransactionModel)
                .where((0, drizzle_orm_1.inArray)(schema_1.Socks5ProxyTransactionModel.userId, pageUserIds))
                .groupBy(schema_1.Socks5ProxyTransactionModel.userId),
            db_1.default.select({ userId: schema_1.SMSPVAOneTimeRentModel.userId, total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.SMSPVAOneTimeRentModel.price}), 0)::real` })
                .from(schema_1.SMSPVAOneTimeRentModel)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.SMSPVAOneTimeRentModel.userId, pageUserIds), (0, drizzle_orm_1.inArray)(schema_1.SMSPVAOneTimeRentModel.status, ["Awaiting MDN", "Completed", "Reserved"])))
                .groupBy(schema_1.SMSPVAOneTimeRentModel.userId),
            db_1.default.select({ userId: schema_1.SMSPVALongTermRentModel.userId, total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.SMSPVALongTermRentModel.price}), 0)::real` })
                .from(schema_1.SMSPVALongTermRentModel)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.SMSPVALongTermRentModel.userId, pageUserIds), (0, drizzle_orm_1.inArray)(schema_1.SMSPVALongTermRentModel.status, ["Reserved", "Active", "Awaiting MDN", "Expired", "Completed"])))
                .groupBy(schema_1.SMSPVALongTermRentModel.userId),
        ]);
        // userId → total deposit map
        const topUpMap = new Map(topUpRows.map((r) => [r.userId, r.total]));
        // userId → total spending map (সব table merge করা)
        const spendingMap = new Map();
        for (const tableRows of spendingQueries) {
            for (const row of tableRows) {
                spendingMap.set(row.userId, (spendingMap.get(row.userId) ?? 0) + row.total);
            }
        }
        // Users-এ balance fields যোগ করা
        const usersWithBalance = users.map((u) => {
            const topUp = topUpMap.get(u.id) ?? 0;
            const spent = spendingMap.get(u.id) ?? 0;
            return {
                ...u,
                totalTopUp: topUp,
                currentBalance: topUp - spent,
            };
        });
        res.json({ success: true, users: usersWithBalance, totalPage: Math.ceil(total / limit) });
    }
    catch (e) {
        console.error("GET USERS ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
async function banUser(req, res) {
    try {
        // ✅ FIX: id route param থেকে (PATCH /:id/ban), forSevenDays body থেকে
        const id = zod_1.z.coerce.number().int().min(1).parse(req.params.id);
        const { forSevenDays } = zod_1.z.object({
            forSevenDays: zod_1.z.coerce.boolean().default(false),
        }).parse(req.body);
        // FIXED: prevent banning admin/super admin
        const target = await db_1.default.query.UserModel.findFirst({
            where: (m, { eq }) => eq(m.id, id),
            columns: { role: true },
        });
        if (!target) {
            res.status(404).json({ success: false, message: "User not found." });
            return;
        }
        if (target.role === "admin" || target.role === "super admin") {
            res.status(403).json({ success: false, message: "Cannot ban admin users." });
            return;
        }
        await db_1.default.update(schema_1.UserModel)
            .set(forSevenDays ? { bannedTill: (0, drizzle_orm_1.sql) `now() + '7 days'::interval` } : { banned: true })
            .where((0, drizzle_orm_1.eq)(schema_1.UserModel.id, id));
        await (0, pusher_1.default)({ page: "/admin-area/users", to: "admin" });
        res.json({ success: true });
    }
    catch (e) {
        console.error("BAN USER ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
async function unbanUser(req, res) {
    try {
        // ✅ FIX: id route param থেকে (PATCH /:id/unban)
        const id = zod_1.z.coerce.number().int().min(1).parse(req.params.id);
        // FIX 1: Set bannedTill to NULL (not now()) so frontend mapUser correctly
        //         resolves status as "offline" instead of potentially "suspended"
        // FIX 2: Removed the or(banned, bannedTill) condition — it silently matched
        //         0 rows and returned 200 OK without actually updating anything.
        //         Trust the admin: if they click unban, clear both ban fields unconditionally.
        // FIX 3: Use .returning() to detect if the row was actually found and updated.
        const updated = await db_1.default.update(schema_1.UserModel)
            .set({ banned: false, bannedTill: null })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.UserModel.id, id), (0, drizzle_orm_1.notInArray)(schema_1.UserModel.role, ["super admin", "admin"])))
            .returning({ id: schema_1.UserModel.id })
            .then((r) => r.at(0));
        if (!updated) {
            res.status(404).json({ success: false, message: "User not found or cannot unban this user." });
            return;
        }
        await (0, pusher_1.default)({ page: "/admin-area/users", to: "admin" });
        res.json({ success: true });
    }
    catch (e) {
        console.error("UNBAN USER ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
async function changePassword(req, res) {
    try {
        // ✅ FIX: id route param থেকে (PATCH /:id/password)
        const id = zod_1.z.coerce.number().int().min(1).parse(req.params.id);
        const { password } = zod_1.z.object({
            password: zod_1.z.string().min(8),
        }).parse(req.body);
        // ✅ FIX: async hash — event loop block হবে না
        const hashed = await bcryptjs_1.default.hash(password, 10);
        await db_1.default.update(schema_1.UserModel)
            .set({ password: hashed })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.UserModel.id, id), (0, drizzle_orm_1.notInArray)(schema_1.UserModel.role, ["admin", "super admin"])));
        res.json({ success: true });
    }
    catch (e) {
        console.error("CHANGE PASSWORD ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
async function changeRole(req, res) {
    try {
        // ✅ FIX: id route param থেকে (PATCH /:id/role)
        const id = zod_1.z.coerce.number().int().min(1).parse(req.params.id);
        const { role } = zod_1.z.object({
            role: zod_1.z.enum(["general", "support", "admin"]),
        }).parse(req.body);
        // FIXED: only block super admin — allow changing role of general/support/admin users
        const updated = await db_1.default.update(schema_1.UserModel)
            .set({ role })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.UserModel.id, id), (0, drizzle_orm_1.notInArray)(schema_1.UserModel.role, ["super admin"])))
            .returning({ id: schema_1.UserModel.id, agentSerial: schema_1.UserModel.agentSerial })
            .then((r) => r.at(0));
        if (!updated) {
            res.status(404).json({ success: false, message: "User not found or cannot change role of super admin." });
            return;
        }
        // ── Agent Serial Auto-assign ──────────────────────────────────────────────
        // support বা admin role পেলে agentSerial assign করো (না থাকলে)
        if ((role === "support" || role === "admin") && updated.agentSerial === null) {
            const maxRow = await db_1.default.query.UserModel.findMany({
                columns: { agentSerial: true },
                orderBy: (u, { desc }) => desc(u.agentSerial),
                limit: 1,
            });
            const nextSerial = (maxRow[0]?.agentSerial ?? 0) + 1;
            await db_1.default
                .update(schema_1.UserModel)
                .set({ agentSerial: nextSerial })
                .where((0, drizzle_orm_1.eq)(schema_1.UserModel.id, id));
        }
        // general role এ ফিরলে agentSerial মুছবো না (ID permanent থাকবে)
        await (0, pusher_1.default)({ page: "/admin-area/users", to: "admin" });
        res.json({ success: true });
    }
    catch (e) {
        console.error("CHANGE ROLE ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
async function addBalance(req, res) {
    try {
        const { id } = zod_1.z.object({
            id: zod_1.z.coerce.number().int().min(1),
        }).parse(req.params);
        const { amount, currency, walletAddress, txid } = zod_1.z.object({
            amount: zod_1.z.number().positive(),
            currency: zod_1.z.string().min(1),
            walletAddress: zod_1.z.string().min(1),
            txid: zod_1.z.string().optional(),
        }).parse(req.body);
        const user = await db_1.default.query.UserModel.findFirst({
            where: (m, { eq }) => eq(m.id, id),
            columns: { id: true },
        });
        if (!user)
            throw new unlogging_error_1.default("User not found.");
        await db_1.default.insert(schema_1.AddedFundModel).values({
            userId: id,
            amount,
            currency,
            walletAddress,
            txid: txid ?? null,
            status: "approved",
            method: "now_payments",
            manualyUploaded: true,
        });
        await Promise.all([
            (0, pusher_1.default)({ page: "/admin-area/users", to: "admin" }),
            (0, pusher_1.default)({ page: "/admin-area/transactions", to: "admin" }),
            (0, pusher_1.default)({ page: "/top-up/transactions", to: `user-${id}` }),
            (0, pusher_1.default)({ page: "/header/user", to: `user-${id}` }),
        ]);
        res.json({ success: true });
    }
    catch (e) {
        console.error("ADD BALANCE ERROR:", e);
        if (e instanceof unlogging_error_1.default) {
            res.status(400).json({ success: false, message: e.message });
            return;
        }
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
async function editUser(req, res) {
    try {
        // ✅ FIX: id route param থেকে (PUT /:id)
        const id = zod_1.z.coerce.number().int().min(1).parse(req.params.id);
        const { username, email } = zod_1.z.object({
            username: zod_1.z.string().min(1),
            email: zod_1.z.string().email(),
        }).parse(req.body);
        // ✅ FIX: duplicate check — unique constraint error আসার আগেই proper 409 দাও
        const conflict = await db_1.default.query.UserModel.findFirst({
            where: (m, { and, or, eq, ne }) => and(or(eq(m.username, username), eq(m.email, email)), ne(m.id, id)),
            columns: { username: true, email: true },
        });
        if (conflict) {
            const field = conflict.username === username ? "Username" : "Email";
            throw new unlogging_error_1.default(`${field} is already taken.`);
        }
        const updated = await db_1.default.update(schema_1.UserModel)
            .set({ username, email })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.UserModel.id, id), (0, drizzle_orm_1.notInArray)(schema_1.UserModel.role, ["super admin", "admin"])))
            .returning({ id: schema_1.UserModel.id })
            .then((r) => r.at(0));
        if (!updated)
            throw new unlogging_error_1.default("User not found.");
        await (0, pusher_1.default)({ page: "/admin-area/users", to: "admin" });
        await (0, pusher_1.default)({ page: "/header/user", to: `user-${updated.id}` });
        res.json({ success: true });
    }
    catch (e) {
        console.error("EDIT USER ERROR:", e);
        if (e instanceof unlogging_error_1.default) {
            res.status(400).json({ success: false, message: e.message });
            return;
        }
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// GET /api/admin/transactions — all users' deposit transactions (admin only)
async function getAllTransactions(req, res) {
    try {
        const { page, limit, status, userId } = zod_1.z.object({
            page: zod_1.z.coerce.number().int().min(1).catch(1),
            limit: zod_1.z.coerce.number().int().min(1).max(100).catch(20),
            status: zod_1.z.enum(["pending", "approved", "rejected", "all"]).catch("all"),
            userId: zod_1.z.coerce.number().int().min(1).optional(),
        }).parse(req.query);
        const offset = (page - 1) * limit;
        const where = (0, drizzle_orm_1.and)(userId ? (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.userId, userId) : undefined, status !== "all" ? (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.status, status) : undefined);
        const [transactions, totalRows] = await Promise.all([
            db_1.default
                .select({
                id: schema_1.AddedFundModel.id,
                date: schema_1.AddedFundModel.createdAt,
                wallet: schema_1.AddedFundModel.currency,
                walletAddress: schema_1.AddedFundModel.walletAddress,
                txnId: schema_1.AddedFundModel.txid,
                amount: schema_1.AddedFundModel.amount,
                status: schema_1.AddedFundModel.status,
                method: schema_1.AddedFundModel.method,
                manuallyUploaded: schema_1.AddedFundModel.manualyUploaded,
                userId: schema_1.AddedFundModel.userId,
                username: schema_1.UserModel.username,
            })
                .from(schema_1.AddedFundModel)
                .leftJoin(schema_1.UserModel, (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.userId, schema_1.UserModel.id))
                .where(where)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.AddedFundModel.id))
                .offset(offset)
                .limit(limit),
            db_1.default
                .select({ total: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(schema_1.AddedFundModel)
                .where(where)
                .then((r) => r.at(0)?.total ?? 0),
        ]);
        res.json({
            success: true,
            transactions,
            totalPage: Math.ceil(totalRows / limit),
            total: totalRows,
        });
    }
    catch (e) {
        console.error("GET ALL TRANSACTIONS ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
