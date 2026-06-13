// PATH: client/src/components/user/headerNav/AdminUserDropdown.tsx

"use client";

import useDropdown from "@/hooks/useDropdown";
import { ChevronUp, LucideLogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

// ─── Badge Styles ─────────────────────────────────────────────────────────────
const BADGE_STYLES: Record<string, { text: string; bg: string; border: string; glow: string; icon: string }> = {
  Basic:   { text: "text-c-slate-300",  bg: "bg-c-slate-800",     border: "border-c-slate-700",     glow: "",                                        icon: "⚪" },
  Bronze:  { text: "text-c-amber-400",  bg: "bg-c-amber-700/20",  border: "border-c-amber-700/50",  glow: "shadow-[0_0_8px_rgba(180,83,9,0.4)]",     icon: "🥉" },
  Silver:  { text: "text-c-slate-200",  bg: "bg-c-slate-600/20",  border: "border-c-slate-500/50",  glow: "shadow-[0_0_8px_rgba(148,163,184,0.3)]",  icon: "🥈" },
  Gold:    { text: "text-c-yellow-400", bg: "bg-c-yellow-400/10", border: "border-c-yellow-400/40", glow: "shadow-[0_0_8px_rgba(250,204,21,0.4)]",   icon: "🥇" },
  Diamond: { text: "text-c-cyan-400",   bg: "bg-c-cyan-900/30",   border: "border-c-cyan-400/40",   glow: "shadow-[0_0_10px_rgba(34,211,238,0.45)]", icon: "💎" },
};

// ─── Badge Pill ───────────────────────────────────────────────────────────────
function BadgePill({ role, badge }: { role?: string; badge?: string }) {
  // admin/support/super admin — plain label
  if (role === "admin" || role === "super admin" || role === "support") {
    const label =
      role === "super admin" ? "Administrator"
      : role === "admin"     ? "Admin"
      :                        "Support";
    return <span className="text-[12px] text-c-gray-400">{label}</span>;
  }

  const tier = badge || "Basic";
  const s    = BADGE_STYLES[tier] ?? BADGE_STYLES["Basic"];

  return (
  <span className={`inline-flex items-center gap-1 px-1.5 py-0 rounded-full text-[9px] font-bold border ${s.text} ${s.bg} ${s.border} ${s.glow}`}>
    <span className="text-[8px]">{s.icon}</span>
    {tier} User
  </span>
);
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface AdminUserDropdownProps {
  user: {
    name?:  string;
    email?: string;
    image?: string;
    role?:  string;
    badge?: string; // ← new
  };
  handleLogout: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
const AdminUserDropdown = ({ user, handleLogout }: AdminUserDropdownProps) => {
  const { dropdownOpen, setDropdownOpen, dropdownRef } = useDropdown();
  const { user: authUser } = useAuth();
  const supportLink = authUser?.role === "support" ? "/admin/support" : "/user/support";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <div
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center border border-white/10 bg-white/5 p-1 rounded-[8px] gap-2 cursor-pointer transition duration-200 hover:bg-c-bg-400"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-brand-500">
          <img src={user?.image || "/user.jpeg"} width={32} height={32} alt="" className="w-full h-full object-cover" />
        </div>

        {/* Name + Badge */}
        {/* Name + Badge */}
        <div className="flex-col leading-tight hidden lg:flex">
        <span className="text-[13px] text-white">{user?.name}</span>
        <BadgePill role={user?.role} badge={user?.badge} />
        </div>

        {/* Chevron */}
        <ChevronUp
          className={`w-5 text-c-gray-400 transition-transform ${
            dropdownOpen ? "rotate-0" : "rotate-180"
          }`}
        />
      </div>

      {/* Dropdown */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-c-bg-500 text-c-gray-300 shadow-2xl rounded-lg z-50 overflow-hidden border border-c-gray-700">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-c-gray-700">
            <div className="relative">
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <Image src={user?.image || "/user.jpeg"} width={40} height={40} alt="" />
              </div>
              <span className="absolute bottom-0 right-0 size-3 bg-c-emerald-400 border-2 border-c-bg-500 rounded-full" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-white text-base leading-tight">{user?.name}</span>
              <span className="text-c-gray-400 text-[8.4px]">{user?.email}</span>
            </div>
          </div>

          {/* Links */}
          <div className="py-1 border-b border-c-gray-700">
            <Link href="/user"                          className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors">Dashboard</Link>
            <Link href="/user/my-rentals/socks5-proxy"  className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors">History</Link>
            <Link href="/user/deposit"                  className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors">Deposit Balance</Link>
            <Link href="/user/socks5-proxy-ips"         className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors">Proxies</Link>
            <Link href="/user/profile"                  className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors">My Profile</Link>
            <Link href={supportLink}                    className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors">Support</Link>
          </div>

          {/* Logout */}
          <div className="py-1">
            <button onClick={handleLogout} className="flex items-center w-full px-5 py-3 hover:bg-c-bg-400 transition-colors group">
              <LucideLogOut className="size-4 mr-3 text-c-gray-400 group-hover:text-white" />
              <span className="text-[13px] font-medium text-c-gray-200">Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserDropdown;