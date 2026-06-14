


const NSOCKS_API_BASE =
  process.env.SOCKS_5_PROXY_API_URL?.replace(/\/$/, "") || "https://nsocks.net";



export interface NsocksProxyItem {
  id: string;
  ip: string;
  port: number;
  countryCode: string;
  country: string;
  state: string;
  city: string;
  zip: string;
  type: string;
  isp: string;
  org: string;
  ping: number;
  speed: string;
  price: number;
  added: string;
  blacklisted: boolean;
  connectionString: string;
  zone?: string;
  usage?: string;
  domain?: string;
  dns?: string;
  udp?: boolean;
  rating?: number;
  trafficLimit?: number;
  trafficPrice?: number;
}

export interface NsocksBuyResult {
  ip: string;
  port: string;
  auth: string;
  country: string;
  countryCode: string;
  state: string;
  city: string;
  zip: string;
  type: string;
  price: number;
  historyId?: string;
}

export interface NsocksCountryItem {
  ct: string;
  online: number;
}

export interface NsocksStateItem {
  state: string;
  count: number;
}

export interface NsocksHistoryItem {
  id: string;
  historyId: string;
  proxy: string;
  realIp: string;
  countryCode: string;
  country: string;
  state: string;
  city: string;
  zip: string;
  isp: string;
  domain: string;
  ping: string;
  speed: string;
  type: string;
  buyPrice: number;
  online: number;
  auth: string;
  minsLeft: string;
  comment: string;
  trafficLimit: number | null;
  trafficPrice: number | null;
  renewTraffic: number;
  renewPort: number;
  socks_ipchanged: number;
  isRefund: number;
  paid: number;
}



export interface NsocksRiskScoreScl {
  service: "scl";
  score: number;
  risk: string;
  balance: string;
  ip: string;
}

export interface NsocksRiskScoreIpq {
  service: "ipq";
  connectionType: string;
  vpn: boolean;
  tor: boolean;
  activeVpn: boolean;
  activeTor: boolean;
  recentAbuse: boolean;
  abuseVelocity: string;
  botStatus: boolean;
  mobile: boolean;
  fraudScore: number;
  balance: string;
  ip: string;
}

export type NsocksRiskScore = NsocksRiskScoreScl | NsocksRiskScoreIpq;



export type NsocksBlacklistResult = Record<string, "Clean" | "Yes">;



async function nsocksPost<T = unknown>(
  endpoint: string,
  apiKey: string,
  body: Record<string, unknown>
): Promise<T> {
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

  const data = (await res.json()) as Record<string, unknown>;

  if (data.STATUS !== "OK" && data.STATUS !== "SUCCESS") {
    throw new Error(
      `NSocks returned error [${endpoint}]: ${data.MESSAGE ?? JSON.stringify(data)}`
    );
  }

  return data as T;
}



function mapSearchProxy(raw: Record<string, unknown>): NsocksProxyItem {
  const id = String(raw.id ?? "");

  const speedBytes = Number(raw.speed ?? 0);
  const speedStr =
    speedBytes > 1_000_000
      ? `${(speedBytes / 1_000_000).toFixed(1)}M`
      : speedBytes > 1_000
      ? `${(speedBytes / 1_000).toFixed(0)}K`
      : `${speedBytes}`;

  const daysAgo = raw.added_days_ago !== undefined ? Number(raw.added_days_ago) : null;
  const addedStr =
    daysAgo !== null
      ? daysAgo === 0
        ? "Today"
        : daysAgo === 1
        ? "1 day ago"
        : `${daysAgo} days ago`
      : String(raw.added ?? "");

  const trafficLimitMb =
    raw.traffic_limit !== undefined ? Number(raw.traffic_limit) : null;
  const trafficPrice =
    raw.traffic_price !== undefined ? Number(raw.traffic_price) : null;
  let usageStr: string | undefined;
  if (trafficLimitMb !== null) {
    const gb = trafficLimitMb >= 1024
      ? `${(trafficLimitMb / 1024).toFixed(0)} GB`
      : `${trafficLimitMb} MB`;
    usageStr =
      trafficPrice !== null
        ? `${gb} / $${trafficPrice.toFixed(2)} per GB`
        : gb;
  }

  const rawCountry = String(raw.country ?? raw.ct ?? "");
  const country = rawCountry === "USA" ? "United States" : rawCountry;

  return {
    id,
    ip: String(raw.sock_real_ip ?? ""),
    port: 0,
    countryCode: String(raw.ct ?? ""),
    country,
    state: String(raw.region ?? ""),
    city: String(raw.city ?? ""),
    zip: String(raw.zip ?? ""),
    type: String(raw.user_type ?? "ISP"),
    isp: String(raw.isp ?? raw.org ?? ""),
    org: String(raw.org ?? raw.isp ?? ""),
    ping: Number(raw.ping ?? 0),
    speed: speedStr,
    price: Number(raw.price ?? 0),
    added: addedStr,
    
    
    
    blacklisted:
      raw.sbl_black === "1" ||   
      raw.css_black === "1" ||   
      raw.xbl_black === "1",     
    connectionString: `socks5://${raw.sock_real_ip ?? id}`,
    zone: raw.time_zone ? String(raw.time_zone) : undefined,
    usage: usageStr,
    domain: raw.domain ? String(raw.domain) : undefined,
    dns: raw.sock_dns_ip ? String(raw.sock_dns_ip) : undefined,
    udp: raw.socks_isudp === "Yes",
    rating: raw.rating !== undefined ? Number(raw.rating) : undefined,
    trafficLimit: trafficLimitMb !== null ? trafficLimitMb : undefined,
    trafficPrice: trafficPrice !== null ? trafficPrice : undefined,
  };
}

function mapBuyProxy(
  raw: Record<string, unknown>,
  proxyId: string
): NsocksBuyResult {
  const proxyData = (raw.DATA as Record<string, unknown>)?.PROXY as Record<
    string,
    unknown
  >;

  if (!proxyData) {
    throw new Error(`NSocks buy response missing DATA.PROXY (id: ${proxyId})`);
  }

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
    historyId: proxyData.ID ? String(proxyData.ID) : undefined,
  };
}



export async function nsocksFetchList(
  apiKey: string,
  params: {
    country?: string;
    ip?: string;
    zip?: string;
    domain?: string;
    type?: string;
    state?: string;
    city?: string;
    isp?: string;
    added?: number;
    area?: 25 | 50 | 100;
    page?: number;
    limit?: number;
    excludeUsed?: boolean;
    excludeBlacks?: boolean;
    highSpeed?: boolean;
    udp?: boolean;
    rotating?: 1 | 2;
    discountFilter?: boolean;
    sort?: string;
  }
): Promise<{ proxies: NsocksProxyItem[]; total: number; totalPage: number }> {
  const body: Record<string, unknown> = {
    METHOD: "search",
    COUNTRY: params.country || "US",
    COUNT: String(params.limit ?? 20),
    PAGE: params.page ?? 1,
  };

  if (params.type) {
    if (params.type === "DCH") {
      body.RESIDENTIAL = 2;
    } else if (params.type === "RESIDENTIAL") {
      body.RESIDENTIAL = 1;
    } else {
      body.TYPE = params.type; 
    }
  }

  if (params.ip)             body.IP             = params.ip;
  if (params.zip)            body.ZIP            = params.zip;
  if (params.domain)         body.DOMAIN         = params.domain;
  if (params.state)          body.STATE          = params.state;
  if (params.city)           body.CITY           = params.city;
  if (params.isp)            body.ISP            = params.isp;
  if (params.added)          body.ADDED          = params.added;
  if (params.area)           body.AREA           = params.area;
  if (params.excludeUsed)    body.EXCLUDE_USED   = 1;
  if (params.excludeBlacks)  body.EXCLUDE_BLACKS = 1;
  if (params.highSpeed)      body.HIGHSPEED      = 1;
  if (params.udp !== undefined) body.UDP         = params.udp ? 1 : 0;
  if (params.rotating)       body.ROTATING       = params.rotating;
  if (params.discountFilter) body.DISCOUNTFILTER = 1;
  if (params.sort)           body.SORT           = params.sort;

  const data = await nsocksPost<Record<string, unknown>>(
    "/api/search",
    apiKey,
    body
  );

  const payload = data.DATA as Record<string, unknown>;
  const meta = payload?.META as Record<string, unknown> | undefined;
  const rawList = (payload?.PROXIES as Record<string, unknown>[]) ?? [];

  return {
    proxies: rawList.map(mapSearchProxy),
    total: Number(meta?.proxies_total ?? rawList.length),
    totalPage: Number(meta?.total_pages ?? 1),
  };
}

export async function nsocksBuyProxy(
  apiKey: string,
  proxyId: string,
  username?: string,
  password?: string
): Promise<NsocksBuyResult> {
  const { randomBytes } = await import("crypto");

  const user = username || randomBytes(3).toString("hex").slice(0, 6);
  const pass = password || randomBytes(3).toString("hex").slice(0, 6);

  const data = await nsocksPost<Record<string, unknown>>("/api/buy", apiKey, {
    METHOD: "buy",
    ID: Number(proxyId),
    USERNAME: user,
    PASSWORD: pass,
  });

  const buyResult = mapBuyProxy(data, proxyId);

  
  try {
    const proxyDetails = await nsocksGetProxy(apiKey, proxyId);
    if (proxyDetails) {
      buyResult.country     = proxyDetails.country;
      buyResult.countryCode = proxyDetails.countryCode;
      buyResult.state       = proxyDetails.state;
      buyResult.city        = proxyDetails.city;
      buyResult.zip         = proxyDetails.zip;
      buyResult.type        = proxyDetails.type;
    }
  } catch {
    
  }

  return buyResult;
}

export async function nsocksGetProxy(
  apiKey: string,
  proxyId: string
): Promise<NsocksProxyItem | null> {
  const data = await nsocksPost<Record<string, unknown>>("/api/proxy", apiKey, {
    METHOD: "proxy",
    ID: Number(proxyId),
  });

  const payload = data.DATA as Record<string, unknown>;
  const rawList = (payload?.PROXIES as Record<string, unknown>[]) ?? [];

  return rawList.length > 0 ? mapSearchProxy(rawList[0]) : null;
}

export async function nsocksGetBalance(apiKey: string): Promise<number> {
  const data = await nsocksPost<Record<string, unknown>>(
    "/api/balance",
    apiKey,
    { METHOD: "balance" }
  );

  const payload = data.DATA as Record<string, unknown>;
  return Number(payload?.BALANCE ?? 0);
}

export async function nsocksGetHistory(
  apiKey: string,
  params: {
    ip?: string;
    port?: string;
    country?: string;
    state?: string;
    city?: string;
    zip?: string;
    isp?: string;
    type?: string;
    online?: 0 | 1;
    paid?: 0 | 1;
    comment?: string;
    page?: number;
    count?: number;
  } = {}
): Promise<{ proxies: NsocksHistoryItem[]; total: number; totalPage: number }> {
  const body: Record<string, unknown> = { METHOD: "history" };
  if (params.ip)      body.IP      = params.ip;
  if (params.port)    body.PORT    = params.port;
  if (params.country) body.COUNTRY = params.country;
  if (params.state)   body.STATE   = params.state;
  if (params.city)    body.CITY    = params.city;
  if (params.zip)     body.ZIP     = params.zip;
  if (params.isp)     body.ISP     = params.isp;
  if (params.type)    body.TYPE    = params.type;
  if (params.online !== undefined) body.ONLINE = params.online;
  if (params.paid !== undefined)   body.PAID   = params.paid;
  if (params.comment) body.COMMENT = params.comment;
  if (params.page)    body.PAGE    = params.page;
  if (params.count)   body.COUNT   = String(params.count);

  const data = await nsocksPost<Record<string, unknown>>(
    "/api/history",
    apiKey,
    body
  );

  const payload = data.DATA as Record<string, unknown>;
  const meta = payload?.META as Record<string, unknown> | undefined;
  const rawList = (payload?.PROXIES as Record<string, unknown>[]) ?? [];

  const proxies: NsocksHistoryItem[] = rawList.map((r) => ({
    id:            String(r.id ?? ""),
    historyId:     String(r.history_id ?? ""),
    proxy:         String(r.proxy ?? ""),
    realIp:        String(r.real_ip ?? ""),
    countryCode:   String(r.ct ?? ""),
    country:       String(r.country ?? ""),
    state:         String(r.region ?? ""),
    city:          String(r.city ?? ""),
    zip:           String(r.zip ?? ""),
    isp:           String(r.isp ?? ""),
    domain:        String(r.domain ?? ""),
    ping:          String(r.ping ?? ""),
    speed:         String(r.speed ?? ""),
    type:          String(r.user_type ?? ""),
    buyPrice:      Number(r.buy_price ?? 0),
    online:        Number(r.online ?? 0),
    auth:          String(r.socks_auth ?? ""),
    minsLeft:      String(r.mins_left ?? ""),
    comment:       String(r.comment ?? ""),
    trafficLimit:  r.traffic_limit !== undefined ? Number(r.traffic_limit) : null,
    trafficPrice:  r.traffic_price !== undefined ? Number(r.traffic_price) : null,
    renewTraffic:  Number(r.renew_traffic ?? 0),
    renewPort:     Number(r.renew_port ?? 0),
    socks_ipchanged: Number(r.socks_ipchanged ?? 0),
    isRefund:      Number(r.is_refund ?? 0),
    paid:          Number(r.paid ?? 0),
  }));

  return {
    proxies,
    total: Number(meta?.proxies_total ?? rawList.length),
    totalPage: Number(meta?.total_pages ?? 1),
  };
}

export async function nsocksRefund(
  apiKey: string,
  historyId: number
): Promise<{ message: string; balance: number }> {
  const data = await nsocksPost<Record<string, unknown>>(
    "/api/refund",
    apiKey,
    { METHOD: "refund", HISTORY_ID: historyId }
  );

  return {
    message: String(data.MESSAGE ?? ""),
    balance: Number(data.BALANCE ?? 0),
  };
}

export async function nsocksRenewTraffic(
  apiKey: string,
  historyId: number
): Promise<{ message: string; balance: number; traffic: number }> {
  const data = await nsocksPost<Record<string, unknown>>(
    "/api/renewtraffic",
    apiKey,
    { METHOD: "renewtraffic", HISTORY_ID: historyId }
  );

  return {
    message: String(data.MESSAGE ?? ""),
    balance: Number(data.BALANCE ?? 0),
    traffic: Number(data.TRAFFIC ?? 0),
  };
}

export async function nsocksSetAutoRenew(
  apiKey: string,
  historyId: number,
  enable: boolean
): Promise<{ historyId: string; autoRenew: number }> {
  const data = await nsocksPost<Record<string, unknown>>(
    "/api/autorenew",
    apiKey,
    { METHOD: "autorenew", HISTORY_ID: historyId, ENABLE: enable ? 1 : 0 }
  );

  const payload = data.DATA as Record<string, unknown>;
  return {
    historyId: String(payload?.HISTORY_ID ?? ""),
    autoRenew: Number(payload?.AUTORENEW ?? 0),
  };
}

export async function nsocksGetCountries(
  apiKey: string,
  country?: string
): Promise<NsocksCountryItem[]> {
  const body: Record<string, unknown> = { METHOD: "countries" };
  if (country) body.COUNTRY = country;

  const data = await nsocksPost<Record<string, unknown>>(
    "/api/countries",
    apiKey,
    body
  );

  const payload = data.DATA as Record<string, unknown>;
  const rawList = (payload?.PROXIES as Record<string, unknown>[]) ?? [];

  return rawList.map((r) => ({
    ct: String(r.ct ?? ""),
    online: Number(r.online ?? 0),
  }));
}

export async function nsocksGetStates(
  apiKey: string
): Promise<NsocksStateItem[]> {
  const data = await nsocksPost<Record<string, unknown>>(
    "/api/states",
    apiKey,
    { METHOD: "states" }
  );

  const payload = data.DATA as Record<string, unknown>;
  const rawList = (payload?.PROXIES as Record<string, unknown>[]) ?? [];

  return rawList.map((r) => ({
    state: String(r.state ?? ""),
    count: Number(r.cnt ?? 0),
  }));
}

export async function nsocksCheckRiskScore(
  apiKey: string,
  params:
    | { service: "scl" | "ipq"; proxyId: string; ip?: never }
    | { service: "scl" | "ipq"; ip: string; proxyId?: never }
): Promise<NsocksRiskScore> {
  const body: Record<string, unknown> = {
    METHOD: "checkriskscore",
    SERVICE: params.service,
  };
  if (params.proxyId) body.ID = params.proxyId;
  else                body.IP = params.ip;

  const data = await nsocksPost<Record<string, unknown>>(
    "/api/checkriskscore",
    apiKey,
    body
  );

  const raw     = data.DATA as Record<string, unknown>;
  const balance = String(data.BALANCE ?? "");
  const ip      = String(data.IP ?? "");
  const service = String(data.SERVICE ?? params.service) as "scl" | "ipq";

  if (service === "scl") {
    return {
      service: "scl",
      score:   Number(raw.score ?? 0),
      risk:    String(raw.risk ?? ""),
      balance,
      ip,
    } satisfies NsocksRiskScoreScl;
  }

  return {
    service:        "ipq",
    connectionType: String(raw.connection_type ?? ""),
    vpn:            Boolean(raw.vpn),
    tor:            Boolean(raw.tor),
    activeVpn:      Boolean(raw.active_vpn),
    activeTor:      Boolean(raw.active_tor),
    recentAbuse:    Boolean(raw.recent_abuse),
    abuseVelocity:  String(raw.abuse_velocity ?? ""),
    botStatus:      Boolean(raw.bot_status),
    mobile:         Boolean(raw.mobile),
    fraudScore:     Number(raw.fraud_score ?? 0),
    balance,
    ip,
  } satisfies NsocksRiskScoreIpq;
}

export async function nsocksCheckBlacks(
  apiKey: string,
  proxyId: string
): Promise<NsocksBlacklistResult> {
  const data = await nsocksPost<Record<string, unknown>>(
    "/api/checkblacks",
    apiKey,
    { METHOD: "checkblacks", ID: proxyId }
  );

  const raw = data.DATA as Record<string, unknown>;
  const result: NsocksBlacklistResult = {};
  for (const [key, val] of Object.entries(raw)) {
    result[key] = val === "Yes" ? "Yes" : "Clean";
  }
  return result;
}