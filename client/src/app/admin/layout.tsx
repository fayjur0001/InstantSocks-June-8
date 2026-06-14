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

    
    if (!user) {
      redirected.current = true;
      router.replace("/login/instants");
      return;
    }

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
  }, [user, loading, router]);

  
  if (loading) {
    return (
      <div className="bg-black min-h-screen">
        {}
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