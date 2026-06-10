"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AdminHeaderNav from "@/components/admin/headerNav/HeaderNav";
import UserHeaderNav from "@/components/user/headerNav/HeaderNav";
import CopyRightArea from "@/components/copy-right/CopyRightArea";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (redirected.current) return;

    // Login নেই — /login/instants এ redirect
    if (!user) {
      redirected.current = true;
      router.replace("/login/instants");
      return;
    }

    // ✅ FIX: isShadowAdmin redirect এখানে থেকে সরানো হয়েছে।
    //
    // পুরনো code এ এখানে ছিল:
    //   if (user.isShadowAdmin) { router.replace("/user/dashboard"); }
    //
    // এটাই "Back to Admin" bug এর আসল কারণ ছিল:
    //   1. exitLoginAs() → setState(admin) → router.push("/admin/users")
    //   2. admin/layout mount হয় → useEffect চলে
    //   3. React কখনো কখনো এই layout render করে setState flush হওয়ার
    //      আগেই, তাই user.isShadowAdmin এখনো true থাকত
    //   4. এই redirect fire হত → আবার /user/dashboard এ যেত
    //   5. সেই dashboard এ logout কাজ করত না, refresh এ login page আসত
    //
    // ✅ Shadow session থেকে /admin block করার দায়িত্ব middleware.ts এর:
    //   if (isShadowSession && pathname.startsWith("/admin")) {
    //     return NextResponse.redirect(new URL("/user/dashboard", ...));
    //   }
    // middleware Edge runtime এ চলে, cookie directly পড়ে — React state
    // এর উপর নির্ভর করে না। তাই এটাই reliable guard।
    //
    // এই layout এ আর shadow check করার দরকার নেই।
  }, [user, loading, router]);

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
  if (!user) return null;

  const isSupport = user.role === "support";

  return (
    <>
      <div className="bg-c-white-soft">
        {isSupport ? <UserHeaderNav /> : <AdminHeaderNav />}
        <div className="flex-1 min-w-0 px-4 pt-3 pb-16 sm:pb-12 bg-dark min-h-[calc(100dvh-68px)] relative">
          {children}
          <CopyRightArea />
        </div>
      </div>
    </>
  );
}