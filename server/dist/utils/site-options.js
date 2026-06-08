"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("@/db"));
const schema_1 = require("@/db/schema");
async function get(name) {
    return db_1.default.query.SiteOptionModel.findFirst({ where: (m, { eq }) => eq(m.name, name) }).then((r) => r?.value ?? null);
}
async function set(name, value) {
    await db_1.default.insert(schema_1.SiteOptionModel).values({ value, name }).onConflictDoUpdate({ set: { value }, target: schema_1.SiteOptionModel.name });
}
const mk = (name, def = 0) => ({
    name,
    get: async function () { return Number(await get(this.name)) || def; },
    set: async function (v) { await set(this.name, String(v)); },
});
const mks = (name, def = "") => ({
    name,
    get: async function () { return (await get(this.name)) || def; },
    set: async function (v) { await set(this.name, v); },
});
class SiteOptions {
}
SiteOptions.hostUrl = mks("host-url");
SiteOptions.apiUser = mks("api-user");
SiteOptions.apiKey = mks("api-key");
SiteOptions.siteMode = mks("site-mode", "production");
SiteOptions.notice = mks("notice");
SiteOptions.maintenanceText = mks("maintenance-text", "Site is undergoing maintenance");
SiteOptions.providerCallbackSecret = mks("provider-callback-secret");
SiteOptions.socks5ProxyAPIKey = mks("socks5-proxy-api-key");
SiteOptions.smsPvaSecret = mks("sms-pva-secret");
SiteOptions.transactionCut = {
    OneTime: mk("transaction-cut-one-time"),
    LongTerm: { short: mk("transaction-cut-long-term-short"), regular: mk("transaction-cut-long-term-regular"), unlimited: mk("transaction-cut-long-term-unlimited") },
    Proxy: {
        shared: { day: mk("transaction-cut-proxy-shared-day"), week: mk("transaction-cut-proxy-shared-week"), month: mk("transaction-cut-proxy-shared-month") },
        exclusive: { day: mk("transaction-cut-proxy-exclusive-day"), week: mk("transaction-cut-proxy-exclusive-week"), month: mk("transaction-cut-proxy-exclusive-month") },
    },
    Device: { day: mk("transaction-cut-device-day"), week: mk("transaction-cut-device-week"), month: mk("transaction-cut-device-month") },
    Socks5Proxy: mk("transaction-cut-socks5-proxy"),
    SMSPVA: { otr: mk("transaction-cut-smspva-one-time"), ltr: { week: mk("transaction-cut-smspva-week"), month: mk("transaction-cut-smspva-month") } },
};
SiteOptions.payment = {
    nowPayments: { apiKey: mks("nowpayments-api-key"), callbackSecret: mks("nowpayments-callback-secret") },
    yaanPay: { apiKey: mks("yaanpay-api-key"), callbackSecret: mks("yaanpay-callback-secret") },
    blockonomics: { apiKey: mks("blockonomics-api-key"), callbackSecret: mks("blockonomics-callback-secret") },
    currentMethod: mks("payment-current-method", "now-payments"),
};
SiteOptions.devices = { login: mks("devices-login"), password: mks("devices-password") };
SiteOptions.smsMethod = {
    name: "sms-method",
    enumArray: ["mobile-varify-bro", "sms-pva"],
    get: async function () {
        const raw = await get(this.name);
        if (!raw)
            return [this.enumArray[0]];
        try {
            const p = JSON.parse(raw);
            if (Array.isArray(p) && p.length > 0)
                return p;
        }
        catch { }
        return [this.enumArray[0]];
    },
    set: async function (v) { await set(this.name, JSON.stringify(v)); },
};
exports.default = SiteOptions;
