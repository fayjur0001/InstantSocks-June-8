// PATH: client/src/components/user/headerNav/HeaderNav.tsx

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

function getRoleLabel(role?: string): string {
  switch (role) {
    case "super admin": return "Administrator";
    case "admin":       return "Admin";
    case "support":     return "Support";
    default:            return "Basic User";
  }
}

const HeaderNav = () => {
  const { user, logout, exitLoginAs } = useAuth();
  const router = useRouter();
  const [exitingLoginAs, setExitingLoginAs] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success("You have been logged out successfully.");
    router.push("/login");
  };

  // ✅ FIX: exitLoginAs এখন { role } return করে — state confirmed হওয়ার পর।
  // পুরনো version: await exitLoginAs() → router.push() — এই দুইয়ের মাঝে
  // React setState flush হওয়ার আগেই navigate হত, admin/layout stale
  // isShadowAdmin:true দেখে আবার /user/dashboard এ ফেলে দিত।
  //
  // নতুন version: role return হওয়া মানে fetchAllAuthData() সম্পূর্ণ এবং
  // setState() call হয়েছে। এরপর navigate করলে admin/layout সঠিক
  // (isShadowAdmin:false) state পাবে।
  const handleExitLoginAs = async () => {
    if (exitingLoginAs) return; // double-click guard
    setExitingLoginAs(true);
    try {
      const result = await exitLoginAs();

      if (!result) {
        // Server error — exitLoginAs already cleared state
        router.replace("/login/instants");
        return;
      }

      const { role } = result;

      // Admin/super admin/support হলে admin panel এ, অন্যথায় login এ
      if (role === "admin" || role === "super admin" || role === "support") {
        // ✅ FIX: router.replace — /user/dashboard admin-এর history-তে থাকবে না।
        // Back button চাপলে /user/dashboard এ ফিরে যাওয়া সম্ভব হবে না।
        // /admin/users হলো admin-এর user management page.
        window.location.replace("/admin/users");
      } else {
        // Unexpected — role restore হয়নি, safe fallback
        router.replace("/login/instants");
      }
    } catch {
      router.replace("/login/instants");
    } finally {
      setExitingLoginAs(false);
    }
  };

  const authUser = {
  name: user?.full_name || user?.username || "User",
  email: user?.email || "",
  image: user?.avatar || "/user.jpeg",  // avatar থাকলে দেখাও, না থাকলে default
  role: getRoleLabel(user?.role),
};

  return (
    <>
      {/* Impersonation banner — শুধু shadow admin session এ দেখাবে */}
      {user?.isShadowAdmin && (
        <div className="w-full bg-yellow-500 text-black text-sm px-4 py-2 flex items-center justify-between">
          <span>
            👁 Viewing as <strong>{user.username}</strong> — you are acting on behalf of this user
          </span>
          <button
            onClick={handleExitLoginAs}
            disabled={exitingLoginAs}
            className="ml-4 bg-black text-white text-xs font-semibold px-3 py-1 rounded hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exitingLoginAs ? "Exiting..." : "← Back to Admin"}
          </button>
        </div>
      )}

      <header className="sticky top-0 z-50 flex justify-between h-17 shrink-0 items-center gap-2 border-b border-white/10 bg-black px-4">
        <div className="flex items-center gap-2">
          <a href="https://acc.instantsocks.com" target="_blank" rel="noopener noreferrer">
            <Image
              src="/logo.webp"
              alt="logo"
              width={160}
              height={56}
              className="h-8 w-auto object-contain"
              priority
            />
          </a>
        </div>

        <Nav />

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            <NotificationDropdown />
          </div>

          <div className="flex items-center gap-4">
            <Wallete />
            <AdminUserDropdown user={authUser} handleLogout={handleLogout} />
          </div>
        </div>
      </header>
    </>
  );
};

export default HeaderNav;