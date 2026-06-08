"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettings = getSettings;
exports.updateSettings = updateSettings;
exports.getPaymentApi = getPaymentApi;
exports.updatePaymentApi = updatePaymentApi;
exports.getProductsApi = getProductsApi;
exports.updateProductsApi = updateProductsApi;
exports.getPricing = getPricing;
exports.updatePricing = updatePricing;
exports.getCallback = getCallback;
exports.updateCallback = updateCallback;
const site_options_1 = __importDefault(require("@/utils/site-options"));
// D1 — GET /api/admin/settings
async function getSettings(req, res) {
    try {
        const [hostUrl, siteMode, notice, maintenanceText] = await Promise.all([
            site_options_1.default.hostUrl.get(),
            site_options_1.default.siteMode.get(),
            site_options_1.default.notice.get(),
            site_options_1.default.maintenanceText.get(),
        ]);
        res.json({ success: true, data: { hostUrl, siteMode, notice, maintenanceText } });
    }
    catch (e) {
        console.error("GET SETTINGS ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// D1 — PUT /api/admin/settings
async function updateSettings(req, res) {
    try {
        const { hostUrl, siteMode, notice, maintenanceText } = req.body;
        await Promise.all([
            hostUrl !== undefined && site_options_1.default.hostUrl.set(hostUrl),
            siteMode !== undefined && site_options_1.default.siteMode.set(siteMode),
            notice !== undefined && site_options_1.default.notice.set(notice),
            maintenanceText !== undefined && site_options_1.default.maintenanceText.set(maintenanceText),
        ]);
        res.json({ success: true, message: "Settings updated" });
    }
    catch (e) {
        console.error("UPDATE SETTINGS ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// D2 — GET /api/admin/payment-api
async function getPaymentApi(req, res) {
    try {
        const [nowApiKey, nowSecret, yaanApiKey, yaanSecret, blockApiKey, blockSecret, currentMethod,] = await Promise.all([
            site_options_1.default.payment.nowPayments.apiKey.get(),
            site_options_1.default.payment.nowPayments.callbackSecret.get(),
            site_options_1.default.payment.yaanPay.apiKey.get(),
            site_options_1.default.payment.yaanPay.callbackSecret.get(),
            site_options_1.default.payment.blockonomics.apiKey.get(),
            site_options_1.default.payment.blockonomics.callbackSecret.get(),
            site_options_1.default.payment.currentMethod.get(),
        ]);
        res.json({
            success: true,
            data: {
                nowPayments: { apiKey: nowApiKey, callbackSecret: nowSecret },
                yaanPay: { apiKey: yaanApiKey, callbackSecret: yaanSecret },
                blockonomics: { apiKey: blockApiKey, callbackSecret: blockSecret },
                currentMethod,
            },
        });
    }
    catch (e) {
        console.error("GET PAYMENT API ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// D2 — PUT /api/admin/payment-api
async function updatePaymentApi(req, res) {
    try {
        const { nowPayments, yaanPay, blockonomics, currentMethod } = req.body;
        await Promise.all([
            nowPayments?.apiKey !== undefined && site_options_1.default.payment.nowPayments.apiKey.set(nowPayments.apiKey),
            nowPayments?.callbackSecret !== undefined && site_options_1.default.payment.nowPayments.callbackSecret.set(nowPayments.callbackSecret),
            yaanPay?.apiKey !== undefined && site_options_1.default.payment.yaanPay.apiKey.set(yaanPay.apiKey),
            yaanPay?.callbackSecret !== undefined && site_options_1.default.payment.yaanPay.callbackSecret.set(yaanPay.callbackSecret),
            blockonomics?.apiKey !== undefined && site_options_1.default.payment.blockonomics.apiKey.set(blockonomics.apiKey),
            blockonomics?.callbackSecret !== undefined && site_options_1.default.payment.blockonomics.callbackSecret.set(blockonomics.callbackSecret),
            currentMethod !== undefined && site_options_1.default.payment.currentMethod.set(currentMethod),
        ]);
        res.json({ success: true, message: "Payment API config updated" });
    }
    catch (e) {
        console.error("UPDATE PAYMENT API ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// D3 — GET /api/admin/products-api
async function getProductsApi(req, res) {
    try {
        const [apiUser, apiKey, socks5ApiKey] = await Promise.all([
            site_options_1.default.apiUser.get(),
            site_options_1.default.apiKey.get(),
            site_options_1.default.socks5ProxyAPIKey.get(),
        ]);
        res.json({ success: true, data: { numbersApi: { user: apiUser, key: apiKey }, socks5Api: { apiKey: socks5ApiKey } } });
    }
    catch (e) {
        console.error("GET PRODUCTS API ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// D3 — PUT /api/admin/products-api
async function updateProductsApi(req, res) {
    try {
        const { numbersApi, socks5Api } = req.body;
        await Promise.all([
            numbersApi?.user !== undefined && site_options_1.default.apiUser.set(numbersApi.user),
            numbersApi?.key !== undefined && site_options_1.default.apiKey.set(numbersApi.key),
            socks5Api?.apiKey !== undefined && site_options_1.default.socks5ProxyAPIKey.set(socks5Api.apiKey),
        ]);
        res.json({ success: true, message: "Products API config updated" });
    }
    catch (e) {
        console.error("UPDATE PRODUCTS API ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// D4 — GET /api/admin/pricing
async function getPricing(req, res) {
    try {
        const tc = site_options_1.default.transactionCut;
        const [otr, ltShort, ltRegular, ltUnlimited, proxySharedDay, socks5] = await Promise.all([
            tc.OneTime.get(), tc.LongTerm.short.get(), tc.LongTerm.regular.get(),
            tc.LongTerm.unlimited.get(), tc.Proxy.shared.day.get(), tc.Socks5Proxy.get(),
        ]);
        res.json({ success: true, data: { oneTime: otr, longTerm: { short: ltShort, regular: ltRegular, unlimited: ltUnlimited }, proxyShared: { day: proxySharedDay }, socks5Proxy: socks5 } });
    }
    catch (e) {
        console.error("GET PRICING ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// D4 — PUT /api/admin/pricing
async function updatePricing(req, res) {
    try {
        const { oneTime, longTerm, socks5Proxy } = req.body;
        await Promise.all([
            oneTime !== undefined && site_options_1.default.transactionCut.OneTime.set(oneTime),
            longTerm?.short !== undefined && site_options_1.default.transactionCut.LongTerm.short.set(longTerm.short),
            longTerm?.regular !== undefined && site_options_1.default.transactionCut.LongTerm.regular.set(longTerm.regular),
            longTerm?.unlimited !== undefined && site_options_1.default.transactionCut.LongTerm.unlimited.set(longTerm.unlimited),
            socks5Proxy !== undefined && site_options_1.default.transactionCut.Socks5Proxy.set(socks5Proxy),
        ]);
        res.json({ success: true, message: "Pricing updated" });
    }
    catch (e) {
        console.error("UPDATE PRICING ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// D5 — GET /api/admin/callback
async function getCallback(req, res) {
    try {
        const [secret, hostUrl] = await Promise.all([
            site_options_1.default.providerCallbackSecret.get(),
            site_options_1.default.hostUrl.get(),
        ]);
        res.json({
            success: true,
            data: {
                secret: secret || "",
                url: hostUrl && secret ? `${hostUrl}/tools/callback?secret=${secret}` : "",
            },
        });
    }
    catch (e) {
        console.error("GET CALLBACK ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// D5 — PUT /api/admin/callback
async function updateCallback(req, res) {
    try {
        const { secret } = req.body;
        if (secret !== undefined) {
            await site_options_1.default.providerCallbackSecret.set(secret);
        }
        res.json({ success: true, message: "Callback config updated" });
    }
    catch (e) {
        console.error("UPDATE CALLBACK ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
