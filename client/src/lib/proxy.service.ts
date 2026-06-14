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
  domain?: string;
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
  
  nsocksHistoryId?: string | null;
  nsocksOnline?: number | null;
  nsocksMinsLeft?: string | null;
}

export interface ProxyAuthInfo {
  id: number;
  userId: number;
  username: string;
  password: string;
}



export interface ProxyCountry {
  ct: string;   
  online: number; 
}

export interface ProxyState {
  state: string; 
  count: number;
}



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



export const proxyApi = {
  


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

  

  


  getDetails: (proxyId: string): Promise<{ success: boolean; proxy: ProxyListItem }> =>
    apiFetch(`/api/proxy/details/${proxyId}`),

  getCountries: (): Promise<{
    success: boolean;
    countries: ProxyCountry[];
  }> => apiFetch("/api/proxy/countries"),

  

  


  getStates: (): Promise<{
    success: boolean;
    states: ProxyState[];
  }> => apiFetch("/api/proxy/states"),

  

  


  getCart: (): Promise<{ success: boolean; items: CartItem[] }> =>
    apiFetch("/api/proxy/cart"),

  


  addToCart: (
    proxyId: string,
    price: number,
    originalPrice: number
  ): Promise<{ success: boolean; item: CartItem }> =>
    apiFetch("/api/proxy/cart", {
      method: "POST",
      body: JSON.stringify({ proxyId, price, originalPrice }),
    }),

  


  removeFromCart: (id: number): Promise<{ success: boolean; message: string }> =>
    apiFetch(`/api/proxy/cart/${id}`, { method: "DELETE" }),

  

  


  rent: (
    proxyIds: string[]
  ): Promise<{ success: boolean; transactions: RentalItem[] }> =>
    apiFetch("/api/proxy/rent", {
      method: "POST",
      body: JSON.stringify({ proxyIds }),
    }),

  

  


  getAuth: (): Promise<{ success: boolean; auth: ProxyAuthInfo }> =>
    apiFetch("/api/proxy/auth"),

  


  saveAuth: (
    username: string,
    password: string
  ): Promise<{ success: boolean; auth: ProxyAuthInfo }> =>
    apiFetch("/api/proxy/auth", {
      method: "PUT",
      body: JSON.stringify({ username, password }),
    }),

  

  


  getMyRentals: (
    page = 1,
    limit = 20
  ): Promise<{
    success: boolean;
    rentals: RentalItem[];
    total: number;
    totalPage: number;
  }> => apiFetch(`/api/proxy/my-rentals?page=${page}&limit=${limit}`),

  

  


  renew: (
    rentalId: number
  ): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/proxy/renew", {
      method: "POST",
      body: JSON.stringify({ rentalId }),
    }),

  

  


  swapPort: (
    currentPort: string,
    newPort: string
  ): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/proxy/swap-port", {
      method: "POST",
      body: JSON.stringify({ currentPort, newPort }),
    }),

  

  


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

  


  nsocksRefund: (historyId: number): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/proxy/nsocks-refund", {
      method: "POST",
      body: JSON.stringify({ historyId }),
    }),

  


  nsocksRenewTraffic: (historyId: number): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/proxy/nsocks-renew-traffic", {
      method: "POST",
      body: JSON.stringify({ historyId }),
    }),

  


  nsocksAutoRenew: (
    historyId: number,
    enable: boolean
  ): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/proxy/nsocks-autorenew", {
      method: "POST",
      body: JSON.stringify({ historyId, enable }),
    }),

  


  checkRisk: (
    service: "scl" | "ipq",
    proxyId?: string,
    ip?: string
  ): Promise<{ success: boolean; data: unknown }> =>
    apiFetch("/api/proxy/check-risk", {
      method: "POST",
      body: JSON.stringify({ service, proxyId, ip }),
    }),

  


  checkBlacks: (proxyId: string): Promise<{ success: boolean; data: unknown }> =>
    apiFetch("/api/proxy/check-blacks", {
      method: "POST",
      body: JSON.stringify({ proxyId }),
    }),
};



export const adminProxyApi = {
  


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

  

  


  getNsocksBalance: (): Promise<{ success: boolean; data: unknown }> =>
    apiFetch("/api/admin/proxy/nsocks-balance"),

  


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

  


  nsocksRefund: (historyId: number): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/admin/proxy/nsocks-refund", {
      method: "POST",
      body: JSON.stringify({ historyId }),
    }),

  


  nsocksRenewTraffic: (historyId: number): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/admin/proxy/nsocks-renew-traffic", {
      method: "POST",
      body: JSON.stringify({ historyId }),
    }),

  


  nsocksAutoRenew: (
    historyId: number,
    enable: boolean
  ): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/admin/proxy/nsocks-autorenew", {
      method: "POST",
      body: JSON.stringify({ historyId, enable }),
    }),

  


  checkRisk: (
    service: "scl" | "ipq",
    proxyId?: string,
    ip?: string
  ): Promise<{ success: boolean; data: unknown }> =>
    apiFetch("/api/admin/proxy/check-risk", {
      method: "POST",
      body: JSON.stringify({ service, proxyId, ip }),
    }),

  


  checkBlacks: (proxyId: string): Promise<{ success: boolean; data: unknown }> =>
    apiFetch("/api/admin/proxy/check-blacks", {
      method: "POST",
      body: JSON.stringify({ proxyId }),
    }),

  


  getCountries: (): Promise<{
    success: boolean;
    countries: ProxyCountry[];
  }> => apiFetch("/api/admin/proxy/countries"),

  


  getStates: (): Promise<{
    success: boolean;
    states: ProxyState[];
  }> => apiFetch("/api/admin/proxy/states"),
};