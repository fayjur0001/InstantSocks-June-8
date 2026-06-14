

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { authApi, apiFetch, type LoginResponse } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";



export interface AuthUser {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  phone?: string;
  address?: string;
  role: "general" | "support" | "admin" | "super admin";
  balance?: number;
  isShadowAdmin?: boolean;
  banned?: boolean;
  bannedTill?: string | null;
  avatar?: string;
  firstName?: string;
  nickName?: string;
  lastName?: string;
  website?: string;
  telegram?: string;
  jabber?: string;
  bio?: string;
  badge?: string;
  isOnline?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  balance: number;
  notificationsCount: number;
  hostUrl: string;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (identifier: string, password: string, pin: string, rememberMe?: boolean) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  loginAs: (userId: string) => Promise<void>;
  exitLoginAs: () => Promise<{ role: string } | null>;
  refreshUser: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}



const AuthContext = createContext<AuthContextValue | null>(null);



async function fetchHostUrl(): Promise<string> {
  try {
    const res = await fetch(`${BASE}/api/site-info`, { cache: "no-store" });
    if (!res.ok) return "";
    const data = await res.json();
    return data?.hostUrl || "";
  } catch {
    return "";
  }
}



async function fetchAllAuthData(): Promise<Omit<AuthState, "loading">> {
  const [meData, balanceData, notifData, hostUrlData] = await Promise.allSettled([
    authApi.me(),
    authApi.balance(),
    authApi.notificationsCount(),
    fetchHostUrl(),
  ]);

  return {
    user:
      meData.status === "fulfilled"
        ? meData.value?.user ?? meData.value
        : null,
    balance:
      balanceData.status === "fulfilled"
        ? balanceData.value?.balance ?? 0
        : 0,
    notificationsCount:
      notifData.status === "fulfilled"
        ? notifData.value?.count ?? 0
        : 0,
    hostUrl:
      hostUrlData.status === "fulfilled"
        ? hostUrlData.value ?? ""
        : "",
  };
}



export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    balance: 0,
    notificationsCount: 0,
    hostUrl: "",      
    loading: true,
  });

  const refreshUser = useCallback(async () => {
    try {
      const data = await authApi.me();
      setState((prev) => ({ ...prev, user: data?.user ?? data }));
    } catch {
      setState((prev) => ({ ...prev, user: null }));
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    try {
      const data = await authApi.balance();
      setState((prev) => ({ ...prev, balance: data?.balance ?? 0 }));
    } catch {}
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await authApi.notificationsCount();
      setState((prev) => ({ ...prev, notificationsCount: data?.count ?? 0 }));
    } catch {}
  }, []);

  
  useEffect(() => {
    (async () => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        const data = await fetchAllAuthData();
        setState({ ...data, loading: false });
      } catch {
        setState({ user: null, balance: 0, notificationsCount: 0, hostUrl: "", loading: false });
      }
    })();
  }, []);

  const login = useCallback(
    async (identifier: string, password: string, pin: string, rememberMe = false) => {
      const loginData = await authApi.login({ identifier, password, pin, rememberMe });
      const data = await fetchAllAuthData();
      setState({ ...data, loading: false });
      return loginData;
    },
    []
  );

  const logout = useCallback(async () => {
    setState({ user: null, balance: 0, notificationsCount: 0, hostUrl: "", loading: false });
    try {
      await authApi.logout();
    } catch {}
  }, []);

  const loginAs = useCallback(async (userId: string) => {
    await apiFetch("/api/auth/login-as", {
      method: "POST",
      body: JSON.stringify({ id: userId }),
    });
    const data = await fetchAllAuthData();
    setState({ ...data, loading: false });
  }, []);

  const exitLoginAs = useCallback(async (): Promise<{ role: string } | null> => {
    let exitData: { role?: string } | null = null;
    try {
      exitData = await apiFetch("/api/auth/exit-login-as", { method: "POST" });
    } catch {
      setState({ user: null, balance: 0, notificationsCount: 0, hostUrl: "", loading: false });
      return null;
    }
    return { role: exitData?.role ?? "" };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        loginAs,
        exitLoginAs,
        refreshUser,
        refreshBalance,
        refreshNotifications,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}



export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}