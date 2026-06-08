"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServices = getServices;
exports.rentOneTime = rentOneTime;
exports.rentLongTerm = rentLongTerm;
const db_1 = __importDefault(require("@/db"));
const schema_1 = require("@/db/schema");
const unlogging_error_1 = __importDefault(require("@/utils/unlogging-error"));
const pusher_1 = __importDefault(require("@/utils/pusher"));
const site_options_1 = __importDefault(require("@/utils/site-options"));
const get_balance_1 = __importDefault(require("@/utils/get-balance"));
const constants_1 = require("@/utils/constants");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const apiUrlBase = process.env.NUMBERS_API_URL || "";
function getApiUrl() { return apiUrlBase; }
// ─────────────────────────────────────────────
// GET /api/numbers/services
// ─────────────────────────────────────────────
async function getServices(_req, res) {
    try {
        // FIX: USE_MOCK এখন env var দিয়ে control হচ্ছে।
        // .env তে MOCK_SERVICES=true রাখলে mock, না রাখলে real API।
        const USE_MOCK = process.env.MOCK_SERVICES === "true";
        if (USE_MOCK) {
            return res.json({
                success: true,
                services: [
                    {
                        name: "telegram",
                        available: 10,
                        ltrAvailable: 5,
                        price: 1.5,
                        ltrShortPrice: 3.0,
                        ltrRegularPrice: 8.0,
                        ltrUnlimitedPrice: 13.0,
                    },
                    {
                        name: "whatsapp",
                        available: 7,
                        ltrAvailable: 3,
                        price: 2.0,
                        ltrShortPrice: 4.0,
                        ltrRegularPrice: 10.0,
                        ltrUnlimitedPrice: 15.0,
                    },
                ],
            });
        }
        // 🔽 original code (unchanged)
        const user = await site_options_1.default.apiUser.get();
        const api_key = await site_options_1.default.apiKey.get();
        const url = new URL(getApiUrl());
        url.searchParams.set("cmd", "list_services");
        url.searchParams.set("user", user);
        url.searchParams.set("api_key", api_key);
        const r = await fetch(url.toString()).then((r) => r.json());
        if (r.status === "error")
            throw new unlogging_error_1.default(r.message);
        const [otrCut, ltrShortCut, ltrRegularCut, ltrUnlimitedCut] = await Promise.all([
            site_options_1.default.transactionCut.OneTime.get(),
            site_options_1.default.transactionCut.LongTerm.short.get(),
            site_options_1.default.transactionCut.LongTerm.regular.get(),
            site_options_1.default.transactionCut.LongTerm.unlimited.get(),
        ]);
        const services = r.message.map((s) => {
            const price = Number(s.price);
            const ltrShortPrice = Number(s.ltr_short_price);
            const ltrRegularPrice = Number(s.ltr_price);
            const ltrUnlimitedPrice = ltrRegularPrice + 5;
            return {
                name: s.name,
                available: Number(s.otp_available),
                ltrAvailable: Number(s.ltr_available),
                price: price + (price * otrCut) / 100,
                ltrShortPrice: ltrShortPrice + (ltrShortPrice * ltrShortCut) / 100,
                ltrRegularPrice: ltrRegularPrice + (ltrRegularPrice * ltrRegularCut) / 100,
                ltrUnlimitedPrice: ltrUnlimitedPrice +
                    (ltrUnlimitedPrice * ltrUnlimitedCut) / 100,
            };
        });
        res.json({ success: true, services });
    }
    catch (e) {
        if (e instanceof unlogging_error_1.default) {
            res.status(400).json({ success: false, message: e.message });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}
// ─────────────────────────────────────────────
// POST /api/numbers/rent/otr  ← নতুন
// ─────────────────────────────────────────────
async function rentOneTime(req, res) {
    try {
        const payload = req.payload;
        const { name } = zod_1.z.object({ name: zod_1.z.string().min(1) }).parse(req.body);
        // FIX: USE_MOCK এখন env var দিয়ে control হচ্ছে।
        const USE_MOCK = process.env.MOCK_SERVICES === "true";
        if (USE_MOCK) {
            // fake delay (real feel er jonno optional)
            await new Promise((r) => setTimeout(r, 500));
            return res.json({
                success: true,
                mdn: "+88017" + Math.floor(10000000 + Math.random() * 90000000), // random BD number
                requestId: "mock_" + Date.now(),
            });
        }
        // 🔽 original code (unchanged)
        const result = await db_1.default.transaction(async (tx) => {
            await tx
                .select({ id: schema_1.UserModel.id })
                .from(schema_1.UserModel)
                .where((0, drizzle_orm_1.eq)(schema_1.UserModel.id, payload.id))
                .for("update");
            await checkForSuspension(payload.id, tx);
            const user = await site_options_1.default.apiUser.get();
            const apiKey = await site_options_1.default.apiKey.get();
            const price = await getOtrPrice({ user, apiKey, name });
            const balance = await (0, get_balance_1.default)(payload.id, tx);
            if (balance < price)
                throw new unlogging_error_1.default("Not enough balance.");
            return await doRentOtr({
                user,
                apiKey,
                name,
                price,
                userId: payload.id,
                tx,
            });
        });
        await Promise.all([
            (0, pusher_1.default)({ page: "/tools/rent/history", to: `user-${payload.id}` }),
            (0, pusher_1.default)({ page: "/header/balance", to: `user-${payload.id}` }),
            (0, pusher_1.default)({
                page: "/admin-area/dashboard/services/info/otr",
                to: "admin",
            }),
        ]);
        res.json({
            success: true,
            mdn: result.mdn,
            requestId: result.requestId,
        });
    }
    catch (e) {
        if (e instanceof unlogging_error_1.default) {
            res.status(400).json({ success: false, message: e.message });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}
// ─────────────────────────────────────────────
// POST /api/numbers/rent/ltr
// ─────────────────────────────────────────────
async function rentLongTerm(req, res) {
    try {
        const payload = req.payload;
        const { name, rentType } = zod_1.z.object({ name: zod_1.z.string().min(1), rentType: zod_1.z.enum(["short", "regular", "unlimited"]) }).parse(req.body);
        const mdn = await db_1.default.transaction(async (tx) => {
            await tx.select({ id: schema_1.UserModel.id }).from(schema_1.UserModel).where((0, drizzle_orm_1.eq)(schema_1.UserModel.id, payload.id)).for("update");
            await checkForSuspension(payload.id, tx);
            const user = await site_options_1.default.apiUser.get();
            const apiKey = await site_options_1.default.apiKey.get();
            const price = await getLtrPrice({ user, apiKey, name, rentType });
            const balance = await (0, get_balance_1.default)(payload.id, tx);
            if (balance < price)
                throw new unlogging_error_1.default("Not enough balance.");
            return await doRentLtr({ user, apiKey, name, rentType, price, userId: payload.id, tx });
        });
        await Promise.all([
            (0, pusher_1.default)({ page: "/tools/rent/history", to: `user-${payload.id}` }),
            (0, pusher_1.default)({ page: "/header/balance", to: `user-${payload.id}` }),
            (0, pusher_1.default)({ page: "/admin-area/dashboard/services/info/ltr", to: "admin" }),
        ]);
        res.json({ success: true, mdn });
    }
    catch (e) {
        if (e instanceof unlogging_error_1.default) {
            res.status(400).json({ success: false, message: e.message });
            return;
        }
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─────────────────────────────────────────────
// Helpers — OTR
// ─────────────────────────────────────────────
async function getOtrPrice({ user, apiKey, name }) {
    const url = new URL(getApiUrl());
    url.searchParams.set("cmd", "list_services");
    url.searchParams.set("user", user);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("service", name);
    const r = await fetch(url.toString()).then((r) => r.json());
    if (r.status === "error")
        throw new unlogging_error_1.default(r.message);
    const service = r.message.at(0);
    if (!service)
        throw new unlogging_error_1.default("Service not found.");
    const price = Number(service.price);
    const cut = await site_options_1.default.transactionCut.OneTime.get();
    return price + price * (cut / 100);
}
async function doRentOtr({ user, apiKey, name, price, userId, tx }) {
    const url = new URL(getApiUrl());
    url.searchParams.set("cmd", "otr_rent");
    url.searchParams.set("user", user);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("service", name);
    const [hostUrl, callbackSecret] = await Promise.all([
        site_options_1.default.hostUrl.get(),
        site_options_1.default.providerCallbackSecret.get(),
    ]);
    if (hostUrl && callbackSecret) {
        url.searchParams.set("callback_url", `${hostUrl}/tools/callback?secret=${callbackSecret}`);
    }
    const r = await fetch(url.toString()).then((r) => r.json());
    if (r.status === "error")
        throw new unlogging_error_1.default(r.message);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 20); // OTR typically 20 min window
    await tx.insert(schema_1.OneTimeRentModel).values({
        mdn: r.message.mdn,
        requestId: r.message.id,
        service: name,
        status: "Awaiting MDN",
        state: r.message.state || "",
        carrier: r.message.carrier || "",
        price,
        originalPrice: price,
        tillExpiration: 20,
        userId,
    });
    return { mdn: r.message.mdn, requestId: r.message.id };
}
// ─────────────────────────────────────────────
// Helpers — LTR
// ─────────────────────────────────────────────
async function getLtrPrice({ user, apiKey, name, rentType }) {
    const url = new URL(getApiUrl());
    url.searchParams.set("cmd", "list_services");
    url.searchParams.set("user", user);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("service", name);
    const r = await fetch(url.toString()).then((r) => r.json());
    if (r.status === "error")
        throw new unlogging_error_1.default(r.message);
    const service = r.message.at(0);
    if (!service)
        throw new unlogging_error_1.default("Service not found.");
    let price = Number(rentType === "short" ? service.ltr_short_price : service.ltr_price);
    if (rentType === "unlimited")
        price += 5;
    const cut = rentType === "short" ? await site_options_1.default.transactionCut.LongTerm.short.get()
        : rentType === "regular" ? await site_options_1.default.transactionCut.LongTerm.regular.get()
            : await site_options_1.default.transactionCut.LongTerm.unlimited.get();
    return price + price * (cut / 100);
}
async function doRentLtr({ user, apiKey, name, rentType, price, userId, tx }) {
    const url = new URL(getApiUrl());
    url.searchParams.set("cmd", "ltr_rent");
    url.searchParams.set("user", user);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("service", name);
    url.searchParams.set("autorenew", "false");
    if (rentType !== "unlimited")
        url.searchParams.set("duration", rentType === "short" ? "3" : "30");
    else
        url.searchParams.set("reserve", "true");
    const [hostUrl, callbackSecret] = await Promise.all([site_options_1.default.hostUrl.get(), site_options_1.default.providerCallbackSecret.get()]);
    if (hostUrl && callbackSecret)
        url.searchParams.set("callback_url", `${hostUrl}/tools/callback?secret=${callbackSecret}`);
    const r = await fetch(url.toString()).then((r) => r.json());
    if (r.status === "error")
        throw new unlogging_error_1.default(r.message);
    const days = rentType === "short" ? 3 : 30;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);
    await tx.insert(schema_1.LongTermRentsModel).values({ expirationDate, mdn: r.message.mdn, price, requestId: r.message.id, service: name, status: "Active", userId, onlineStatus: "online", rentType });
    return r.message.mdn;
}
// ─────────────────────────────────────────────
// Suspension check
// ─────────────────────────────────────────────
async function checkForSuspension(userId, tx) {
    const transactions = await tx.query.LongTermRentsModel.findMany({
        columns: { createdAt: true, status: true },
        limit: constants_1.suspensionCount,
        orderBy: (m, { desc }) => desc(m.createdAt),
        where: (m, { eq }) => eq(m.userId, userId),
    });
    if (transactions.length < constants_1.suspensionCount)
        return;
    if ((transactions.at(0)?.createdAt.getTime() || 0) + 1000 * 60 * 60 * 3 < Date.now())
        return;
    if (!transactions.every((t) => t.status === "Rejected"))
        return;
    throw new unlogging_error_1.default(`You are suspended for suspicious activity. Functional in ${(0, constants_1.timeFormatter)((transactions.at(0)?.createdAt.getTime() || 0) + 1000 * 60 * 60 * 3 - Date.now())}.`);
}
