"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import CopyRightArea from "@/components/copy-right/CopyRightArea";
import HeaderNav from "@/components/user/headerNav/HeaderNav";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (redirected.current) return;

    // Login নেই
    if (!user) {
      redirected.current = true;
      router.replace("/login");
      return;
    }

    // ✅ FIX: shadow admin session এ banned check skip —
    // admin banned user এ login as করলে layout থেকে logout হওয়া উচিত না
    if (user.isShadowAdmin) return;

    // ✅ Permanently banned
    if (user.banned) {
      redirected.current = true;
      logout();
      router.replace("/login?reason=banned");
      return;
    }

    // ✅ Suspended
    if (user.bannedTill && new Date(user.bannedTill) > new Date()) {
      redirected.current = true;
      logout();
      router.replace("/login?reason=suspended");
      return;
    }
  }, [user, loading, router, logout]);

  // Banned/suspended হলে কিছু render করবে না
  // ✅ FIX: shadow admin session এ banned check skip — admin banned user এ login as করলে render হবে
  if (loading) return null;
  if (!user?.isShadowAdmin && user?.banned) return null;
  if (!user?.isShadowAdmin && user?.bannedTill && new Date(user.bannedTill) > new Date()) return null;

  return (
    <>
      <div className="bg-c-white-soft">
        <HeaderNav />
        <div className="flex-1 min-w-0 px-4 pt-3 pb-16 sm:pb-12 bg-dark min-h-[calc(100dvh-68px)] relative">
          {children}
          <CopyRightArea />
        </div>
      </div>
    </>
  );
}