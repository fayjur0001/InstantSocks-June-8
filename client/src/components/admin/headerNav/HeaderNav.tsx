// PATH: client/src/components/admin/headerNav/HeaderNav.tsx

"use client";

import AdminUserDropdown from "./AdminUserDropdown";
import NotificationDropdown from "./NotificationDropdown";
import Image from "next/image";
import Wallete from "./Wallete";
import Nav from "./Nav";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
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
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    toast.success("You have been logged out successfully.");
    router.push("/login");
  };

  const authUser = {
    name: user?.full_name || user?.username || "Admin",
    email: user?.email || "",
    image: user?.avatar || "/user.jpeg",
    role: getRoleLabel(user?.role),
  };

  return (
    <header className="sticky top-0 z-50 flex justify-between h-17 shrink-0 items-center gap-2 border-b border-white/10 bg-black px-4">
      <div className="flex items-center gap-2">
        <a href="https://acc.instantsocks.com" target="_blank" rel="noopener noreferrer">
          <Image
            src="/logo.webp"
            alt="logo"
            width={160}
            height={56}
            className="h-7 w-auto object-contain"
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
  );
};

export default HeaderNav;