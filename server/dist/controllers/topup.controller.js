"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLastFunds = getLastFunds;
exports.getTopupTransactions = getTopupTransactions;
exports.getAdminTransactions = getAdminTransactions;
exports.createAdminTransaction = createAdminTransaction;
exports.updateAdminTransaction = updateAdminTransaction;
exports.deleteAdminTransaction = deleteAdminTransaction;
exports.generateNowPayments = generateNowPayments;
exports.generateYaanPay = generateYaanPay;
exports.generateBlockonomics = generateBlockonomics;
exports.topUpCallback = topUpCallback;
exports.convertCurrency = convertCurrency;
const db_1 = __importDefault(require("@/db"));
const schema_1 = require("@/db/schema");
const unlogging_error_1 = __importDefault(require("@/utils/unlogging-error"));
const pusher_1 = __importDefault(require("@/utils/pusher"));
const crypto_1 = require("crypto");
const site_options_1 = __importDefault(require("@/utils/site-options"));
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const constants_1 = require("@/utils/constants");
const notification_controller_1 = require("@/controllers/notification.controller");
// GET /api/topup/last-funds
async function getLastFunds(req, res) {
    try {
        const userId = req.payload.id;
        const lastFunds = await db_1.default.query.AddedFundModel.findMany({
            where: (m, { eq, and, sql }) => and(eq(m.userId, userId), eq(m.status, "pending"), sql `${m.createdAt} + ${constants_1.paymentExpireTime + " ms"}::interval > now()`),
            orderBy: (m, { desc }) => desc(m.createdAt),
            columns: {
                amount: true,
                currency: true,
                walletAddress: true,
            },
        });
        res.json({
            success: true,
            lastFunds,
        });
    }
    catch (e) {
        console.error("GET LAST FUNDS ERROR:", e);
        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}
// GET /api/topup/transactions  (user — নিজের history)
async function getTopupTransactions(req, res) {
    try {
        const userId = req.payload.id;
        const transactions = await db_1.default
            .select({
            id: schema_1.AddedFundModel.id,
            date: schema_1.AddedFundModel.createdAt,
            wallet: schema_1.AddedFundModel.currency,
            walletAddress: schema_1.AddedFundModel.walletAddress,
            txnId: schema_1.AddedFundModel.txid,
            amount: schema_1.AddedFundModel.amount,
            status: (0, drizzle_orm_1.sql) `case
          when ${schema_1.AddedFundModel.status} != 'pending' then ${schema_1.AddedFundModel.status}
          when ${schema_1.AddedFundModel.createdAt} + ${constants_1.paymentExpireTime + " ms"}::interval > now() then 'pending'
          else 'rejected'
        end`,
        })
            .from(schema_1.AddedFundModel)
            .where((0, drizzle_orm_1.eq)(schema_1.AddedFundModel.userId, userId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.AddedFundModel.createdAt));
        res.json({
            success: true,
            transactions,
        });
    }
    catch (e) {
        console.error("GET TRANSACTIONS ERROR:", e);
        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}
// ── GET /api/topup/admin/transactions  (admin — সব users এর transactions) ──
async function getAdminTransactions(req, res) {
    try {
        const { page, limit, status, userId } = zod_1.z.object({
            page: zod_1.z.coerce.number().int().min(1).catch(1),
            limit: zod_1.z.coerce.number().int().min(1).max(100).catch(20),
            status: zod_1.z.enum(["pending", "approved", "rejected", "all"]).catch("all"),
            userId: zod_1.z.coerce.number().int().positive().optional(),
        }).parse(req.query);
        const offset = (page - 1) * limit;
        const where = (0, drizzle_orm_1.and)(userId ? (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.userId, userId) : undefined, status !== "all" ? (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.status, status) : undefined);
        const [transactions, totalRows] = await Promise.all([
            db_1.default
                .select({
                id: schema_1.AddedFundModel.id,
                date: schema_1.AddedFundModel.createdAt,
                userId: schema_1.AddedFundModel.userId,
                username: schema_1.UserModel.username,
                wallet: schema_1.AddedFundModel.currency,
                walletAddress: schema_1.AddedFundModel.walletAddress,
                txnId: schema_1.AddedFundModel.txid,
                amount: schema_1.AddedFundModel.amount,
                status: schema_1.AddedFundModel.status,
                method: schema_1.AddedFundModel.method,
                manuallyUploaded: schema_1.AddedFundModel.manualyUploaded,
            })
                .from(schema_1.AddedFundModel)
                .leftJoin(schema_1.UserModel, (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.userId, schema_1.UserModel.id))
                .where(where)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.AddedFundModel.createdAt))
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
            total: totalRows,
            totalPage: Math.ceil(totalRows / limit),
        });
    }
    catch (e) {
        console.error("GET ADMIN TRANSACTIONS ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ── POST /api/topup/admin/transactions  (manual transaction create) ────────
async function createAdminTransaction(req, res) {
    try {
        const { userId, amount, currency, walletAddress, txid, status } = zod_1.z
            .object({
            userId: zod_1.z.number().int().positive(),
            amount: zod_1.z.number().positive(),
            currency: zod_1.z.string().min(1),
            walletAddress: zod_1.z.string().min(1),
            txid: zod_1.z.string().optional(),
            status: zod_1.z.enum(["pending", "approved", "rejected"]).default("approved"),
        })
            .parse(req.body);
        const [newTx] = await db_1.default
            .insert(schema_1.AddedFundModel)
            .values({
            userId,
            amount,
            currency,
            walletAddress,
            txid: txid ?? null,
            status,
            method: "now_payments",
            manualyUploaded: true,
        })
            .returning();
        await Promise.all([
            (0, pusher_1.default)({ page: "/admin-panel/transactions", to: "admin" }),
            (0, pusher_1.default)({ page: "/admin-area/dashboard/fund/info/pending", to: "admin" }),
            (0, pusher_1.default)({ page: "/top-up/transactions", to: `user-${userId}` }),
        ]);
        res.json({ success: true, transaction: newTx });
    }
    catch (e) {
        console.error("CREATE ADMIN TRANSACTION ERROR:", e);
        if (e instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, message: e.errors[0].message });
        }
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ── PUT /api/topup/admin/transactions/:id  (transaction edit) ──────────────
async function updateAdminTransaction(req, res) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ success: false, message: "Invalid transaction ID." });
        }
        const { amount, currency, walletAddress, txid, status } = zod_1.z
            .object({
            amount: zod_1.z.number().positive().optional(),
            currency: zod_1.z.string().min(1).optional(),
            walletAddress: zod_1.z.string().min(1).optional(),
            txid: zod_1.z.string().nullable().optional(),
            status: zod_1.z.enum(["pending", "approved", "rejected"]).optional(),
        })
            .parse(req.body);
        const updateData = {};
        if (amount !== undefined)
            updateData.amount = amount;
        if (currency !== undefined)
            updateData.currency = currency;
        if (walletAddress !== undefined)
            updateData.walletAddress = walletAddress;
        if (txid !== undefined)
            updateData.txid = txid;
        if (status !== undefined)
            updateData.status = status;
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: "No fields to update." });
        }
        const [updated] = await db_1.default
            .update(schema_1.AddedFundModel)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(schema_1.AddedFundModel.id, id))
            .returning();
        if (!updated) {
            return res.status(404).json({ success: false, message: "Transaction not found." });
        }
        if (status === "approved") {
            await (0, notification_controller_1.createNotification)({
                userId: updated.userId,
                type: "topup_approved",
                title: "Top-Up Approved",
                message: `Your deposit of $${updated.amount.toFixed(2)} has been approved.`,
            });
        }
        res.json({ success: true, transaction: updated });
    }
    catch (e) {
        console.error("UPDATE TRANSACTION ERROR:", e);
        if (e instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, message: e.errors[0].message });
        }
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ── DELETE /api/topup/admin/transactions/:id  (transaction delete) ─────────
async function deleteAdminTransaction(req, res) {
    try {
        const id = Number(req.params.id);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ success: false, message: "Invalid transaction ID." });
        }
        const [deleted] = await db_1.default
            .delete(schema_1.AddedFundModel)
            .where((0, drizzle_orm_1.eq)(schema_1.AddedFundModel.id, id))
            .returning({ id: schema_1.AddedFundModel.id });
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Transaction not found." });
        }
        res.json({ success: true, deletedId: deleted.id });
    }
    catch (e) {
        console.error("DELETE TRANSACTION ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// POST /api/topup/now-payments
async function generateNowPayments(req, res) {
    try {
        const userId = req.payload.id;
        const { crypto: cryptoCurrency, amount } = zod_1.z
            .object({
            crypto: zod_1.z.string().min(1),
            amount: zod_1.z.number().positive(),
        })
            .parse(req.body);
        const [apiKey, hostUrl, secret] = await Promise.all([
            site_options_1.default.payment.nowPayments.apiKey.get(),
            site_options_1.default.hostUrl.get(),
            site_options_1.default.payment.nowPayments.callbackSecret.get(),
        ]);
        if (!apiKey) {
            return res.status(400).json({ success: false, message: "NowPayments API key not configured" });
        }
        if (!hostUrl) {
            return res.status(400).json({ success: false, message: "Host URL not configured" });
        }
        const callback = new URL(`${hostUrl}/api/topup/callback`);
        callback.searchParams.append("secret", secret);
        callback.searchParams.append("method", "now-payments");
        const res2 = await fetch(`${constants_1.nowPaymentsApiUrl}/payment`, {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                price_amount: amount,
                price_currency: "usd",
                pay_currency: cryptoCurrency,
                ipn_callback_url: callback.toString(),
                payout_currency: cryptoCurrency,
                ...(process.env.NODE_ENV === "development" ? { case: "partially_paid" } : {}),
            }),
        }).then((r) => r.json());
        console.log("NowPayments API response:", JSON.stringify(res2));
        if (res2.statusCode && res2.statusCode !== 200) {
            return res.status(400).json({ success: false, message: res2.message ?? "NowPayments API returned an error." });
        }
        if (!res2.pay_address) {
            return res.status(400).json({ success: false, message: "NowPayments did not return a wallet address. Check your API key." });
        }
        await db_1.default.insert(schema_1.AddedFundModel).values({
            amount,
            userId,
            walletAddress: res2.pay_address,
            currency: cryptoCurrency,
        });
        await Promise.all([
            (0, pusher_1.default)({ page: "/admin-panel/transactions", to: "admin" }),
            (0, pusher_1.default)({ page: "/top-up/generate/options", to: `user-${userId}` }),
            (0, pusher_1.default)({ page: "/top-up/last-fund", to: `user-${userId}` }),
            (0, pusher_1.default)({ page: "/top-up/transactions", to: `user-${userId}` }),
            (0, pusher_1.default)({ page: "/admin-area/dashboard/fund/info/pending", to: "admin" }),
            (0, pusher_1.default)({ page: "/top-up", to: `user-${userId}` }),
        ]);
        res.json({ success: true, payment: res2 });
    }
    catch (e) {
        console.error("NOW PAYMENTS ERROR:", e);
        if (e instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, message: e.errors[0].message, field: e.errors[0].path?.[0] });
        }
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// POST /api/topup/yaan-pay
async function generateYaanPay(req, res) {
    try {
        const userId = req.payload.id;
        const { crypto: cryptoCurrency, amount } = zod_1.z
            .object({
            crypto: zod_1.z.string().min(1),
            amount: zod_1.z.number().positive(),
        })
            .parse(req.body);
        if (!process.env.YAANPAY_URL) {
            return res.status(400).json({ success: false, message: "Yaan Pay URL not configured" });
        }
        const [apiKey, yaanSecret, hostUrl] = await Promise.all([
            site_options_1.default.payment.yaanPay.apiKey.get(),
            site_options_1.default.payment.yaanPay.callbackSecret.get(),
            site_options_1.default.hostUrl.get(),
        ]);
        if (!apiKey) {
            return res.status(400).json({ success: false, message: "Yaan Pay API key not configured" });
        }
        if (!hostUrl) {
            return res.status(400).json({ success: false, message: "Host URL not configured" });
        }
        let walletAddress = "";
        await db_1.default.transaction(async (tx) => {
            const fundId = await tx
                .insert(schema_1.AddedFundModel)
                .values({
                amount,
                userId,
                walletAddress: "",
                method: "yaan_pay",
                status: "pending",
                currency: cryptoCurrency,
            })
                .returning({ id: schema_1.AddedFundModel.id })
                .then((r) => r.at(0)?.id);
            if (!fundId) {
                throw new unlogging_error_1.default("Failed to create fund record.");
            }
            const callbackURL = new URL(`${hostUrl}/api/topup/callback`);
            callbackURL.searchParams.set("method", "yaan-pay");
            callbackURL.searchParams.set("secret", yaanSecret);
            const r = await fetch(`${process.env.YAANPAY_URL}/api/v1/${cryptoCurrency}/payment_request`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-YaanPay-Api-Key": apiKey,
                },
                body: JSON.stringify({
                    external_id: fundId,
                    fiat: "USD",
                    amount: amount.toString(),
                    callback_url: callbackURL.toString(),
                }),
            }).then((r) => r.json());
            console.log("Yaan Pay API response:", JSON.stringify(r));
            if (r.status !== "success") {
                await tx.rollback();
                throw new unlogging_error_1.default(r.message ?? "Yaan Pay API returned an error.");
            }
            walletAddress = r.wallet;
            await tx
                .update(schema_1.AddedFundModel)
                .set({ walletAddress: r.wallet })
                .where((0, drizzle_orm_1.eq)(schema_1.AddedFundModel.id, fundId));
        });
        await Promise.all([
            (0, pusher_1.default)({ page: "/top-up/last-fund", to: `user-${userId}` }),
            (0, pusher_1.default)({ page: "/top-up/transactions", to: `user-${userId}` }),
            (0, pusher_1.default)({ page: "/admin-area/dashboard/fund/info/pending", to: "admin" }),
        ]);
        res.json({ success: true, walletAddress });
    }
    catch (e) {
        console.error("YAAN PAY ERROR:", e);
        if (e instanceof unlogging_error_1.default) {
            return res.status(400).json({ success: false, message: e.message });
        }
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// POST /api/topup/blockonomics
async function generateBlockonomics(req, res) {
    try {
        const userId = req.payload.id;
        const { crypto: cryptoCurrency, amount } = zod_1.z
            .object({
            crypto: zod_1.z.string().min(1),
            amount: zod_1.z.number().positive(),
        })
            .parse(req.body);
        const [apiKey, blockSecret, hostUrl] = await Promise.all([
            site_options_1.default.payment.blockonomics.apiKey.get(),
            site_options_1.default.payment.blockonomics.callbackSecret.get(),
            site_options_1.default.hostUrl.get(),
        ]);
        if (!apiKey) {
            return res.status(400).json({ success: false, message: "Blockonomics API key not configured" });
        }
        if (!hostUrl) {
            return res.status(400).json({ success: false, message: "Host URL not configured" });
        }
        let walletAddress = "";
        await db_1.default.transaction(async (tx) => {
            const fundId = await tx
                .insert(schema_1.AddedFundModel)
                .values({
                amount,
                userId,
                walletAddress: "",
                method: "blockonomics",
                status: "pending",
                currency: cryptoCurrency,
            })
                .returning({ id: schema_1.AddedFundModel.id })
                .then((r) => r.at(0)?.id);
            if (!fundId) {
                throw new unlogging_error_1.default("Failed to create fund record.");
            }
            const callbackURL = new URL(`${hostUrl}/api/topup/callback`);
            callbackURL.searchParams.set("method", "blockonomics");
            callbackURL.searchParams.set("secret", blockSecret);
            const r = await fetch("https://www.blockonomics.co/api/new_address", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    callback: callbackURL.toString(),
                }),
            }).then((r) => r.json());
            console.log("Blockonomics API response:", JSON.stringify(r));
            if (!r.address) {
                await tx.rollback();
                throw new unlogging_error_1.default(r.message ?? "Blockonomics did not return a wallet address.");
            }
            walletAddress = r.address;
            await tx
                .update(schema_1.AddedFundModel)
                .set({ walletAddress: r.address })
                .where((0, drizzle_orm_1.eq)(schema_1.AddedFundModel.id, fundId));
        });
        await Promise.all([
            (0, pusher_1.default)({ page: "/top-up/last-fund", to: `user-${userId}` }),
            (0, pusher_1.default)({ page: "/top-up/transactions", to: `user-${userId}` }),
            (0, pusher_1.default)({ page: "/admin-area/dashboard/fund/info/pending", to: "admin" }),
        ]);
        res.json({ success: true, walletAddress });
    }
    catch (e) {
        console.error("BLOCKONOMICS ERROR:", e);
        if (e instanceof unlogging_error_1.default) {
            return res.status(400).json({ success: false, message: e.message });
        }
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// POST /api/topup/callback
async function topUpCallback(req, res) {
    try {
        const method = req.query.method;
        const incomingSecret = req.query.secret;
        function safeCompare(a, b) {
            try {
                const aBuf = Buffer.from(a);
                const bBuf = Buffer.from(b);
                if (aBuf.length !== bBuf.length)
                    return false;
                return (0, crypto_1.timingSafeEqual)(aBuf, bBuf);
            }
            catch {
                return false;
            }
        }
        if (method === "now-payments") {
            const expectedSecret = await site_options_1.default.payment.nowPayments.callbackSecret.get();
            if (!expectedSecret || !incomingSecret || !safeCompare(incomingSecret, expectedSecret)) {
                console.warn("CALLBACK: invalid NowPayments secret");
                return res.status(401).json({ success: false, message: "Invalid secret." });
            }
            const ipnSig = req.headers["x-nowpayments-sig"];
            if (ipnSig) {
                const sortedBody = JSON.stringify(Object.keys(req.body).sort().reduce((acc, k) => { acc[k] = req.body[k]; return acc; }, {}));
                const { createHmac } = await Promise.resolve().then(() => __importStar(require("crypto")));
                const expectedSig = createHmac("sha512", expectedSecret).update(sortedBody).digest("hex");
                if (!safeCompare(ipnSig, expectedSig)) {
                    console.warn("CALLBACK: invalid NowPayments IPN signature");
                    return res.status(401).json({ success: false, message: "Invalid IPN signature." });
                }
            }
        }
        else if (method === "yaan-pay") {
            const expectedSecret = await site_options_1.default.payment.yaanPay.callbackSecret.get();
            if (!expectedSecret || !incomingSecret || !safeCompare(incomingSecret, expectedSecret)) {
                console.warn("CALLBACK: invalid Yaan Pay secret");
                return res.status(401).json({ success: false, message: "Invalid secret." });
            }
        }
        else if (method === "blockonomics") {
            const expectedSecret = await site_options_1.default.payment.blockonomics.callbackSecret.get();
            if (!expectedSecret || !incomingSecret || !safeCompare(incomingSecret, expectedSecret)) {
                console.warn("CALLBACK: invalid Blockonomics secret");
                return res.status(401).json({ success: false, message: "Invalid secret." });
            }
        }
        else {
            console.warn("CALLBACK: unknown method:", method);
            return res.status(400).json({ success: false, message: "Unknown payment method." });
        }
        if (method === "now-payments") {
            const { pay_address, payment_status, outcome } = req.body;
            const txid = outcome?.txid ?? req.body.txid ?? null;
            const isConfirmed = ["confirmed", "finished"].includes(payment_status);
            if (pay_address) {
                const updated = await db_1.default
                    .update(schema_1.AddedFundModel)
                    .set({ txid, status: isConfirmed ? "approved" : "pending" })
                    .where((0, drizzle_orm_1.eq)(schema_1.AddedFundModel.walletAddress, pay_address))
                    .returning();
                if (isConfirmed && updated.length > 0) {
                    const fund = updated[0];
                    await (0, notification_controller_1.createNotification)({
                        userId: fund.userId,
                        type: "topup_approved",
                        title: "Top-Up Approved",
                        message: `Your deposit of $${fund.amount.toFixed(2)} has been approved.`,
                    });
                }
                console.log(`CALLBACK [now-payments]: ${pay_address} → ${isConfirmed ? "approved" : "pending"}`);
            }
        }
        if (method === "yaan-pay") {
            const { external_id, txid, status } = req.body;
            const fundId = Number(external_id);
            const isConfirmed = status === "success";
            if (!isNaN(fundId) && fundId > 0) {
                const updated = await db_1.default
                    .update(schema_1.AddedFundModel)
                    .set({ txid: txid ?? null, status: isConfirmed ? "approved" : "pending" })
                    .where((0, drizzle_orm_1.eq)(schema_1.AddedFundModel.id, fundId))
                    .returning();
                if (isConfirmed && updated.length > 0) {
                    const fund = updated[0];
                    await (0, notification_controller_1.createNotification)({
                        userId: fund.userId,
                        type: "topup_approved",
                        title: "Top-Up Approved",
                        message: `Your deposit of $${fund.amount.toFixed(2)} has been approved.`,
                    });
                }
                console.log(`CALLBACK [yaan-pay]: fund#${fundId} → ${isConfirmed ? "approved" : "pending"}`);
            }
        }
        if (method === "blockonomics") {
            const { addr, txid, status } = req.body;
            const isConfirmed = status === 2 || status === "2";
            if (addr) {
                const updated = await db_1.default
                    .update(schema_1.AddedFundModel)
                    .set({ txid: txid ?? null, status: isConfirmed ? "approved" : "pending" })
                    .where((0, drizzle_orm_1.eq)(schema_1.AddedFundModel.walletAddress, addr))
                    .returning();
                if (isConfirmed && updated.length > 0) {
                    const fund = updated[0];
                    await (0, notification_controller_1.createNotification)({
                        userId: fund.userId,
                        type: "topup_approved",
                        title: "Top-Up Approved",
                        message: `Your deposit of $${fund.amount.toFixed(2)} has been approved.`,
                    });
                }
                console.log(`CALLBACK [blockonomics]: ${addr} → ${isConfirmed ? "approved" : "pending"}`);
            }
        }
        res.json({ success: true });
    }
    catch (e) {
        console.error("CALLBACK ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// POST /api/topup/convert
async function convertCurrency(req, res) {
    try {
        const { amount, currency } = zod_1.z
            .object({
            amount: zod_1.z.coerce.number().min(1),
            currency: zod_1.z.string().min(1),
        })
            .parse(req.body);
        const currentMethod = await site_options_1.default.payment.currentMethod.get();
        if (currentMethod === "yaan-pay" || currentMethod === "blockonomics") {
            return res.json({ success: true, convertedAmount: null });
        }
        const apiKey = await site_options_1.default.payment.nowPayments.apiKey.get();
        if (!apiKey) {
            return res.status(400).json({ success: false, message: "NowPayments API key not configured" });
        }
        const r = await fetch(`${constants_1.nowPaymentsApiUrl}/estimate?amount=${amount}&currency_from=USD&currency_to=${currency}&is_fixed_rate=False&is_fee_paid_by_user=False`, { headers: { "x-api-key": apiKey } }).then((r) => r.json());
        console.log("Convert API response:", JSON.stringify(r));
        res.json({ success: true, convertedAmount: r.estimated_amount ?? null });
    }
    catch (e) {
        console.error("CONVERT ERROR:", e);
        if (e instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, message: e.errors[0].message });
        }
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
