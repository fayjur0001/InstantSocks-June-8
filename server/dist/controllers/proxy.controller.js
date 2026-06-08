"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProxyList = getProxyList;
exports.getCart = getCart;
exports.addToCart = addToCart;
exports.removeFromCart = removeFromCart;
exports.rentProxy = rentProxy;
exports.getMyRentals = getMyRentals;
exports.getProxyAuth = getProxyAuth;
exports.updateProxyAuth = updateProxyAuth;
exports.swapPort = swapPort;
exports.renewProxy = renewProxy;
exports.adminGetAllProxies = adminGetAllProxies;
exports.adminGetProxyIPs = adminGetProxyIPs;
const crypto_1 = require("crypto");
const db_1 = __importDefault(require("@/db"));
const schema_1 = require("@/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const get_balance_1 = __importDefault(require("@/utils/get-balance"));
const site_options_1 = __importDefault(require("@/utils/site-options"));
const notification_controller_1 = require("@/controllers/notification.controller");
const nsocks_adapter_1 = require("@/utils/nsocks.adapter");
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/proxy/list
// ─────────────────────────────────────────────────────────────────────────────
async function getProxyList(req, res) {
    try {
        const { country, type, state, page, limit } = zod_1.z
            .object({
            country: zod_1.z.string().optional(),
            type: zod_1.z.string().optional(),
            state: zod_1.z.string().optional(),
            page: zod_1.z.coerce.number().int().min(1).catch(1),
            limit: zod_1.z.coerce.number().int().min(1).max(100).catch(20),
        })
            .parse(req.query);
        const USE_MOCK = process.env.MOCK_SERVICES === "true";
        if (USE_MOCK) {
            const mockProxies = Array.from({ length: 50 }, (_, i) => ({
                id: `proxy-${i + 1}`,
                ip: `192.168.${Math.floor(i / 10)}.${i % 10 + 1}`,
                domain: `proxy${i + 1}.example.com`,
                countryCode: country || "US",
                country: "United States",
                state: state || "New York",
                city: "New York City",
                isp: "T-Mobile",
                zip: "10001",
                speed: "50Mbps",
                ping: Math.floor(Math.random() * 100) + 10,
                type: type || "ISP",
                added: new Date().toISOString(),
                price: parseFloat((Math.random() * 5 + 1).toFixed(2)),
                org: "T-Mobile USA",
                zone: "EST",
                dns: "8.8.8.8",
                blacklisted: false,
                usage: "0/100GB",
                connectionString: `socks5://user:pass@192.168.0.${i + 1}:1080`,
            }));
            const offset = (page - 1) * limit;
            const filtered = mockProxies.slice(offset, offset + limit);
            return res.json({
                success: true,
                proxies: filtered,
                total: mockProxies.length,
                totalPage: Math.ceil(mockProxies.length / limit),
            });
        }
        // ── Real NSocks API ──────────────────────────────────────────────────────
        const [apiKey, commissionPct] = await Promise.all([
            site_options_1.default.socks5ProxyAPIKey.get(),
            site_options_1.default.transactionCut.Socks5Proxy.get(),
        ]);
        if (!apiKey) {
            return res.status(503).json({
                success: false,
                message: "Proxy provider not configured. Contact admin.",
            });
        }
        const data = await (0, nsocks_adapter_1.nsocksFetchList)(apiKey, { country, type, state, page, limit });
        // Commission apply: price = originalPrice * (1 + commission/100)
        const proxiesWithMarkup = data.proxies.map((p) => ({
            ...p,
            originalPrice: p.price,
            price: commissionPct > 0
                ? parseFloat((p.price * (1 + commissionPct / 100)).toFixed(4))
                : p.price,
        }));
        return res.json({
            success: true,
            proxies: proxiesWithMarkup,
            total: data.total,
            totalPage: data.totalPage,
        });
    }
    catch (err) {
        console.error("[getProxyList]", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/proxy/cart
// ─────────────────────────────────────────────────────────────────────────────
async function getCart(req, res) {
    try {
        const userId = req.payload.id;
        const items = await db_1.default.query.Socks5ProxyCartModel.findMany({
            where: (m, { eq }) => eq(m.userId, userId),
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.Socks5ProxyCartModel.createdAt)],
        });
        return res.json({ success: true, items });
    }
    catch (err) {
        console.error("[getCart]", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/proxy/cart
// ─────────────────────────────────────────────────────────────────────────────
async function addToCart(req, res) {
    try {
        const userId = req.payload.id;
        const { proxyId, price, originalPrice } = zod_1.z
            .object({
            proxyId: zod_1.z.string().min(1),
            price: zod_1.z.number().positive(),
            originalPrice: zod_1.z.number().positive(),
        })
            .parse(req.body);
        const existing = await db_1.default.query.Socks5ProxyCartModel.findFirst({
            where: (m, { and, eq }) => and(eq(m.userId, userId), eq(m.proxyId, proxyId)),
        });
        if (existing) {
            return res
                .status(409)
                .json({ success: false, message: "Proxy already in cart." });
        }
        const [item] = await db_1.default
            .insert(schema_1.Socks5ProxyCartModel)
            .values({ userId, proxyId, price, originalPrice })
            .returning();
        return res.status(201).json({ success: true, item });
    }
    catch (err) {
        console.error("[addToCart]", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/proxy/cart/:id
// ─────────────────────────────────────────────────────────────────────────────
async function removeFromCart(req, res) {
    try {
        const userId = req.payload.id;
        const id = zod_1.z.coerce.number().int().positive().parse(req.params.id);
        const item = await db_1.default.query.Socks5ProxyCartModel.findFirst({
            where: (m, { and, eq }) => and(eq(m.id, id), eq(m.userId, userId)),
        });
        if (!item) {
            return res
                .status(404)
                .json({ success: false, message: "Cart item not found." });
        }
        await db_1.default
            .delete(schema_1.Socks5ProxyCartModel)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.Socks5ProxyCartModel.id, id), (0, drizzle_orm_1.eq)(schema_1.Socks5ProxyCartModel.userId, userId)));
        return res.json({ success: true, message: "Removed from cart." });
    }
    catch (err) {
        console.error("[removeFromCart]", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/proxy/rent
// ─────────────────────────────────────────────────────────────────────────────
async function rentProxy(req, res) {
    try {
        const userId = req.payload.id;
        // Banned/suspended user কিনতে পারবে না
        const userStatus = await db_1.default.query.UserModel.findFirst({
            where: (m, { eq }) => eq(m.id, userId),
            columns: { banned: true, bannedTill: true },
        });
        if (userStatus?.banned) {
            return res.status(403).json({
                success: false,
                message: "Your account has been banned. You cannot make purchases.",
                reason: "banned",
            });
        }
        if (userStatus?.bannedTill && userStatus.bannedTill > new Date()) {
            return res.status(403).json({
                success: false,
                message: `Your account is suspended until ${userStatus.bannedTill.toUTCString()}. You cannot make purchases.`,
                reason: "suspended",
                bannedTill: userStatus.bannedTill,
            });
        }
        const { proxyIds } = zod_1.z
            .object({ proxyIds: zod_1.z.array(zod_1.z.string()).min(1) })
            .parse(req.body);
        const cartItems = await db_1.default.query.Socks5ProxyCartModel.findMany({
            where: (m, { and, eq, inArray }) => and(eq(m.userId, userId), inArray(m.proxyId, proxyIds)),
        });
        if (cartItems.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: "No matching cart items found." });
        }
        const totalCost = cartItems.reduce((sum, i) => sum + i.price, 0);
        const USE_MOCK = process.env.MOCK_SERVICES === "true";
        let proxyDataList;
        if (USE_MOCK) {
            // Mock mode: fake data
            proxyDataList = cartItems.map((item, i) => ({
                ip: `192.168.0.${i + 1}`,
                port: "1080",
                auth: `user_${userId}:${(0, crypto_1.randomBytes)(8).toString("hex")}`,
                country: "US",
                state: "New York",
                city: "New York City",
                zip: "10001",
                type: "ISP",
            }));
        }
        else {
            // Real mode: NSocks API দিয়ে প্রতিটা proxy কিনো
            const apiKey = await site_options_1.default.socks5ProxyAPIKey.get();
            if (!apiKey) {
                return res.status(503).json({
                    success: false,
                    message: "Proxy provider not configured. Contact admin.",
                });
            }
            try {
                const nsocksResults = await Promise.all(cartItems.map((item) => (0, nsocks_adapter_1.nsocksBuyProxy)(apiKey, item.proxyId)));
                proxyDataList = nsocksResults.map((r) => ({
                    ip: r.ip,
                    port: r.port,
                    auth: r.auth,
                    country: r.country || r.countryCode,
                    state: r.state,
                    city: r.city,
                    zip: r.zip,
                    type: r.type,
                }));
            }
            catch (nsocksErr) {
                console.error("[rentProxy] NSocks buy failed:", nsocksErr);
                return res.status(502).json({
                    success: false,
                    message: "Failed to purchase from proxy provider. Please try again.",
                });
            }
        }
        // ── Unique port generation ────────────────────────────────────────────────
        async function generateUniquePort(tx) {
            for (let attempt = 0; attempt < 10; attempt++) {
                const candidate = String(Math.floor(Math.random() * 9000) + 1000);
                const existing = await tx.query.Socks5ProxyTransactionModel.findFirst({
                    where: (m, { eq }) => eq(m.port, candidate),
                    columns: { id: true },
                });
                if (!existing)
                    return candidate;
            }
            return (0, crypto_1.randomBytes)(2).readUInt16BE(0).toString();
        }
        // ── Balance check + DB insert একটা transaction এ (race condition বন্ধ) ──
        const transactions = await db_1.default.transaction(async (tx) => {
            const balance = await (0, get_balance_1.default)(userId, tx);
            if (balance < totalCost) {
                await tx.rollback();
                return null;
            }
            const ports = await Promise.all(cartItems.map(() => generateUniquePort(tx)));
            const rows = await tx
                .insert(schema_1.Socks5ProxyTransactionModel)
                .values(cartItems.map((item, i) => {
                const pd = proxyDataList[i];
                return {
                    userId,
                    port: ports[i],
                    note: null,
                    originalPrice: item.originalPrice,
                    price: item.price,
                    // Real NSocks data (mock mode এ placeholder)
                    country: pd.country,
                    // ip field এ "IP:NSocksPort" format — client এ display এর জন্য
                    ip: pd.port ? `${pd.ip}:${pd.port}` : pd.ip,
                    state: pd.state,
                    city: pd.city,
                    zip: pd.zip,
                    type: pd.type,
                    auth: pd.auth,
                };
            }))
                .returning();
            const rentedProxyIds = cartItems.map((item) => item.proxyId);
            await tx
                .delete(schema_1.Socks5ProxyCartModel)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.Socks5ProxyCartModel.userId, userId), (0, drizzle_orm_1.inArray)(schema_1.Socks5ProxyCartModel.proxyId, rentedProxyIds)));
            return rows;
        });
        if (!transactions) {
            return res
                .status(402)
                .json({ success: false, message: "Insufficient balance." });
        }
        await (0, notification_controller_1.createNotification)({
            userId,
            type: "proxy_rent",
            title: "Proxy Rented Successfully",
            message: `You have rented ${transactions.length} proxy${transactions.length > 1 ? "s" : ""} for $${totalCost.toFixed(2)}.`,
        });
        return res.status(201).json({
            success: true,
            message: "Proxy rented successfully.",
            transactions,
        });
    }
    catch (err) {
        console.error("[rentProxy]", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/proxy/my-rentals
// ─────────────────────────────────────────────────────────────────────────────
async function getMyRentals(req, res) {
    try {
        const userId = req.payload.id;
        const { page, limit } = zod_1.z
            .object({
            page: zod_1.z.coerce.number().int().min(1).catch(1),
            limit: zod_1.z.coerce.number().int().min(1).max(100).catch(20),
        })
            .parse(req.query);
        const offset = (page - 1) * limit;
        // FIX: DB-level limit/offset — in-memory pagination সরানো হয়েছে
        const [rentals, countRows] = await Promise.all([
            db_1.default.query.Socks5ProxyTransactionModel.findMany({
                where: (m, { eq }) => eq(m.userId, userId),
                orderBy: [(0, drizzle_orm_1.desc)(schema_1.Socks5ProxyTransactionModel.createdAt)],
                limit,
                offset,
            }),
            db_1.default
                .select({ c: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(schema_1.Socks5ProxyTransactionModel)
                .where((0, drizzle_orm_1.eq)(schema_1.Socks5ProxyTransactionModel.userId, userId))
                .then((r) => r.at(0)?.c ?? 0),
        ]);
        const total = countRows;
        return res.json({
            success: true,
            rentals,
            total,
            totalPage: Math.ceil(total / limit),
        });
    }
    catch (err) {
        console.error("[getMyRentals]", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/proxy/auth
// ─────────────────────────────────────────────────────────────────────────────
async function getProxyAuth(req, res) {
    try {
        const userId = req.payload.id;
        const user = await db_1.default.query.UserModel.findFirst({
            where: (m, { eq }) => eq(m.id, userId),
            columns: { username: true },
        });
        await db_1.default
            .insert(schema_1.Socks5AuthModel)
            .values({
            userId,
            username: `${user.username}_proxy`,
            password: (0, crypto_1.randomBytes)(10).toString("hex"),
        })
            .onConflictDoNothing({ target: schema_1.Socks5AuthModel.userId });
        const auth = await db_1.default.query.Socks5AuthModel.findFirst({
            where: (m, { eq }) => eq(m.userId, userId),
        });
        return res.json({ success: true, auth });
    }
    catch (err) {
        console.error("[getProxyAuth]", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/proxy/auth  ← ✅ FIXED: missing endpoint এখন আছে
// ─────────────────────────────────────────────────────────────────────────────
async function updateProxyAuth(req, res) {
    try {
        const userId = req.payload.id;
        const { username, password } = zod_1.z
            .object({
            username: zod_1.z.string().min(3, "Username must be at least 3 characters").max(50),
            password: zod_1.z.string().min(6, "Password must be at least 6 characters").max(100),
        })
            .parse(req.body);
        // Auth record না থাকলে প্রথমে create করো
        const user = await db_1.default.query.UserModel.findFirst({
            where: (m, { eq }) => eq(m.id, userId),
            columns: { username: true },
        });
        await db_1.default
            .insert(schema_1.Socks5AuthModel)
            .values({
            userId,
            username: `${user.username}_proxy`,
            password: (0, crypto_1.randomBytes)(10).toString("hex"),
        })
            .onConflictDoNothing({ target: schema_1.Socks5AuthModel.userId });
        const [updated] = await db_1.default
            .update(schema_1.Socks5AuthModel)
            .set({ username, password })
            .where((0, drizzle_orm_1.eq)(schema_1.Socks5AuthModel.userId, userId))
            .returning();
        return res.json({ success: true, auth: updated });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                message: err.errors[0]?.message || "Invalid input.",
            });
        }
        console.error("[updateProxyAuth]", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/proxy/swap-port
// ─────────────────────────────────────────────────────────────────────────────
async function swapPort(req, res) {
    try {
        const userId = req.payload.id;
        const { currentPort, newPort } = zod_1.z
            .object({
            currentPort: zod_1.z.string().min(1),
            newPort: zod_1.z.string().min(1),
        })
            .parse(req.body);
        const transaction = await db_1.default.query.Socks5ProxyTransactionModel.findFirst({
            where: (m, { and, eq }) => and(eq(m.userId, userId), eq(m.port, currentPort)),
        });
        if (!transaction) {
            return res
                .status(404)
                .json({ success: false, message: "Port not found in your rentals." });
        }
        const portConflict = await db_1.default.query.Socks5ProxyTransactionModel.findFirst({
            where: (m, { and, eq, ne }) => and(eq(m.port, newPort), ne(m.userId, userId)),
            columns: { id: true },
        });
        if (portConflict) {
            return res.status(409).json({
                success: false,
                message: "Port is already in use by another user.",
            });
        }
        await db_1.default
            .update(schema_1.Socks5ProxyTransactionModel)
            .set({ port: newPort })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.Socks5ProxyTransactionModel.userId, userId), (0, drizzle_orm_1.eq)(schema_1.Socks5ProxyTransactionModel.port, currentPort)));
        return res.json({
            success: true,
            message: `Port swapped from ${currentPort} to ${newPort}.`,
        });
    }
    catch (err) {
        console.error("[swapPort]", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/proxy/renew
// ─────────────────────────────────────────────────────────────────────────────
async function renewProxy(req, res) {
    try {
        const userId = req.payload.id;
        const { rentalId } = zod_1.z
            .object({ rentalId: zod_1.z.number().int().positive() })
            .parse(req.body);
        const existing = await db_1.default.query.Socks5ProxyTransactionModel.findFirst({
            where: (m, { and, eq }) => and(eq(m.id, rentalId), eq(m.userId, userId)),
        });
        if (!existing) {
            return res
                .status(404)
                .json({ success: false, message: "Rental not found." });
        }
        const renewed = await db_1.default.transaction(async (tx) => {
            const balance = await (0, get_balance_1.default)(userId, tx);
            if (balance < existing.price) {
                await tx.rollback();
                return null;
            }
            const [row] = await tx
                .insert(schema_1.Socks5ProxyTransactionModel)
                .values({
                userId,
                port: existing.port,
                note: existing.note,
                originalPrice: existing.originalPrice,
                price: existing.price,
                country: existing.country,
                ip: existing.ip,
                state: existing.state,
                city: existing.city,
                zip: existing.zip,
                type: existing.type,
                auth: existing.auth,
            })
                .returning();
            return row;
        });
        if (!renewed) {
            return res
                .status(402)
                .json({ success: false, message: "Insufficient balance." });
        }
        return res.status(201).json({
            success: true,
            message: "Proxy renewed successfully.",
            transaction: renewed,
        });
    }
    catch (err) {
        console.error("[renewProxy]", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/proxy/all
// ─────────────────────────────────────────────────────────────────────────────
async function adminGetAllProxies(req, res) {
    try {
        const { page, limit, userId } = zod_1.z
            .object({
            page: zod_1.z.coerce.number().int().min(1).catch(1),
            limit: zod_1.z.coerce.number().int().min(1).max(100).catch(20),
            userId: zod_1.z.coerce.number().int().positive().optional(),
        })
            .parse(req.query);
        const offset = (page - 1) * limit;
        const where = userId
            ? (m, { eq }) => eq(m.userId, userId)
            : undefined;
        const [all, countRows] = await Promise.all([
            db_1.default.query.Socks5ProxyTransactionModel.findMany({
                where,
                orderBy: [(0, drizzle_orm_1.desc)(schema_1.Socks5ProxyTransactionModel.createdAt)],
                limit,
                offset,
            }),
            db_1.default
                .select({ c: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(schema_1.Socks5ProxyTransactionModel)
                .where(userId ? (0, drizzle_orm_1.eq)(schema_1.Socks5ProxyTransactionModel.userId, userId) : undefined)
                .then((r) => r.at(0)?.c ?? 0),
        ]);
        const userIds = [...new Set(all.map((t) => t.userId))];
        const users = userIds.length
            ? await db_1.default.query.UserModel.findMany({
                where: (m, { inArray }) => inArray(m.id, userIds),
                columns: { id: true, username: true, email: true },
            })
            : [];
        const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
        const withUser = all.map((t) => ({ ...t, user: userMap[t.userId] || null }));
        const total = countRows;
        return res.json({
            success: true,
            transactions: withUser,
            total,
            totalPage: Math.ceil(total / limit),
        });
    }
    catch (err) {
        console.error("[adminGetAllProxies]", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/proxy/ips
// ─────────────────────────────────────────────────────────────────────────────
async function adminGetProxyIPs(req, res) {
    try {
        const { country, type, state, page, limit } = zod_1.z
            .object({
            country: zod_1.z.string().optional(),
            type: zod_1.z.string().optional(),
            state: zod_1.z.string().optional(),
            page: zod_1.z.coerce.number().int().min(1).catch(1),
            limit: zod_1.z.coerce.number().int().min(1).max(100).catch(20),
        })
            .parse(req.query);
        const USE_MOCK = process.env.MOCK_SERVICES === "true";
        if (USE_MOCK) {
            const resolvedCountry = country || "US";
            const resolvedState = state || "New York";
            const mockIPs = Array.from({ length: 100 }, (_, i) => ({
                id: `ip-${i + 1}`,
                ip: `10.0.${Math.floor(i / 10)}.${i % 10 + 1}`,
                domain: `proxy${i + 1}.mock.example.com`,
                countryCode: resolvedCountry,
                country: resolvedCountry,
                state: resolvedState,
                city: "New York City",
                isp: "T-Mobile",
                zip: "10001",
                speed: "50Mbps",
                ping: Math.floor(Math.random() * 100) + 10,
                type: type || "ISP",
                added: new Date().toISOString(),
                org: "T-Mobile USA",
                zone: "EST",
                dns: "8.8.8.8",
                blacklisted: Math.random() > 0.9,
                usage: "0/100GB",
                connectionString: `socks5://user:pass@10.0.0.${i + 1}:1080`,
                price: parseFloat((Math.random() * 5 + 1).toFixed(2)),
                originalPrice: parseFloat((Math.random() * 4 + 1).toFixed(2)),
            }));
            const offset = (page - 1) * limit;
            const filtered = mockIPs.slice(offset, offset + limit);
            return res.json({
                success: true,
                proxies: filtered,
                total: mockIPs.length,
                totalPage: Math.ceil(mockIPs.length / limit),
            });
        }
        // ── Real NSocks API ──────────────────────────────────────────────────────
        const [apiKey, commissionPct] = await Promise.all([
            site_options_1.default.socks5ProxyAPIKey.get(),
            site_options_1.default.transactionCut.Socks5Proxy.get(),
        ]);
        if (!apiKey) {
            return res.status(503).json({
                success: false,
                message: "Proxy provider API key not configured.",
            });
        }
        const data = await (0, nsocks_adapter_1.nsocksFetchList)(apiKey, { country, type, state, page, limit });
        // Commission apply: price = originalPrice * (1 + commission/100)
        const proxiesWithMarkup = data.proxies.map((p) => ({
            ...p,
            originalPrice: p.price,
            price: commissionPct > 0
                ? parseFloat((p.price * (1 + commissionPct / 100)).toFixed(4))
                : p.price,
        }));
        return res.json({
            success: true,
            proxies: proxiesWithMarkup,
            total: data.total,
            totalPage: data.totalPage,
        });
    }
    catch (err) {
        console.error("[adminGetProxyIPs]", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
