"use client";

import React, { Suspense, useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Home, Eye, EyeOff, Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";

interface ResetPasswordPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

function ResetPasswordPageContent({
  searchParams,
}: ResetPasswordPageProps) {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const params = useSearchParams();
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  // ✅ FIX Bug 7: token URL এ রাখলে browser history/logs এ থাকে
  // প্রথমবার URL থেকে পড়ে sessionStorage এ সরিয়ে URL clean করো
  const [selector, setSelector] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const tokenMoved = useRef(false);

  useEffect(() => {
    if (tokenMoved.current) return;
    tokenMoved.current = true;

    const urlSelector = params.get("selector") ?? "";
    const urlToken = params.get("token") ?? "";

    if (urlSelector && urlToken) {
      // sessionStorage এ রাখো — tab বন্ধ হলে মুছে যাবে
      sessionStorage.setItem("reset_selector", urlSelector);
      sessionStorage.setItem("reset_token", urlToken);
      // URL clean করো — history তে token থাকবে না
      router.replace("/reset-password");
    } else {
      // URL clean হওয়ার পর sessionStorage থেকে পড়ো
      const storedSelector = sessionStorage.getItem("reset_selector") ?? "";
      const storedToken = sessionStorage.getItem("reset_token") ?? "";
      setSelector(storedSelector);
      setToken(storedToken);
    }
  }, [params, router]);

  useEffect(() => {
    const urlSelector = params.get("selector");
    const urlToken = params.get("token");
    if (!urlSelector && !urlToken) {
      // URL clean হয়ে গেছে — sessionStorage থেকে পড়ো
      setSelector(sessionStorage.getItem("reset_selector") ?? "");
      setToken(sessionStorage.getItem("reset_token") ?? "");
    }
  }, [params]);

  const togglePasswordVisibility = (): void => setShowPassword((p) => !p);
  const toggleConfirmPasswordVisibility = (): void =>
    setShowConfirmPassword((p) => !p);

  // Simple strength check
  const getStrength = (
    pwd: string
  ): { label: string; color: string; width: string } => {
    if (pwd.length === 0)
      return { label: "", color: "bg-zinc-700", width: "w-0" };
    if (pwd.length < 6)
      return { label: "Too short", color: "bg-red-500", width: "w-1/4" };
    if (pwd.length < 8)
      return { label: "Weak", color: "bg-c-orange-500", width: "w-2/4" };
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd))
      return { label: "Fair", color: "bg-yellow-400", width: "w-3/4" };
    return { label: "Strong", color: "bg-c-green-400", width: "w-full" };
  };

  const strength = getStrength(password);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError("");

    if (!selector || !token) {
      setError("Invalid or expired reset link. Please request a new one.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(selector, token, password);
      // ✅ token use হয়ে গেছে — sessionStorage থেকে মুছে দাও
      sessionStorage.removeItem("reset_selector");
      sessionStorage.removeItem("reset_token");
      setSubmitted(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Reset failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row font-sans bg-[#09090b] selection:bg-c-green-400/30">
       {/* Left COLUMN - Light/Image Showcase Area */}
      <section className="hidden lg:flex w-full lg:w-[50%] bg-zinc-100 flex-col justify-between relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 bg-[url('/auth-bg.png')] bg-cover bg-center opacity-30 mix-blend-multiply" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-c-orange-500/20 via-transparent to-transparent rounded-full blur-[100px] -translate-y-1/4 translate-x-1/4" />

        <div className="relative z-10 w-full max-w-3xl mx-auto pt-20 px-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-c-orange-500/10 text-c-orange-500 font-semibold text-sm mb-6 border border-c-orange-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-c-orange-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-c-orange-500"></span>
            </span>
            Fresh Start
          </div>
          <h2 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-zinc-900 mb-4">
            Back in control.
          </h2>
          <p className="text-lg xl:text-xl text-zinc-600 font-medium">
            Your account is secured and ready to go with your new credentials.
          </p>
        </div>

        {/* Floating App Mockup */}
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
          &copy; {currentYear} InstantSocks. All Rights Reserved.
        </footer>
      </section>

      {/* Right COLUMN */}
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
            href="https://instantsocks.com"
            className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/5 transition-all"
          >
            <Home className="w-4 h-4 text-c-orange-500" />
            <span>Home</span>
          </Link>
        </header>

        <div className="relative flex-1 flex flex-col justify-center items-center px-3 lg:px-6 w-full max-w-[700px] mx-auto z-20">
          <div className="bg-[#121214] border border-white/10 p-4 lg:p-6 sm:p-8 rounded-2xl shadow-2xl w-full backdrop-blur-xl">
            {!submitted ? (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white mb-2">
                    Set a new password
                  </h1>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Create a strong, unique password you haven&apos;t used before.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      New Password
                    </Label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-4 w-5 h-5 text-zinc-500" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-12 pr-10 bg-black/50 border-white/10 focus-visible:ring-1 focus-visible:ring-c-green-400 focus-visible:border-c-green-400 text-white h-12 rounded-xl transition-all"
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {/* Strength bar */}
                    {password.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                        </div>
                        {strength.label && (
                          <p className={`text-xs font-medium ${strength.color.replace("bg-", "text-")}`}>
                            {strength.label}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Confirm Password
                    </Label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-4 w-5 h-5 text-zinc-500" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="pl-12 pr-10 bg-black/50 border-white/10 focus-visible:ring-1 focus-visible:ring-c-green-400 text-white h-12 rounded-xl transition-all"
                      />
                      <button
                        type="button"
                        onClick={toggleConfirmPasswordVisibility}
                        className="absolute right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {/* Match indicator */}
                    {confirmPassword.length > 0 && (
                      <p className={`text-xs font-medium pt-1 ${password === confirmPassword ? "text-c-green-400" : "text-red-400"}`}>
                        {password === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                      </p>
                    )}
                  </div>

                  {/* Inline error */}
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                      <p className="text-sm font-medium text-red-400">{error}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-4 space-y-5">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-c-green-400 hover:bg-c-green-500 text-[#09090b] font-bold text-base h-12 rounded-xl shadow-[0_0_20px_rgba(74,222,128,0.2)] hover:shadow-[0_0_25px_rgba(74,222,128,0.4)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? "Updating..." : "Set New Password"}
                    </Button>

                    <div className="flex items-center justify-center">
                      <Link href="/login" className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                      </Link>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              /* Success State */
              <div className="text-center w-full py-6">
                <div className="mb-6 flex items-center justify-center w-16 h-16 rounded-full bg-c-green-400/10 border border-c-green-400/30 mx-auto shadow-[0_0_30px_rgba(74,222,128,0.15)]">
                  <CheckCircle2 className="w-8 h-8 text-c-green-400" />
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white mb-3">
                  Password updated!
                </h1>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6 max-w-md mx-auto">
                  Your password has been reset successfully. You can now sign in
                  to your RepeatSMS account with your new password.
                </p>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8 max-w-md mx-auto">
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    <strong className="text-white">Security Note:</strong> For your protection, all other active sessions across your devices have been securely signed out.
                  </p>
                </div>
                <Link href="/login" className="block w-full max-w-sm mx-auto">
                  <Button className="w-full bg-c-green-400 hover:bg-c-green-500 text-[#09090b] font-bold text-base h-12 rounded-xl shadow-[0_0_20px_rgba(74,222,128,0.2)] hover:shadow-[0_0_25px_rgba(74,222,128,0.4)] transition-all duration-300">
                    Continue to Login
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ResetPasswordPage(props: ResetPasswordPageProps) {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageContent {...props} />
    </Suspense>
  );
}