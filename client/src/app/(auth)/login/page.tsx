// PATH: client/src/app/(auth)/login/page.tsx

"use client";

import React, { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Home, Eye, EyeOff, User, Lock, KeyRound, WrenchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, authInfoApi, PublicAuthInfo } from "@/lib/api";
import { safeRedirect } from "@/lib/helpers";
import { toast } from "sonner";

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

function useCountdown(endIso: string | null) {
  const [time, setTime] = useState<{ h: number; m: number; s: number } | null>(
    () => calcTimeLeft(endIso)
  );
  useEffect(() => {
    setTime(calcTimeLeft(endIso));
    if (!endIso) return;
    const id = setInterval(() => {
      const next = calcTimeLeft(endIso);
      setTime(next);
      if (!next) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [endIso]);
  return time;
}

// ─── Maintenance Modal ────────────────────────────────────────────────────────
function MaintenanceModal({ message, endIso, onClose }: { message: string; endIso: string | null; onClose: () => void }) {
  const time = useCountdown(endIso);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md bg-[#121214] border border-white/10 rounded-2xl shadow-2xl p-6 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 mx-auto mb-4">
          <WrenchIcon className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          Site Under Maintenance
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-5">
          {message || "We're performing scheduled maintenance to improve your experience. Please check back shortly."}
        </p>
        {time ? (
          <div className="flex items-center justify-center gap-3 mb-5">
            {[
              { label: "Hours",   value: time.h },
              { label: "Minutes", value: time.m },
              { label: "Seconds", value: time.s },
            ].map(({ label, value }, i) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold text-amber-400 tabular-nums w-12 text-center">
                    {String(value).padStart(2, "0")}
                  </span>
                  <span className="text-xs text-zinc-500 mt-0.5">{label}</span>
                </div>
                {i < 2 && <span className="text-xl font-bold text-zinc-600 mb-4">:</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
        <Button
          onClick={onClose}
          className="w-full bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl h-11"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

function LoginPageContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [maintenanceModal, setMaintenanceModal] = useState<{ open: boolean; message: string; endIso: string | null }>({
    open: false,
    message: "",
    endIso: null,
  });
  const [authInfo, setAuthInfo] = useState<PublicAuthInfo | null>(null);

  useEffect(() => {
    authInfoApi.get().then(({ data }) => setAuthInfo(data)).catch(() => {});
  }, []);

  const { login, logout } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const currentYear = new Date().getFullYear();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!identifier || !password || !pin) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      // ✅ FIX: Login এর আগে maintenance check করো।
      //         Maintenance active থাকলে modal দেখাও, login হতে দিও না।
      //         Admin/super admin এর জন্য check করার দরকার নেই —
      //         তারা এই portal এ আসেই না (instants portal আলাদা)।
      const statusData = await apiFetch("/api/site-status").catch(() => null);
      if (statusData?.maintenance) {
        setMaintenanceModal({
          open: true,
          message: statusData.message,
          endIso: statusData.maintenanceEnd || null,
        });
        setLoading(false);
        return;
      }

      const loginData = await login(identifier, password, pin, rememberMe);

      if (
        loginData.role === "admin" ||
        loginData.role === "super admin" ||
        loginData.role === "support"
      ) {
        await logout();
        setError("Staff accounts must log in via the staff portal.");
        return;
      }

      toast.success("You have logged in successfully. Welcome back!");
      router.push(safeRedirect(params.get("redirect"), "/user/dashboard"));
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      if (msg.toLowerCase().includes("maintenance")) {
        setMaintenanceModal({ open: true, message: msg, endIso: null });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row font-sans bg-[#09090b] selection:bg-c-green-400/30">
      {maintenanceModal.open && (
        <MaintenanceModal
          message={maintenanceModal.message}
          endIso={maintenanceModal.endIso}
          onClose={() => setMaintenanceModal({ open: false, message: "", endIso: null })}
        />
      )}

      {/* Left column */}
      <section className="hidden lg:flex w-full lg:w-[50%] bg-zinc-100 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/auth-bg.png')] bg-cover bg-center opacity-30 mix-blend-multiply" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-c-orange-500/20 via-transparent to-transparent rounded-full blur-[100px] -translate-y-1/4 translate-x-1/4" />

        <div className="relative z-10 w-full max-w-3xl mx-auto pt-20 px-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-c-orange-500/10 text-c-orange-500 font-semibold text-sm mb-6 border border-c-orange-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-c-orange-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-c-orange-500"></span>
            </span>
            Welcome Back
          </div>
          <h2 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-zinc-900 mb-4">
            Log in to your account.
          </h2>
          <p className="text-lg xl:text-xl text-zinc-600 font-medium">
            {authInfo?.signInText || "Every IP in our network is fully active, continuously monitored for speed, and thoroughly audited for quality. It is the ultimate solution for complex operations that demand precise geographic targeting down to the city level."}
          </p>
        </div>

        <div className="flex-1 w-full flex items-center justify-center relative z-10 my-3 lg:my-6">
          <div className="relative w-full max-w-4xl aspect-[16/10]">
            <Image
              src="/auth-3.png"
              alt="RepeatSMS Dashboard Interface"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-contain"
              priority
            />
          </div>
        </div>

        <footer className="relative z-10 w-full text-center text-sm font-medium text-zinc-500 pb-6">
          {authInfo?.copyrightText
            ? authInfo.copyrightText.replace("${year}", String(currentYear))
            : `© ${currentYear} InstantSocks. All Rights Reserved.`}
        </footer>
      </section>

      {/* Right column */}
      <section className="relative w-full lg:w-[50%] min-h-screen flex flex-col text-zinc-100 pb-10 lg:pb-0 z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-c-green-400/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 -translate-x-1/4" />

        <header className="relative flex justify-between items-center p-3 lg:p-6 w-full z-20">
          <Link href={authInfo?.homeUrl || "https://instantsocks.com"} className="hover:opacity-80 transition-opacity">
            <Image
              src={authInfo?.siteLogo || "/logo.webp"}
              alt="InstantSocks Logo"
              width={160}
              height={56}
              priority
              style={{ width: "auto", height: "auto" }}
              className="object-contain"
            />
          </Link>
          <Link
            href={authInfo?.homeUrl || "https://instantsocks.com"}
            className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/5 transition-all"
          >
            <Home className="w-4 h-4 text-c-orange-500" />
            <span>Home</span>
          </Link>
        </header>

        <div className="relative flex-1 flex flex-col justify-center items-center px-3 lg:px-6 w-full max-w-[700px] mx-auto z-20">
          <div className="bg-[#121214] border border-white/10 p-4 lg:p-6 rounded-2xl shadow-2xl w-full backdrop-blur-xl">

            <div className="mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white mb-2">
                Welcome Back!
              </h1>
              <p className="text-zinc-400 text-sm">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-c-orange-500 hover:text-c-orange-400 font-medium hover:underline transition-all">
                  Create a new account
                </Link>
              </p>
            </div>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Email/Username
                </Label>
                <div className="relative flex items-center">
                  <User className="absolute left-4 w-5 h-5 text-zinc-500" />
                  <Input
                    id="identifier"
                    placeholder="Email or Username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-12 bg-black/50 border-white/10 focus-visible:ring-1 focus-visible:ring-c-green-400 focus-visible:border-c-green-400 text-white h-12 rounded-xl transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Password
                </Label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 w-5 h-5 text-zinc-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 pr-10 bg-black/50 border-white/10 focus-visible:ring-1 focus-visible:ring-c-green-400 text-white h-12 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <Label htmlFor="pin" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Secret Pin Code
                </Label>
                <div className="relative flex items-center">
                  <KeyRound className="absolute left-4 w-5 h-5 text-zinc-500" />
                  <Input
                    id="pin"
                    type="password"
                    placeholder="Enter your secret code"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="pl-12 bg-black/50 border-white/10 focus-visible:ring-1 focus-visible:ring-c-green-400 text-white h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(v) => setRememberMe(Boolean(v))}
                    className="mt-0.5 w-5 h-5 border-zinc-600 rounded bg-black/50 data-[state=checked]:bg-c-green-400 data-[state=checked]:border-c-green-400"
                  />
                  <Label htmlFor="remember" className="text-sm font-medium text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors">
                    Remember me
                  </Label>
                </div>
                <Link href="/forgot-password" className="text-sm font-medium text-c-orange-500 hover:text-c-orange-400 hover:underline transition-all">
                  Forgot Password?
                </Link>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-c-green-400 hover:bg-c-green-500 text-[#09090b] font-bold text-base h-12 rounded-xl shadow-[0_0_20px_rgba(74,222,128,0.2)] hover:shadow-[0_0_25px_rgba(74,222,128,0.4)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}