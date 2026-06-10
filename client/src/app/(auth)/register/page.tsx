// PATH: client/src/app/(auth)/register/page.tsx

"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, Eye, EyeOff, User, Mail, Lock, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { toast } from "sonner";

interface RegisterPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

function validatePassword(pw: string): string {
  if (!pw) return "";
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Must contain at least one uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Must contain at least one lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Must contain at least one special character.";
  return "";
}

function validatePin(p: string): string {
  if (!p) return "";
  if (!/^\d{6}$/.test(p)) return "PIN must be exactly 6 digits.";
  return "";
}

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [agreed, setAgreed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>("");

  // Per-field blur errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let error = "";
    if (field === "username") error = value.trim() ? "" : "Username is required.";
    if (field === "email") error = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "Enter a valid email address.";
    if (field === "password") error = validatePassword(value);
    if (field === "confirmPassword") error = value === password ? "" : "Passwords do not match.";
    if (field === "pin") error = validatePin(value);
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError("");

    // Touch all fields so errors show
    const allFields = ["username", "email", "password", "confirmPassword", "pin"];
    const values: Record<string, string> = { username, email, password, confirmPassword, pin };
    const newErrors: Record<string, string> = {};

    for (const field of allFields) {
      let error = "";
      if (field === "username") error = values.username.trim() ? "" : "Username is required.";
      if (field === "email") error = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) ? "" : "Enter a valid email address.";
      if (field === "password") error = validatePassword(values.password);
      if (field === "confirmPassword") error = values.confirmPassword === password ? "" : "Passwords do not match.";
      if (field === "pin") error = validatePin(values.pin);
      newErrors[field] = error;
    }

    setFieldErrors(newErrors);
    setTouched({ username: true, email: true, password: true, confirmPassword: true, pin: true });

    const hasErrors = Object.values(newErrors).some((e) => e !== "");
    if (hasErrors) return;

    if (!agreed) {
      setSubmitError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      await authApi.register({ username, email, password, pin });
      toast.success("Your account has been successfully created!", {
        description: "Redirecting you to login...",
        duration: 3000,
      });
      setTimeout(() => {
        router.push("/login");
      }, 1000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.";
      setSubmitError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row font-sans bg-[#09090b] selection:bg-c-green-400/30">
      {/* Left COLUMN */}
      <section className="hidden lg:flex w-full lg:w-[50%] bg-zinc-100 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/auth-bg.png')] bg-cover bg-center opacity-30 mix-blend-multiply" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-c-orange-500/20 via-transparent to-transparent rounded-full blur-[100px] -translate-y-1/4 translate-x-1/4" />

        <div className="relative z-10 w-full max-w-3xl mx-auto pt-20 px-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-c-orange-500/10 text-c-orange-500 font-semibold text-sm mb-6 border border-c-orange-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-c-orange-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-c-orange-500"></span>
            </span>
            Join the Next Generation
          </div>
          <h2 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-zinc-900 mb-4">
            Welcome to InstantSocks.
          </h2>
          <p className="text-lg xl:text-xl text-zinc-600 font-medium">
            Every IP in our network is fully active, continuously monitored for speed, and thoroughly audited for quality. It is the ultimate solution for complex operations that demand precise geographic targeting down to the city level.
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
          <div className="bg-[#121214] border border-white/10 p-4 lg:p-6 rounded-2xl shadow-2xl w-full backdrop-blur-xl">
            <div className="mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white mb-2">
                Create a new account
              </h1>
              <p className="text-zinc-400 text-sm">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-c-orange-500 hover:text-c-orange-400 font-medium hover:underline transition-all"
                >
                  Sign in here
                </Link>
              </p>
            </div>

            {/* Submit-level error (server errors: username taken, etc.) */}
            {submitError && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Username
                </Label>
                <div className="relative flex items-center">
                  <User className="absolute left-4 w-5 h-5 text-zinc-500" />
                  <Input
                    id="username"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={() => handleBlur("username", username)}
                    className={`pl-12 bg-black/50 border-white/10 focus-visible:ring-1 focus-visible:ring-c-green-400 focus-visible:border-c-green-400 text-white h-12 rounded-xl transition-all ${touched.username && fieldErrors.username ? "border-red-500/50" : ""}`}
                  />
                </div>
                {touched.username && fieldErrors.username && (
                  <p className="text-xs text-red-400 pl-1">{fieldErrors.username}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Email Address
                </Label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-4 w-5 h-5 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleBlur("email", email)}
                    className={`pl-12 bg-black/50 border-white/10 focus-visible:ring-1 focus-visible:ring-c-green-400 focus-visible:border-c-green-400 text-white h-12 rounded-xl transition-all ${touched.email && fieldErrors.email ? "border-red-500/50" : ""}`}
                  />
                </div>
                {touched.email && fieldErrors.email && (
                  <p className="text-xs text-red-400 pl-1">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Password */}
                <div className="space-y-1.5">
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
                      onBlur={() => handleBlur("password", password)}
                      className={`pl-11 pr-10 bg-black/50 border-white/10 focus-visible:ring-1 focus-visible:ring-c-green-400 text-white h-12 rounded-xl ${touched.password && fieldErrors.password ? "border-red-500/50" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {touched.password && fieldErrors.password && (
                    <p className="text-xs text-red-400 pl-1">{fieldErrors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Confirm
                  </Label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-4 w-5 h-5 text-zinc-500" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onBlur={() => handleBlur("confirmPassword", confirmPassword)}
                      className={`pl-11 pr-10 bg-black/50 border-white/10 focus-visible:ring-1 focus-visible:ring-c-green-400 text-white h-12 rounded-xl ${touched.confirmPassword && fieldErrors.confirmPassword ? "border-red-500/50" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 text-zinc-500 hover:text-zinc-300"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {touched.confirmPassword && fieldErrors.confirmPassword && (
                    <p className="text-xs text-red-400 pl-1">{fieldErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Pin Code */}
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="pin" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Secret Pin Code
                </Label>
                <div className="relative flex items-center">
                  <KeyRound className="absolute left-4 w-5 h-5 text-zinc-500" />
                  <Input
                    id="pin"
                    placeholder="Create a 6-digit pin"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    onBlur={() => handleBlur("pin", pin)}
                    className={`pl-12 bg-black/50 border-white/10 focus-visible:ring-1 focus-visible:ring-c-green-400 text-white h-12 rounded-xl ${touched.pin && fieldErrors.pin ? "border-red-500/50" : ""}`}
                  />
                </div>
                {touched.pin && fieldErrors.pin && (
                  <p className="text-xs text-red-400 pl-1">{fieldErrors.pin}</p>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 space-y-6">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(Boolean(v))}
                    className="mt-1 w-5 h-5 border-zinc-600 rounded bg-black/50 data-[state=checked]:bg-c-green-400 data-[state=checked]:border-c-green-400"
                  />
                  <Label
                    htmlFor="terms"
                    className="text-sm flex items-center flex-wrap text-zinc-400 leading-relaxed cursor-pointer"
                  >
                    I agree to the{" "}
                    <Link
                      href="https://instantsocks.com/terms-conditions/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-c-green-400 underline decoration-white/30 hover:decoration-c-green-400 transition-colors"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="https://instantsocks.com/privacy-policy/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-c-green-400 underline decoration-white/30 hover:decoration-c-green-400 transition-colors"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-c-green-400 hover:bg-c-green-500 text-[#09090b] font-bold text-base h-12 rounded-xl shadow-[0_0_20px_rgba(74,222,128,0.2)] hover:shadow-[0_0_25px_rgba(74,222,128,0.4)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}