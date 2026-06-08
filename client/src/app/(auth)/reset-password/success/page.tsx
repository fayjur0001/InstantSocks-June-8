"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Home, CheckCircle2, ArrowRight, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ResetSuccessPage() {
  const currentYear = new Date().getFullYear();

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row font-sans bg-[#09090b] selection:bg-c-green-400/30">
      {/* Left COLUMN - Light Promotional Area */}
      <section className="hidden lg:flex w-full lg:w-[50%] bg-zinc-100 flex-col justify-between relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 bg-[url('/auth-bg.png')] bg-cover bg-center opacity-30 mix-blend-multiply" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-c-orange-500/20 via-transparent to-transparent rounded-full blur-[100px] -translate-y-1/4 translate-x-1/4" />

        <div className="relative z-10 w-full max-w-3xl mx-auto pt-20 px-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-c-green-400/10 text-c-green-400 font-semibold text-sm mb-6 border border-c-green-400/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-c-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-c-green-400"></span>
            </span>
            Security Verified
          </div>
          <h2 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-zinc-900 mb-4">
            You&apos;re all set.
          </h2>
          <p className="text-lg xl:text-xl text-zinc-600 font-medium">
            Your account is secure, updated, and ready for use.
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
              className="object-contain px-10"
              priority
            />
          </div>
        </div>

        <footer className="relative z-10 w-full text-center text-sm font-medium text-zinc-500 pb-6">
          &copy; {currentYear} InstantSocks. All Rights Reserved.
        </footer>
      </section>

      {/* Right COLUMN - Success Message Area */}
      <section className="relative w-full lg:w-[50%] min-h-screen flex flex-col text-zinc-100 pb-10 lg:pb-0 z-10 overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-c-green-400/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 -translate-x-1/4" />

        {/* Header */}
        <header className="relative flex justify-between items-center p-3 lg:p-6 w-full z-20">
          <Link
            href="https://instantsocks.com"
            className="hover:opacity-80 transition-opacity"
          >
            <Image
              src="/logo.webp" // Updated to match your theme logo name
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

        {/* Success Card */}
        <div className="relative flex-1 flex flex-col justify-center items-center px-3 lg:px-6 w-full max-w-[600px] mx-auto z-20">
          <div className="bg-[#121214] border border-white/10 p-6 lg:p-10 rounded-2xl shadow-2xl w-full backdrop-blur-xl text-center">
            
            {/* Animated Success Icon */}
            <div className="mb-8 relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-c-green-400/10 border border-c-green-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(74,222,128,0.15)]">
                <CheckCircle2 className="w-10 h-10 text-c-green-400" />
              </div>
            </div>

            <div className="mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white mb-3">
                Password reset successful!
              </h1>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Your password has been updated and your account is secured. 
                You can now sign in to RepeatSMS using your new credentials.
              </p>
            </div>

            {/* Info Badges */}
            <div className="w-full space-y-4 mb-10 text-left">
              <div className="flex items-start gap-4 bg-white/5 border border-white/5 rounded-xl p-4 transition-colors hover:bg-white/[0.07]">
                <div className="mt-1 bg-c-green-400/20 p-1.5 rounded-md">
                   <ShieldCheck className="w-4 h-4 text-c-green-400 shrink-0" />
                </div>
                <div>
                  <p className="text-sm text-zinc-200 font-semibold">
                    All sessions signed out
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                    For your security, all other active sessions have been
                    terminated across all your devices.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-white/5 border border-white/5 rounded-xl p-4 transition-colors hover:bg-white/[0.07]">
                <div className="mt-1 bg-c-orange-500/20 p-1.5 rounded-md">
                  <Lock className="w-4 h-4 text-c-orange-500 shrink-0" />
                </div>
                <div>
                  <p className="text-sm text-zinc-200 font-semibold">
                    Keep your password safe
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                    Never share your password. RepeatSMS staff will
                    never ask for your credentials via email or chat.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Actions */}
            <div className="space-y-6">
              <Link href="/login" className="block w-full">
                <Button className="w-full bg-c-green-400 hover:bg-c-green-500 text-[#09090b] font-bold text-base h-12 rounded-xl shadow-[0_0_20px_rgba(74,222,128,0.2)] hover:shadow-[0_0_25px_rgba(74,222,128,0.4)] transition-all duration-300 flex items-center justify-center gap-2">
                  Continue to Login
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>

              <p className="text-xs text-zinc-500">
                Didn&apos;t request this change?{" "}
                <Link
                  href="https://repeatsms.com/support"
                  className="text-c-orange-500 hover:text-c-orange-400 transition-colors font-medium underline-offset-4 hover:underline"
                >
                  Contact support immediately.
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>   
    </main>
  );
}
