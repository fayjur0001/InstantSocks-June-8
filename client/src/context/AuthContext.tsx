// src/context/AuthContext.tsx

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { authApi, apiFetch, type LoginResponse } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  // ─── Profile fields ───────────────────────────────────────────────────────
  avatar?: string;       // me() থেকে আসে — additionalInfo.profilePicture
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

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Helper: fetch all auth data at once ─────────────────────────────────────

async function fetchAllAuthData(): Promise<Omit<AuthState, "loading">> {
  const [meData, balanceData, notifData] = await Promise.allSettled([
    authApi.me(),
    authApi.balance(),
    authApi.notificationsCount(),
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
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    balance: 0,
    notificationsCount: 0,
    loading: true,
  });

  const refreshUser = useCallback(async () => {
    try {
      const data = await authApi.me();
      // me() response: { user: { avatar, firstName, ... } }
      // spread করে সব field ঠিকঠাক map হচ্ছে
      setState((prev) => ({ ...prev, user: data?.user ?? data }));
    } catch {
      setState((prev) => ({ ...prev, user: null }));
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    try {
      const data = await authApi.balance();
      setState((prev) => ({ ...prev, balance: data?.balance ?? 0 }));
    } catch {
      // silently fail
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await authApi.notificationsCount();
      setState((prev) => ({ ...prev, notificationsCount: data?.count ?? 0 }));
    } catch {
      // silently fail
    }
  }, []);

  // Bootstrap on mount
  useEffect(() => {
    (async () => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        const data = await fetchAllAuthData();
        setState({ ...data, loading: false });
      } catch {
        setState({ user: null, balance: 0, notificationsCount: 0, loading: false });
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
    setState({ user: null, balance: 0, notificationsCount: 0, loading: false });
    try {
      await authApi.logout();
    } catch {
      // silently ignore
    }
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
      setState({ user: null, balance: 0, notificationsCount: 0, loading: false });
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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}