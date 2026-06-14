"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Home, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, authInfoApi, PublicAuthInfo } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const currentYear = new Date().getFullYear();
  const [authInfo, setAuthInfo] = useState<PublicAuthInfo | null>(null);

  useEffect(() => {
    authInfoApi.get().then(({ data }) => setAuthInfo(data)).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!email) return;
    setError("");
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row font-sans bg-[#09090b] selection:bg-c-green-400/30">
      {}
      <section className="hidden lg:flex w-full lg:w-[50%] bg-zinc-100 flex-col justify-between relative overflow-hidden">
        {}
        <div className="absolute inset-0 bg-[url('/auth-bg.png')] bg-cover bg-center opacity-30 mix-blend-multiply" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-c-orange-500/20 via-transparent to-transparent rounded-full blur-[100px] -translate-y-1/4 translate-x-1/4" />

        <div className="relative z-10 w-full max-w-3xl mx-auto pt-20 px-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-c-orange-500/10 text-c-orange-500 font-semibold text-sm mb-6 border border-c-orange-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-c-orange-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-c-orange-500"></span>
            </span>
            Account Recovery
          </div>
          <h2 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-zinc-900 mb-4">
            Secure account recovery.
          </h2>
          <p className="text-lg xl:text-xl text-zinc-600 font-medium">
            Your data and privacy stay completely safe every step of the way.
          </p>
        </div>

        {}
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
      {}
      <section className="relative w-full lg:w-[50%] min-h-screen flex flex-col text-zinc-100 pb-10 lg:pb-0 z-10 overflow-hidden">
        {}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-c-green-400/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 -translate-x-1/4" />

        {}
        <header className="relative flex justify-between items-center p-3 lg:p-6 w-full z-20">
          <Link
            href={authInfo?.homeUrl || "https://instantsocks.com"}
            className="hover:opacity-80 transition-opacity"
          >
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

        {}
        <div className="relative flex-1 flex flex-col justify-center items-center px-3 lg:px-6 w-full max-w-[700px] mx-auto z-20">
          <div className="bg-[#121214] border border-white/10 p-4 lg:p-6 sm:p-8 rounded-2xl shadow-2xl w-full backdrop-blur-xl">
            
            {!submitted ? (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white mb-2">
                    Forgot your password?
                  </h1>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {authInfo?.passwordResetText || "No worries — it happens to the best of us. Enter the email address linked to your account and we'll send you a secure reset link right away."}
                  </p>
                </div>

                {error && (
                  <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {}
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-xs font-semibold text-zinc-400 uppercase tracking-wider"
                    >
                      Email Address
                    </Label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-4 w-5 h-5 text-zinc-500" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your registered email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-12 bg-black/50 border-white/10 focus-visible:ring-1 focus-visible:ring-c-green-400 focus-visible:border-c-green-400 text-white h-12 rounded-xl transition-all"
                      />
                    </div>
                  </div>

                  {}
                  <div className="pt-2 space-y-5">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-c-green-400 hover:bg-c-green-500 text-[#09090b] font-bold text-base h-12 rounded-xl shadow-[0_0_20px_rgba(74,222,128,0.2)] hover:shadow-[0_0_25px_rgba(74,222,128,0.4)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? "Sending..." : "Send Reset Link"}
                    </Button>

                    <div className="flex items-center justify-center">
                      <Link
                        href="/login"
                        className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                      </Link>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              
              <div className="text-center w-full py-6">
                <div className="mb-6 flex items-center justify-center w-16 h-16 rounded-full bg-c-green-400/10 border border-c-green-400/30 mx-auto shadow-[0_0_30px_rgba(74,222,128,0.15)]">
                  <CheckCircle2 className="w-8 h-8 text-c-green-400" />
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white mb-3">
                  Check your inbox
                </h1>
                <p className="text-zinc-400 text-sm leading-relaxed mb-1">
                  We&apos;ve sent a password reset link to
                </p>
                <p className="text-c-green-400 font-medium mb-6 text-lg">{email}</p>
                <p className="text-zinc-500 text-xs leading-relaxed mb-8 max-w-sm mx-auto">
                  The link expires in 30 minutes. If you don&apos;t see the email,
                  check your spam folder or{" "}
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-c-orange-500 hover:text-c-orange-400 transition-colors font-medium hover:underline underline-offset-2"
                  >
                    try again
                  </button>
                  .
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
      
    </main>
  );
}