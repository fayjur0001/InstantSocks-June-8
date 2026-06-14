"use client";

import AdminUserDropdown from "./AdminUserDropdown";
import NotificationDropdown from "./NotificationDropdown";
import Image from "next/image";
import Wallete from "./Wallete";
import Nav from "./Nav";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

function getRoleLabel(role?: string, badge?: string): string {
  switch (role) {
    case "super admin": return "Administrator";
    case "admin":       return "Admin";
    case "support":     return "Support";
    default:            return badge || "Basic User";
  }
}

const HeaderNav = () => {
  const { user, logout, exitLoginAs, hostUrl, siteLogo } = useAuth();
  const router = useRouter();
  const [exitingLoginAs, setExitingLoginAs] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success("You have been logged out successfully.");
    router.push("/login");
  };

  const handleExitLoginAs = async () => {
    if (exitingLoginAs) return;
    setExitingLoginAs(true);
    try {
      const result = await exitLoginAs();
      if (!result) {
        router.replace("/login/instants");
        return;
      }
      const { role } = result;
      if (role === "admin" || role === "super admin" || role === "support") {
        window.location.replace("/admin/users");
      } else {
        router.replace("/login/instants");
      }
    } catch {
      router.replace("/login/instants");
    } finally {
      setExitingLoginAs(false);
    }
  };

  const authUser = {
    name:  user?.full_name || user?.username || "User",
    email: user?.email || "",
    image: user?.avatar || "/user.jpeg",
    role:  getRoleLabel(user?.role, user?.badge),
    badge: user?.badge || "Basic",
  };

  return (
    <>
      <header className="sticky top-0 z-50 flex justify-between h-17 shrink-0 items-center gap-2 border-b border-white/10 bg-black px-4">
        <div className="flex items-center gap-2">
          <a href={hostUrl || "https://instantsocks.com/"} target="_blank" rel="noopener noreferrer">
            <Image
              src={siteLogo || "/logo.webp"}
              alt="logo"
              width={160}
              height={56}
              className="h-8 w-auto object-contain"
              priority
              unoptimized={!!siteLogo}
            />
          </a>
        </div>

        <Nav />

        <div className="flex items-center gap-3">
          {user?.isShadowAdmin && (
            <button
              onClick={handleExitLoginAs}
              disabled={exitingLoginAs}
              title={`Viewing as ${user.username} — click to return to admin`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 hover:border-amber-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exitingLoginAs ? (
                <span className="w-3 h-3 rounded-full border border-amber-400/40 border-t-amber-400 animate-spin" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                  <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {exitingLoginAs ? "Exiting…" : "Admin"}
            </button>
          )}

          <NotificationDropdown />
          <Wallete />
          <AdminUserDropdown user={authUser} handleLogout={handleLogout} />
        </div>
      </header>
    </>
  );
};

export default HeaderNav;