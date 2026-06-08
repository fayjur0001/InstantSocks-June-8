// PATH: client/src/components/user/headerNav/AdminUserDropdown.tsx

"use client";

import useDropdown from "@/hooks/useDropdown";
import { ChevronUp, LucideLogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface AdminUserDropdownProps {
  user: {
    name?: string;
    email?: string;
    image?: string;
    role?: string;
  };
  handleLogout: () => void;
}

const AdminUserDropdown = ({ user, handleLogout }: AdminUserDropdownProps) => {
  const { dropdownOpen, setDropdownOpen, dropdownRef } = useDropdown();
  const { user: authUser } = useAuth();
  const supportLink = authUser?.role === "support" ? "/admin/support" : "/user/support";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Icon and Name/Role */}
      <div
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center border border-white/10 bg-white/5 p-1 rounded-[8px] gap-2 cursor-pointer transition duration-200 hover:bg-c-bg-400"
      >
        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-brand-500">
          <Image src={`${user?.image}`} width={32} height={32} alt="" />
        </div>

        {/* User Name and Role */}
        <div className="flex-col leading-tight hidden lg:flex">
          <span className="text-[14px] text-white">{user?.name}</span>
          <span className="text-[12px] text-c-gray-400">{user?.role ?? "Basic User"}</span>
        </div>

        {/* Chevron Icon */}
        <ChevronUp
          className={`w-5 text-c-gray-400 transition-transform ${
            dropdownOpen ? "rotate-0" : "rotate-180"
          }`}
        />
      </div>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-c-bg-500 text-c-gray-300 shadow-2xl rounded-lg z-50 overflow-hidden border border-c-gray-700">
          {/* User Header Section */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-c-gray-700">
            <div className="relative">
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <Image src={`${user?.image}`} width={40} height={40} alt="" />
              </div>
              <span className="absolute bottom-0 right-0 size-3 bg-c-emerald-400 border-2 border-c-bg-500 rounded-full"></span>
            </div>

            <div className="flex flex-col">
              <span className="font-bold text-white text-base leading-tight">
                {user?.name}
              </span>
              <span className="text-c-gray-400 text-[8.4px]">{user?.email}</span>
            </div>
          </div>

          {/* Section 1 */}
          <div className="py-1 border-b border-c-gray-700">
            <Link
              href="/user"
              className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/user/my-rentals/socks5-proxy"
              className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors"
            >
              History
            </Link>
            <Link
              href="/user/deposit"
              className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors"
            >
              Deposit Balance
            </Link>
            <Link
              href="/user/socks5-proxy-ips"
              className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors"
            >
              Proxies
            </Link>
            <Link
              href="/user/profile"
              className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors"
            >
              My Profile
            </Link>
            <Link
              href={supportLink}
              className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors"
            >
              Support
            </Link>
          </div>

          {/* Logout Section */}
          <div className="py-1">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-5 py-3 hover:bg-c-bg-400 transition-colors group"
            >
              <LucideLogOut className="size-4 mr-3 text-c-gray-400 group-hover:text-white" />
              <span className="text-[13px] font-medium text-c-gray-200">
                Log out
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserDropdown;