import { apiFetch } from "@/lib/api";

export interface ProxyListParams {
  country?: string;
  type?: string;
  state?: string;
  page?: number;
  limit?: number;
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



export interface ProxyCountry {
  ct: string;   
  online: number; 
}

export interface ProxyState {
  state: string; 
  count: number;
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
};



export interface ProfileData {
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
    isOnline: boolean;
    createdAt: string;
    firstName: string;
    nickName: string;
    lastName: string;
    website: string;
    telegram: string;
    jabber: string;
    bio: string;
    avatar: string;
  };
}

export interface ProfileUpdatePayload {
  username?: string;
  firstName?: string;
  lastName?: string;
  nickName?: string;
  website?: string;
  telegram?: string;
  jabber?: string;
  bio?: string;
}

export const profileService = {
  getProfile: (): Promise<ProfileData> =>
    apiFetch("/api/auth/profile"),

  updateProfile: (payload: ProfileUpdatePayload): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  changePassword: (
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/auth/profile/change-password", {
      method: "POST",
      body: JSON.stringify({ oldPassword, newPassword }),
    }),

  changePin: (
    oldPin: string,
    newPin: string
  ): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/auth/profile/change-pin", {
      method: "POST",
      body: JSON.stringify({ oldPin, newPin }),
    }),

  


  uploadAvatar: (file: File): Promise<{ success: boolean; message: string; avatar: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        try {
          const result = await apiFetch("/api/auth/profile/avatar", {
            method: "POST",
            body: JSON.stringify({ avatar: base64 }),
          });
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });
  },
};