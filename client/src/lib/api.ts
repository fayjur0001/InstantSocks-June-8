const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ✅ FIX Bug 10: 15 second timeout — server hang করলে user আটকে থাকবে না
const REQUEST_TIMEOUT_MS = 15_000;

export async function apiFetch(path: string, options?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: "include",
      // ✅ FIX: cache: "no-store" — Next.js 15+ fetch() default-এ cache করে।
      // এটা ছাড়া loginAs/exitLoginAs-এর পর /api/auth/me stale data দিত —
      // shadow user-এর role="general" ফেরত আসত, Back to Admin ভুল redirect করত।
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      ...options,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    // AbortError = timeout
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out. Please check your connection and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    try {
      const errData = await res.json();
      throw new Error(errData?.message || "Something went wrong. Please try again.");
    } catch (jsonErr) {
      // Only replace the error if JSON parsing itself failed (not an Error we just threw)
      if (jsonErr instanceof SyntaxError) {
        throw new Error("Something went wrong. Please try again.");
      }
      throw jsonErr;
    }
  }
  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  identifier: string; // email or username
  password: string;
  pin: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  role: "general" | "support" | "admin" | "super admin";
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  pin: string;
}

export interface ProfileUpdatePayload {
  username?: string;
  email?: string;
  full_name?: string;
  phone?: string;
  address?: string;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export interface ChangePinPayload {
  oldPin?: string;
  newPin: string;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  register: (payload: RegisterPayload) =>
    apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  logout: () =>
    apiFetch("/api/auth/logout", { method: "POST" }),

  me: () =>
    apiFetch("/api/auth/me"),

  balance: () =>
    apiFetch("/api/auth/balance"),

  notificationsCount: () =>
    apiFetch("/api/auth/notifications/count"),

  forgotPassword: (email: string) =>
    apiFetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (selector: string, token: string, newPassword: string) =>
    apiFetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ selector, token, newPassword }),
    }),

  getProfile: () =>
    apiFetch("/api/auth/profile"),

  updateProfile: (payload: ProfileUpdatePayload) =>
    apiFetch("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  changePassword: (payload: ChangePasswordPayload) =>
    apiFetch("/api/auth/profile/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  changePin: (payload: ChangePinPayload) =>
    apiFetch("/api/auth/profile/change-pin", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  loginAs: (userId: string) =>
    apiFetch("/api/auth/login-as", {
      method: "POST",
      body: JSON.stringify({ id: userId }),
    }),
};

// ─── Admin Settings ───────────────────────────────────────────────────────────

export interface AdminSettingsData {
  hostUrl?: string;
  siteMode?: string;
  notice?: string;
  maintenanceText?: string;
  siteLogo?: string;
  maintenanceEnd?: string; // ISO timestamp — e.g. "2026-06-10T15:00:00.000Z"
  rules?: string;
  termsAndConditions?: string;
  privacyPolicy?: string;
}

export interface PaymentApiProviderData {
  apiKey?: string;
  callbackSecret?: string;
}

export interface PaymentApiUpdatePayload {
  nowPayments?: PaymentApiProviderData;
  yaanPay?: PaymentApiProviderData;
  blockonomics?: PaymentApiProviderData;
  currentMethod?: string;
}

export const adminSettingsApi = {
  getSettings: (): Promise<{ data: AdminSettingsData }> =>
    apiFetch("/api/admin/settings"),

  updateSettings: (payload: AdminSettingsData) =>
    apiFetch("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  getPaymentApi: () =>
    apiFetch("/api/admin/payment-api"),

  updatePaymentApi: (payload: PaymentApiUpdatePayload) =>
    apiFetch("/api/admin/payment-api", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  getProductsApi: () =>
    apiFetch("/api/admin/products-api"),

  updateProductsApi: (payload: Record<string, unknown>) =>
    apiFetch("/api/admin/products-api", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};

// ─── Public Content (logged-in users) ────────────────────────────────────────

export interface PublicContentData {
  notice:             string;
  rules:              string;
  termsAndConditions: string;
  privacyPolicy:      string;
}

export const publicApi = {
  /** GET /api/dashboard/content — notice, rules, terms, privacy for dashboard */
  getContent: (): Promise<{ success: boolean; data: PublicContentData }> =>
    apiFetch("/api/dashboard/content"),
};

export const publicSettingsApi = {
  getSiteInfo: (): Promise<{ success: boolean; hostUrl: string }> =>
    apiFetch("/api/site-info"),
};