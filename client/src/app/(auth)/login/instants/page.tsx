"use client";

import React, { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, User, Lock, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { safeRedirect } from "@/lib/helpers";
import { toast } from "sonner";

function StaffLoginContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
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
      const loginData = await login(identifier, password, pin);

      if (loginData.role === "admin" || loginData.role === "super admin") {
        toast.success("Welcome back! You are logged in successfully.");
        router.push(safeRedirect(params.get("redirect"), "/admin/dashboard"));
      } else if (loginData.role === "support") {
        toast.success("Welcome back! You are logged in successfully.");
        router.push(safeRedirect(params.get("redirect"), "/admin/support"));
      } else {
        
        setError("Access denied. This portal is for staff only.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row font-sans bg-[#09090b] selection:bg-c-green-400/30">
      {}
      <section className="hidden lg:flex w-full lg:w-[50%] bg-zinc-100 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/auth-bg.png')] bg-cover bg-center opacity-30 mix-blend-multiply" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-c-orange-500/20 via-transparent to-transparent rounded-full blur-[100px] -translate-y-1/4 translate-x-1/4" />

        <div className="relative z-10 w-full max-w-3xl mx-auto pt-20 px-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-c-orange-500/10 text-c-orange-500 font-semibold text-sm mb-6 border border-c-orange-500/20">
            <ShieldCheck className="w-4 h-4" />
            Staff Portal
          </div>
          <h2 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-zinc-900 mb-4">
            Staff Access Only.
          </h2>
          <p className="text-lg xl:text-xl text-zinc-600 font-medium">
            This portal is restricted to authorized staff members — admins and support agents.
          </p>
        </div>

        <div className="flex-1 w-full flex items-center justify-center relative z-10 my-3 lg:my-6">
          <div className="relative w-full max-w-4xl aspect-[16/10]">
            <Image
              src="/auth-3.png"
              alt="InstantSocks Dashboard"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-contain"
              priority
            />
          </div>
        </div>

        <footer className="relative z-10 w-full text-center text-sm font-medium text-zinc-500 pb-6">
          &copy; {currentYear} InstantSocks. All Rights Reserved.
        </footer>
      </section>

      {}
      <section className="relative w-full lg:w-[50%] min-h-screen flex flex-col text-zinc-100 pb-10 lg:pb-0 z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-c-green-400/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 -translate-x-1/4" />

        <header className="relative flex justify-between items-center p-3 lg:p-6 w-full z-20">
          <Link href="https://instantsocks.com" className="hover:opacity-80 transition-opacity">
            <Image
              src="/logo.webp"
              alt="InstantSocks Logo"
              width={160}
              height={56}
              priority
              style={{ width: "auto", height: "auto" }}
              className="object-contain"
            />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/5 transition-all"
          >
            User Login
          </Link>
        </header>

        <div className="relative flex-1 flex flex-col justify-center items-center px-3 lg:px-6 w-full max-w-[700px] mx-auto z-20">
          <div className="bg-[#121214] border border-white/10 p-4 lg:p-6 rounded-2xl shadow-2xl w-full backdrop-blur-xl">

            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold mb-4 border border-amber-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Staff Portal
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white mb-2">
                Staff Sign In
              </h1>
              <p className="text-zinc-400 text-sm">
                Authorized personnel only.
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
                  Email / Username
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

export default function StaffLoginPage() {
  return (
    <Suspense fallback={null}>
      <StaffLoginContent />
    </Suspense>
  );
}