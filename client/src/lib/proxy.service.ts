import { apiFetch } from "@/lib/api";

export interface ProxyListParams {
  country?: string;
  type?: string;
  state?: string;
  page?: number;
  limit?: number;
  excludeBlacks?: boolean;
  excludeUsed?: boolean;
  highSpeed?: boolean;
  udp?: boolean;
  sort?: string;
}

export interface ProxyListItem {
  id: string;
  ip: string;
  domain: string;
  countryCode: string;
  country: string;
  state: string;
  city: string;
  isp: string;
  zip: string;
  speed: string;
  ping: number;
  type: string;
  added: string;
  price: number;
  originalPrice?: number;
  org: string;
  zone: string;
  dns: string;
  blacklisted: boolean;
  usage: string;
  connectionString: string;
  udp?: boolean;
  rating?: number;
}

export interface CartItem {
  id: number;
  proxyId: string;
  price: number;
  originalPrice: number;
  createdAt: string;
  _proxyMeta?: ProxyListItem;
}

export interface RentalItem {
  id: number;
  userId: number;
  port: string;
  note: string | null;
  originalPrice: number;
  price: number;
  country: string;
  ip: string;
  state: string;
  city: string;
  zip: string;
  type: string;
  auth: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: number; username: string; email: string } | null;
}

export interface ProxyAuthInfo {
  id: number;
  userId: number;
  username: string;
  password: string;
}

// ─── NEW: Country & State types ───────────────────────────────────────────────

export interface ProxyCountry {
  ct: string;   // country code, e.g. "US", "GB"
  online: number; // proxy count
}

export interface ProxyState {
  state: string; // e.g. "TX", "CA"
  count: number;
}

// ─── NSocks History Params ────────────────────────────────────────────────────

export interface NsocksHistoryParams {
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
}

// ─── I1 — Proxy List ──────────────────────────────────────────────────────────

export const proxyApi = {
  /**
   * GET /api/proxy/list
   * Country, type, state filter সহ proxy list আনে।
   */
  getList: (params: ProxyListParams = {}): Promise<{
    success: boolean;
    proxies: ProxyListItem[];
    total: number;
    totalPage: number;
  }> => {
    const q = new URLSearchParams();
    if (params.country) q.set("country", params.country);
    if (params.type) q.set("type", params.type);
    if (params.state) q.set("state", params.state);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.excludeBlacks) q.set("excludeBlacks", "true");
    if (params.excludeUsed)   q.set("excludeUsed",   "true");
    if (params.highSpeed)     q.set("highSpeed",      "true");
    if (params.udp)           q.set("udp",            "true");
    if (params.sort)          q.set("sort",           params.sort);
    return apiFetch(`/api/proxy/list?${q.toString()}`);
  },

  // ─── NEW: Countries ──────────────────────────────────────────────────────────

  /**
   * GET /api/proxy/countries
   * NSocks থেকে সব available countries + count আনে।
   */
  getDetails: (proxyId: string): Promise<{ success: boolean; proxy: ProxyListItem }> =>
    apiFetch(`/api/proxy/details/${proxyId}`),

  getCountries: (): Promise<{
    success: boolean;
    countries: ProxyCountry[];
  }> => apiFetch("/api/proxy/countries"),

  // ─── NEW: States (USA only) ───────────────────────────────────────────────────

  /**
   * GET /api/proxy/states
   * NSocks থেকে USA-র সব states + count আনে।
   */
  getStates: (): Promise<{
    success: boolean;
    states: ProxyState[];
  }> => apiFetch("/api/proxy/states"),

  // ─── I1 — Cart ──────────────────────────────────────────────────────────────

  /**
   * GET /api/proxy/cart
   * User-এর current cart items আনে।
   */
  getCart: (): Promise<{ success: boolean; items: CartItem[] }> =>
    apiFetch("/api/proxy/cart"),

  /**
   * POST /api/proxy/cart
   * Cart-এ proxy add করে।
   */
  addToCart: (
    proxyId: string,
    price: number,
    originalPrice: number
  ): Promise<{ success: boolean; item: CartItem }> =>
    apiFetch("/api/proxy/cart", {
      method: "POST",
      body: JSON.stringify({ proxyId, price, originalPrice }),
    }),

  /**
   * DELETE /api/proxy/cart/:id
   * Cart থেকে একটা item সরায়। id = CartItem.id (DB id, proxy id না)
   */
  removeFromCart: (id: number): Promise<{ success: boolean; message: string }> =>
    apiFetch(`/api/proxy/cart/${id}`, { method: "DELETE" }),

  // ─── I1 — Buy ───────────────────────────────────────────────────────────────

  /**
   * POST /api/proxy/rent
   * Cart-এর proxyIds কিনে। proxyIds = ProxyListItem.id গুলো।
   */
  rent: (
    proxyIds: string[]
  ): Promise<{ success: boolean; transactions: RentalItem[] }> =>
    apiFetch("/api/proxy/rent", {
      method: "POST",
      body: JSON.stringify({ proxyIds }),
    }),

  // ─── I1 — Socks5 Auth ───────────────────────────────────────────────────────

  /**
   * GET /api/proxy/auth
   * User-এর socks5 auth credentials আনে।
   */
  getAuth: (): Promise<{ success: boolean; auth: ProxyAuthInfo }> =>
    apiFetch("/api/proxy/auth"),

  /**
   * PUT /api/proxy/auth
   * Socks5 username/password আপডেট করে।
   */
  saveAuth: (
    username: string,
    password: string
  ): Promise<{ success: boolean; auth: ProxyAuthInfo }> =>
    apiFetch("/api/proxy/auth", {
      method: "PUT",
      body: JSON.stringify({ username, password }),
    }),

  // ─── I2 — My Rentals ────────────────────────────────────────────────────────

  /**
   * GET /api/proxy/my-rentals
   */
  getMyRentals: (
    page = 1,
    limit = 20
  ): Promise<{
    success: boolean;
    rentals: RentalItem[];
    total: number;
    totalPage: number;
  }> => apiFetch(`/api/proxy/my-rentals?page=${page}&limit=${limit}`),

  // ─── I2 — Renew ─────────────────────────────────────────────────────────────

  /**
   * POST /api/proxy/renew
   */
  renew: (
    rentalId: number
  ): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/proxy/renew", {
      method: "POST",
      body: JSON.stringify({ rentalId }),
    }),

  // ─── I2 — Swap Port ─────────────────────────────────────────────────────────

  /**
   * POST /api/proxy/swap-port
   */
  swapPort: (
    currentPort: string,
    newPort: string
  ): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/proxy/swap-port", {
      method: "POST",
      body: JSON.stringify({ currentPort, newPort }),
    }),

  // ─── NSocks Direct (user) ────────────────────────────────────────────────────

  /**
   * GET /api/proxy/nsocks-history
   * User-এর NSocks proxy history আনে।
   */
  getNsocksHistory: (params: NsocksHistoryParams = {}): Promise<{
    success: boolean;
    data: unknown;
  }> => {
    const q = new URLSearchParams();
    if (params.ip)      q.set("ip",      params.ip);
    if (params.port)    q.set("port",    params.port);
    if (params.country) q.set("country", params.country);
    if (params.state)   q.set("state",   params.state);
    if (params.city)    q.set("city",    params.city);
    if (params.zip)     q.set("zip",     params.zip);
    if (params.isp)     q.set("isp",     params.isp);
    if (params.type)    q.set("type",    params.type);
    if (params.online  !== undefined) q.set("online",  String(params.online));
    if (params.paid    !== undefined) q.set("paid",    String(params.paid));
    if (params.comment) q.set("comment", params.comment);
    if (params.page)    q.set("page",    String(params.page));
    if (params.count)   q.set("count",   String(params.count));
    return apiFetch(`/api/proxy/nsocks-history?${q.toString()}`);
  },

  /**
   * POST /api/proxy/nsocks-refund
   */
  nsocksRefund: (historyId: number): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/proxy/nsocks-refund", {
      method: "POST",
      body: JSON.stringify({ historyId }),
    }),

  /**
   * POST /api/proxy/nsocks-renew-traffic
   */
  nsocksRenewTraffic: (historyId: number): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/proxy/nsocks-renew-traffic", {
      method: "POST",
      body: JSON.stringify({ historyId }),
    }),

  /**
   * POST /api/proxy/nsocks-autorenew
   */
  nsocksAutoRenew: (
    historyId: number,
    enable: boolean
  ): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/proxy/nsocks-autorenew", {
      method: "POST",
      body: JSON.stringify({ historyId, enable }),
    }),

  /**
   * POST /api/proxy/check-risk
   */
  checkRisk: (
    service: "scl" | "ipq",
    proxyId?: string,
    ip?: string
  ): Promise<{ success: boolean; data: unknown }> =>
    apiFetch("/api/proxy/check-risk", {
      method: "POST",
      body: JSON.stringify({ service, proxyId, ip }),
    }),

  /**
   * POST /api/proxy/check-blacks
   */
  checkBlacks: (proxyId: string): Promise<{ success: boolean; data: unknown }> =>
    apiFetch("/api/proxy/check-blacks", {
      method: "POST",
      body: JSON.stringify({ proxyId }),
    }),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminProxyApi = {
  /**
   * GET /api/admin/proxy/ips
   */
  getIPs: (params: ProxyListParams = {}): Promise<{
    success: boolean;
    proxies: ProxyListItem[];
    total: number;
    totalPage: number;
  }> => {
    const q = new URLSearchParams();
    if (params.country) q.set("country", params.country);
    if (params.type) q.set("type", params.type);
    if (params.state) q.set("state", params.state);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.excludeBlacks) q.set("excludeBlacks", "true");
    if (params.excludeUsed)   q.set("excludeUsed",   "true");
    if (params.highSpeed)     q.set("highSpeed",      "true");
    if (params.udp)           q.set("udp",            "true");
    if (params.sort)          q.set("sort",           params.sort);
    return apiFetch(`/api/admin/proxy/ips?${q.toString()}`);
  },

  /**
   * GET /api/admin/proxy/all
   */
  getAllRentals: (
    page = 1,
    limit = 20,
    userId?: number
  ): Promise<{
    success: boolean;
    transactions: RentalItem[];
    total: number;
    totalPage: number;
  }> => {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (userId) q.set("userId", String(userId));
    return apiFetch(`/api/admin/proxy/all?${q.toString()}`);
  },

  // ─── Admin NSocks Direct ─────────────────────────────────────────────────────

  /**
   * GET /api/admin/proxy/nsocks-balance
   */
  getNsocksBalance: (): Promise<{ success: boolean; data: unknown }> =>
    apiFetch("/api/admin/proxy/nsocks-balance"),

  /**
   * GET /api/admin/proxy/nsocks-history
   */
  getNsocksHistory: (params: NsocksHistoryParams = {}): Promise<{
    success: boolean;
    data: unknown;
  }> => {
    const q = new URLSearchParams();
    if (params.ip)      q.set("ip",      params.ip);
    if (params.port)    q.set("port",    params.port);
    if (params.country) q.set("country", params.country);
    if (params.state)   q.set("state",   params.state);
    if (params.city)    q.set("city",    params.city);
    if (params.zip)     q.set("zip",     params.zip);
    if (params.isp)     q.set("isp",     params.isp);
    if (params.type)    q.set("type",    params.type);
    if (params.online  !== undefined) q.set("online",  String(params.online));
    if (params.paid    !== undefined) q.set("paid",    String(params.paid));
    if (params.comment) q.set("comment", params.comment);
    if (params.page)    q.set("page",    String(params.page));
    if (params.count)   q.set("count",   String(params.count));
    return apiFetch(`/api/admin/proxy/nsocks-history?${q.toString()}`);
  },

  /**
   * POST /api/admin/proxy/nsocks-refund
   */
  nsocksRefund: (historyId: number): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/admin/proxy/nsocks-refund", {
      method: "POST",
      body: JSON.stringify({ historyId }),
    }),

  /**
   * POST /api/admin/proxy/nsocks-renew-traffic
   */
  nsocksRenewTraffic: (historyId: number): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/admin/proxy/nsocks-renew-traffic", {
      method: "POST",
      body: JSON.stringify({ historyId }),
    }),

  /**
   * POST /api/admin/proxy/nsocks-autorenew
   */
  nsocksAutoRenew: (
    historyId: number,
    enable: boolean
  ): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/admin/proxy/nsocks-autorenew", {
      method: "POST",
      body: JSON.stringify({ historyId, enable }),
    }),

  /**
   * POST /api/admin/proxy/check-risk
   */
  checkRisk: (
    service: "scl" | "ipq",
    proxyId?: string,
    ip?: string
  ): Promise<{ success: boolean; data: unknown }> =>
    apiFetch("/api/admin/proxy/check-risk", {
      method: "POST",
      body: JSON.stringify({ service, proxyId, ip }),
    }),

  /**
   * POST /api/admin/proxy/check-blacks
   */
  checkBlacks: (proxyId: string): Promise<{ success: boolean; data: unknown }> =>
    apiFetch("/api/admin/proxy/check-blacks", {
      method: "POST",
      body: JSON.stringify({ proxyId }),
    }),

  /**
   * GET /api/admin/proxy/countries
   */
  getCountries: (): Promise<{
    success: boolean;
    countries: ProxyCountry[];
  }> => apiFetch("/api/admin/proxy/countries"),

  /**
   * GET /api/admin/proxy/states
   */
  getStates: (): Promise<{
    success: boolean;
    states: ProxyState[];
  }> => apiFetch("/api/admin/proxy/states"),
};