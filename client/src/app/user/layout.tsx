"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import CopyRightArea from "@/components/copy-right/CopyRightArea";
import HeaderNav from "@/components/user/headerNav/HeaderNav";
import { WrenchIcon } from "lucide-react";
import { apiFetch } from "@/lib/api";

// ─── Countdown helpers ────────────────────────────────────────────────────────

function calcTimeLeft(endIso: string | null): { h: number; m: number; s: number } | null {
  if (!endIso) return null;
  const diff = new Date(endIso).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    h: Math.floor(diff / 3_600_000),
    m: Math.floor((diff % 3_600_000) / 60_000),
    s: Math.floor((diff % 60_000) / 1_000),
  };
}

// calc function টা component এর বাইরে থাকায় stale closure সমস্যা নেই।
// endIso change হলে useEffect restart হয় এবং setInterval নতুন করে চালু হয়।
function useCountdown(endIso: string | null) {
  const [time, setTime] = useState<{ h: number; m: number; s: number } | null>(
    () => calcTimeLeft(endIso)
  );

  useEffect(() => {
    // endIso change হলে immediately নতুন value দাও
    setTime(calcTimeLeft(endIso));

    if (!endIso) return;

    const id = setInterval(() => {
      const next = calcTimeLeft(endIso);
      setTime(next);
      if (!next) clearInterval(id); // time শেষ হলে interval বন্ধ করো
    }, 1000);

    return () => clearInterval(id);
  }, [endIso]);

  return time;
}

// ─── Maintenance Wall ─────────────────────────────────────────────────────────
function MaintenanceWall({ message, endIso }: { message: string; endIso: string | null }) {
  const time = useCountdown(endIso);

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center">
        <div className="relative mx-auto w-24 h-24 mb-8">
          <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-2xl animate-pulse" />
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/25">
            <WrenchIcon className="w-10 h-10 text-amber-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Under Maintenance</h1>
        <p className="text-zinc-400 text-base leading-relaxed mb-8 max-w-sm mx-auto">
          {message || "We're performing scheduled maintenance to improve your experience. Please check back shortly."}
        </p>

        {/* Countdown timer — শুধু endIso থাকলে এবং time শেষ না হলে দেখাবে */}
        {time && (
          <div className="flex items-center justify-center gap-3 mb-8">
            {[
              { label: "Hours",   value: time.h },
              { label: "Minutes", value: time.m },
              { label: "Seconds", value: time.s },
            ].map(({ label, value }, i) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold text-amber-400 tabular-nums w-14 text-center">
                    {String(value).padStart(2, "0")}
                  </span>
                  <span className="text-xs text-zinc-500 mt-1">{label}</span>
                </div>
                {i < 2 && <span className="text-2xl font-bold text-zinc-600 mb-4">:</span>}
              </div>
            ))}
          </div>
        )}

        <div className="w-full max-w-xs mx-auto h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-amber-400/60 rounded-full animate-[maintenance-bar_2s_ease-in-out_infinite]" />
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes maintenance-bar {
            0%   { width: 0%;   margin-left: 0%; }
            50%  { width: 60%;  margin-left: 20%; }
            100% { width: 0%;   margin-left: 100%; }
          }
        `}} />
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const redirected = useRef(false);
  const [maintenance, setMaintenance] = useState<{ active: boolean; message: string; endIso: string | null }>({
    active: false,
    message: "",
    endIso: null,
  });

  // ✅ Maintenance check — admin/super admin bypass
  useEffect(() => {
    if (loading || !user) return;
    if (user.role === "admin" || user.role === "super admin") return;

    apiFetch("/api/site-status")
      .then((data: { maintenance: boolean; message: string; maintenanceEnd?: string | null }) => {
        if (data.maintenance) {
          setMaintenance({
            active: true,
            message: data.message,
            endIso: data.maintenanceEnd || null,
          });
        }
      })
      .catch(() => {/* network error — don't block */});
  }, [user, loading]);

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
  // ✅ FIX: loading=true তে null না দিয়ে skeleton দাও — white page বন্ধ হবে
  if (loading) {
    return (
      <div className="bg-black min-h-screen">
        {/* Header skeleton */}
        <div className="sticky top-0 z-50 flex justify-between h-17 shrink-0 items-center gap-2 border-b border-white/10 bg-black px-4">
          <div className="h-7 w-32 rounded bg-white/5 animate-pulse" />
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-white/5 animate-pulse" />
            <div className="h-8 w-24 rounded bg-white/5 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }
  if (!user?.isShadowAdmin && user?.banned) return null;
  if (!user?.isShadowAdmin && user?.bannedTill && new Date(user.bannedTill) > new Date()) return null;

  // ✅ Maintenance active হলে wall দেখাও
  if (maintenance.active) {
    return <MaintenanceWall message={maintenance.message} endIso={maintenance.endIso} />;
  }

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