const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";


const REQUEST_TIMEOUT_MS = 15_000;

export async function apiFetch(path: string, options?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: "include",
      
      
      
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      ...options,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    
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
      
      if (jsonErr instanceof SyntaxError) {
        throw new Error("Something went wrong. Please try again.");
      }
      throw jsonErr;
    }
  }
  return res.json();
}



export interface LoginPayload {
  identifier: string; 
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



export interface AdminSettingsData {
  hostUrl?: string;
  siteMode?: string;
  notice?: string;
  maintenanceText?: string;
  siteLogo?: string;
  maintenanceEnd?: string; 
  rules?: string;
  termsAndConditions?: string;
  privacyPolicy?: string;
  authInfo?: {
    copyrightText?: string;
    signInText?: string;
    signUpText?: string;
    passwordResetText?: string;
    homeUrl?: string;
  };
  topUp?: {
    cryptoText?: string;
    blankCurrencyText?: string;
    generatedCurrencyText?: string;
    cautionText?: string;
    popUpText?: string;
  };
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



export interface PublicAuthInfo {
  copyrightText: string;
  signInText: string;
  signUpText: string;
  passwordResetText: string;
  homeUrl: string;
  siteLogo: string | null;
}

export const authInfoApi = {
  get: (): Promise<{ success: boolean; data: PublicAuthInfo }> =>
    apiFetch("/api/auth-info"),
};



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



export interface PublicContentData {
  notice:             string;
  rules:              string;
  termsAndConditions: string;
  privacyPolicy:      string;
}

export const publicApi = {
  
  getContent: (): Promise<{ success: boolean; data: PublicContentData }> =>
    apiFetch("/api/dashboard/content"),
};

export const publicSettingsApi = {
  getSiteInfo: (): Promise<{ success: boolean; hostUrl: string }> =>
    apiFetch("/api/site-info"),
};

export interface PublicTopUpSettings {
  cryptoText: string;
  blankCurrencyText: string;
  generatedCurrencyText: string;
  cautionText: string;
  popUpText: string;
}

export const publicTopUpApi = {
  getSettings: (): Promise<{ success: boolean; data: PublicTopUpSettings }> =>
    apiFetch("/api/public-topup-settings"),  
};