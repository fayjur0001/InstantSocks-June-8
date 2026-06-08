"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// NSocks.net API Adapter  —  real implementation
// Path: server/src/utils/nsocks.adapter.ts
// ─────────────────────────────────────────────────────────────────────────────
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.nsocksFetchList = nsocksFetchList;
exports.nsocksBuyProxy = nsocksBuyProxy;
exports.nsocksGetProxy = nsocksGetProxy;
exports.nsocksGetBalance = nsocksGetBalance;
exports.nsocksGetHistory = nsocksGetHistory;
exports.nsocksRefund = nsocksRefund;
exports.nsocksRenewTraffic = nsocksRenewTraffic;
exports.nsocksSetAutoRenew = nsocksSetAutoRenew;
exports.nsocksGetCountries = nsocksGetCountries;
exports.nsocksGetStates = nsocksGetStates;
const NSOCKS_API_BASE = process.env.SOCKS_5_PROXY_API_URL?.replace(/\/$/, "") || "https://nsocks.net";
// ── Internal helper ───────────────────────────────────────────────────────────
async function nsocksPost(endpoint, apiKey, body) {
    const url = `${NSOCKS_API_BASE}${endpoint}`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Origin": "https://nsocks.net",
            "Referer": "https://nsocks.net/account",
        },
        body: JSON.stringify({ API_KEY: apiKey, ...body }),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`NSocks API error ${res.status} [${endpoint}]: ${text}`);
    }
    const data = (await res.json());
    if (data.STATUS !== "OK" && data.STATUS !== "SUCCESS") {
        throw new Error(`NSocks returned error [${endpoint}]: ${data.MESSAGE ?? JSON.stringify(data)}`);
    }
    return data;
}
// ── Mappers ───────────────────────────────────────────────────────────────────
function mapSearchProxy(raw) {
    const id = String(raw.id ?? "");
    // speed comes as bytes/s — convert to human readable
    const speedBytes = Number(raw.speed ?? 0);
    const speedStr = speedBytes > 1000000
        ? `${(speedBytes / 1000000).toFixed(1)}M`
        : speedBytes > 1000
            ? `${(speedBytes / 1000).toFixed(0)}K`
            : `${speedBytes}`;
    return {
        id,
        ip: String(raw.sock_real_ip ?? ""),
        port: 0, // only available after buy
        countryCode: String(raw.ct ?? ""),
        country: String(raw.country ?? raw.ct ?? ""),
        state: String(raw.region ?? ""),
        city: String(raw.city ?? ""),
        zip: String(raw.zip ?? ""),
        type: String(raw.user_type ?? "ISP"),
        isp: String(raw.isp ?? raw.org ?? ""),
        org: String(raw.org ?? raw.isp ?? ""),
        ping: Number(raw.ping ?? 0),
        speed: speedStr,
        price: Number(raw.price ?? 0),
        added: String(raw.added ?? ""),
        blacklisted: raw.sbl_black === "1" ||
            raw.css_black === "1" ||
            raw.xbl_black === "1" ||
            raw.pbl_black === "1",
        connectionString: `socks5://${raw.sock_real_ip ?? id}`,
        domain: raw.domain ? String(raw.domain) : undefined,
        dns: raw.sock_dns_ip ? String(raw.sock_dns_ip) : undefined,
        udp: raw.socks_isudp === "Yes",
        rating: raw.rating !== undefined ? Number(raw.rating) : undefined,
        trafficLimit: raw.traffic_limit !== undefined ? Number(raw.traffic_limit) : undefined,
        trafficPrice: raw.traffic_price !== undefined ? Number(raw.traffic_price) : undefined,
    };
}
function mapBuyProxy(raw, proxyId) {
    const proxyData = raw.DATA?.PROXY;
    if (!proxyData) {
        throw new Error(`NSocks buy response missing DATA.PROXY (id: ${proxyId})`);
    }
    // PORT field = "ip:port" format
    const portField = String(proxyData.PORT ?? "");
    const [proxyIp, proxyPort] = portField.includes(":")
        ? portField.split(":")
        : ["", portField];
    const auth = String(proxyData.SOCKS_AUTH ?? "");
    return {
        ip: proxyIp || String(proxyData.IP ?? ""),
        port: proxyPort || "1080",
        auth,
        country: "",
        countryCode: "",
        state: "",
        city: "",
        zip: "",
        type: "ISP",
        price: 0,
    };
}
// ── Public API ────────────────────────────────────────────────────────────────
/**
 * POST /api/search
 * NSocks proxy list আনো — country required, বাকি সব optional
 */
async function nsocksFetchList(apiKey, params) {
    const body = {
        METHOD: "search",
        COUNTRY: params.country || "US",
        COUNT: String(params.limit ?? 20),
        PAGE: params.page ?? 1,
    };
    if (params.type) {
        // Frontend "DCH" → NSocks RESIDENTIAL:2, others → RESIDENTIAL:1
        if (params.type === "DCH") {
            body.RESIDENTIAL = 2;
        }
        else {
            body.RESIDENTIAL = 1;
            body.TYPE = params.type;
        }
    }
    if (params.state)
        body.STATE = params.state;
    if (params.city)
        body.CITY = params.city;
    if (params.isp)
        body.ISP = params.isp;
    if (params.excludeUsed)
        body.EXCLUDE_USED = 1;
    if (params.excludeBlacks)
        body.EXCLUDE_BLACKS = 1;
    if (params.highSpeed)
        body.HIGHSPEED = 1;
    if (params.udp !== undefined)
        body.UDP = params.udp ? 1 : 0;
    if (params.sort)
        body.SORT = params.sort;
    const data = await nsocksPost("/api/search", apiKey, body);
    const payload = data.DATA;
    const meta = payload?.META;
    const rawList = payload?.PROXIES ?? [];
    return {
        proxies: rawList.map(mapSearchProxy),
        total: Number(meta?.proxies_total ?? rawList.length),
        totalPage: Number(meta?.total_pages ?? 1),
    };
}
/**
 * POST /api/buy
 * Proxy কিনো — proxy credentials return করে
 * USERNAME/PASSWORD: 5-7 chars, proxy auth এর জন্য (NSocks account এর না)
 */
async function nsocksBuyProxy(apiKey, proxyId, username, password) {
    const { randomBytes } = await Promise.resolve().then(() => __importStar(require("crypto")));
    const user = username || randomBytes(3).toString("hex").slice(0, 6); // 6 chars
    const pass = password || randomBytes(3).toString("hex").slice(0, 6); // 6 chars
    const data = await nsocksPost("/api/buy", apiKey, {
        METHOD: "buy",
        ID: Number(proxyId),
        USERNAME: user,
        PASSWORD: pass,
    });
    return mapBuyProxy(data, proxyId);
}
/**
 * POST /api/proxy
 * Single proxy details by ID
 */
async function nsocksGetProxy(apiKey, proxyId) {
    const data = await nsocksPost("/api/proxy", apiKey, {
        METHOD: "proxy",
        ID: Number(proxyId),
    });
    const payload = data.DATA;
    const rawList = payload?.PROXIES ?? [];
    return rawList.length > 0 ? mapSearchProxy(rawList[0]) : null;
}
/**
 * POST /api/balance
 * NSocks account balance check করো
 */
async function nsocksGetBalance(apiKey) {
    const data = await nsocksPost("/api/balance", apiKey, { METHOD: "balance" });
    const payload = data.DATA;
    return Number(payload?.BALANCE ?? 0);
}
/**
 * POST /api/history
 * কেনা proxies এর history
 */
async function nsocksGetHistory(apiKey, params = {}) {
    const body = { METHOD: "history" };
    if (params.country)
        body.COUNTRY = params.country;
    if (params.online !== undefined)
        body.ONLINE = params.online;
    if (params.paid !== undefined)
        body.PAID = params.paid;
    if (params.page)
        body.PAGE = params.page;
    if (params.count)
        body.COUNT = String(params.count);
    const data = await nsocksPost("/api/history", apiKey, body);
    const payload = data.DATA;
    const meta = payload?.META;
    const rawList = payload?.PROXIES ?? [];
    const proxies = rawList.map((r) => ({
        id: String(r.id ?? ""),
        historyId: String(r.history_id ?? ""),
        proxy: String(r.proxy ?? ""),
        realIp: String(r.real_ip ?? ""),
        countryCode: String(r.ct ?? ""),
        country: String(r.country ?? ""),
        state: String(r.region ?? ""),
        city: String(r.city ?? ""),
        isp: String(r.isp ?? ""),
        ping: String(r.ping ?? ""),
        type: String(r.user_type ?? ""),
        buyPrice: Number(r.buy_price ?? 0),
        online: Number(r.online ?? 0),
        auth: String(r.socks_auth ?? ""),
        minsLeft: String(r.mins_left ?? ""),
    }));
    return {
        proxies,
        total: Number(meta?.proxies_total ?? rawList.length),
        totalPage: Number(meta?.total_pages ?? 1),
    };
}
/**
 * POST /api/refund
 * Proxy refund করো (offline হলে ২ ঘণ্টার মধ্যে)
 * historyId = history record এর history_id (proxy id না!)
 */
async function nsocksRefund(apiKey, historyId) {
    const data = await nsocksPost("/api/refund", apiKey, { METHOD: "refund", HISTORY_ID: historyId });
    return {
        message: String(data.MESSAGE ?? ""),
        balance: Number(data.BALANCE ?? 0),
    };
}
/**
 * POST /api/renewtraffic
 * Traffic renew করো
 */
async function nsocksRenewTraffic(apiKey, historyId) {
    const data = await nsocksPost("/api/renewtraffic", apiKey, { METHOD: "renewtraffic", HISTORY_ID: historyId });
    return {
        message: String(data.MESSAGE ?? ""),
        balance: Number(data.BALANCE ?? 0),
        traffic: Number(data.TRAFFIC ?? 0),
    };
}
/**
 * POST /api/autorenew
 * Auto-renew enable/disable করো
 */
async function nsocksSetAutoRenew(apiKey, historyId, enable) {
    const data = await nsocksPost("/api/autorenew", apiKey, { METHOD: "autorenew", HISTORY_ID: historyId, ENABLE: enable ? 1 : 0 });
    const payload = data.DATA;
    return {
        historyId: String(payload?.HISTORY_ID ?? ""),
        autoRenew: Number(payload?.AUTORENEW ?? 0),
    };
}
/**
 * POST /api/countries
 * Available countries list (optional: filter by country code)
 */
async function nsocksGetCountries(apiKey, country) {
    const body = { METHOD: "countries" };
    if (country)
        body.COUNTRY = country;
    const data = await nsocksPost("/api/countries", apiKey, body);
    const payload = data.DATA;
    const rawList = payload?.PROXIES ?? [];
    return rawList.map((r) => ({
        ct: String(r.ct ?? ""),
        online: Number(r.online ?? 0),
    }));
}
/**
 * POST /api/states
 * Available US states list
 */
async function nsocksGetStates(apiKey) {
    const data = await nsocksPost("/api/states", apiKey, { METHOD: "states" });
    const payload = data.DATA;
    const rawList = payload?.PROXIES ?? [];
    return rawList.map((r) => ({
        state: String(r.state ?? ""),
        count: Number(r.cnt ?? 0),
    }));
}
