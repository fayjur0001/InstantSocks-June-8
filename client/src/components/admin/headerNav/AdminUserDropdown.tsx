// "use client";

// import useDropdown from "@/hooks/useDropdown";
// import { ChevronUp, LucideLogOut } from "lucide-react";
// import Image from "next/image";
// import Link from "next/link";

// interface AdminUserDropdownProps {
//   user: {
//     name?: string;
//     email?: string;
//     image?: string;
//   };
//   handleLogout: () => void;
// }

// const AdminUserDropdown = ({ user, handleLogout }: AdminUserDropdownProps) => {
//   const { dropdownOpen, setDropdownOpen, dropdownRef } = useDropdown();

//   return (
//     <div className="relative" ref={dropdownRef}>
//       {/* User Icon and Name/Role */}
//       <div
//         onClick={() => setDropdownOpen((prev) => !prev)}
//         className="flex items-center border border-white/10 bg-white/5 p-1 rounded-[8px] gap-2 cursor-pointer transition duration-200 hover:bg-c-bg-400"
//       >
//         {/* User Avatar */}
//         <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-brand-500">
//           <Image src={`${user?.image}`} width={32} height={32} alt="" />
//         </div>

//         {/* User Name and Role */}
//         <div className="flex-col leading-tight hidden lg:flex">
//           <span className="text-[14px] text-white">{user?.name}</span>
//           <span className="text-[12px] text-c-gray-400">Basic User</span>
//         </div>

//         {/* Chevron Icon */}
//         <ChevronUp
//           className={`w-5 text-c-gray-400 transition-transform ${
//             dropdownOpen ? "rotate-0" : "rotate-180"
//           }`}
//         />
//       </div>

//       {/* Dropdown Menu */}
//       {dropdownOpen && (
//         <div className="absolute right-0 mt-2 w-64 bg-c-bg-500 text-c-gray-300 shadow-2xl rounded-lg z-50 overflow-hidden border border-c-gray-700">
//           {/* User Header Section */}
//           <div className="flex items-center gap-3 px-4 py-4 border-b border-c-gray-700">
//             <div className="relative">
//               <div className="w-10 h-10 rounded-full overflow-hidden">
//                 <Image src={`${user?.image}`} width={40} height={40} alt="" />
//               </div>
//               <span className="absolute bottom-0 right-0 size-3 bg-c-emerald-400 border-2 border-c-bg-500 rounded-full"></span>
//             </div>

//             <div className="flex flex-col">
//               <span className="font-bold text-white text-base leading-tight">
//                 {user?.name}
//               </span>
//               <span className="text-c-gray-400 text-sm">{user?.email}</span>
//             </div>
//           </div>
//           <div className="max-h-[50vh] overflow-auto custom-scrollbar">
//             {/* Section 1 */}
//             <div className="py-1 border-b border-c-gray-700">
//               <Link
//                 href="/admin"
//                 className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors"
//               >
//                 Dashboard
//               </Link>
//               <Link
//                 href="/admin/my-rentals/socks5-proxy"
//                 className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors"
//               >
//                 History
//               </Link>
//               <Link
//                 href="/admin/deposit"
//                 className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors"
//               >
//                 Deposit Balance
//               </Link>
//               <Link
//                 href="/admin/socks5-proxy-ips"
//                 className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors"
//               >
//                 Proxies
//               </Link>
//             </div>
//             {/* Section 2 */}
//             <div className="py-1 border-b border-c-gray-700">
//               <Link
//                 href="/admin/statistics"
//                 className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors"
//               >
//                 Statistics
//               </Link>
//               <Link
//                 href="/admin/products-api"
//                 className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors"
//               >
//                 Proxy Api
//               </Link>
//             </div>

//             {/* Section 3 */}
//             <div className="py-1 border-b border-c-gray-700">
//               <Link
//                 href="/admin/payment-api"
//                 className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors"
//               >
//                 Payments API
//               </Link>
//               <Link
//                 href="/admin/transactions"
//                 className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors"
//               >
//                 All Transactions
//               </Link>
//               <Link
//                 href="/admin/sale-history/socks5-proxy"
//                 className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors"
//               >
//                 Sales History
//               </Link>
//             </div>

//             {/* Section 4 */}
//             <div className="py-1 border-b border-c-gray-700">
//               <Link
//                 href="/admin/users"
//                 className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors"
//               >
//                 All Users
//               </Link>
//               <Link
//                 href="/admin/settings"
//                 className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors"
//               >
//                 General Settings
//               </Link>
//             </div>

//             {/* Section 5 */}
//             <div className="py-1 border-b border-c-gray-700">
//               <Link
//                 href="/admin/profile"
//                 className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors"
//               >
//                 My Profile
//               </Link>
//               <Link
//                 href="/admin/support"
//                 className="block px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors"
//               >
//                 Support
//               </Link>
//             </div>
//           </div>

//           {/* Logout Section */}
//           <div className="py-1">
//             <button
//               onClick={handleLogout}
//               className="flex items-center w-full px-5 py-3 hover:bg-c-bg-400 transition-colors group"
//             >
//               <LucideLogOut className="size-4 mr-3 text-c-gray-400 group-hover:text-white" />
//               <span className="text-[13px] font-medium text-c-gray-200">
//                 Log out
//               </span>
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default AdminUserDropdown;



"use client";

import useDropdown from "@/hooks/useDropdown";
import {
  ChevronUp,
  LucideLogOut,
  LayoutDashboard,
  History,
  Wallet,
  Server,
  BarChart3,
  Code2,
  CreditCard,
  Receipt,
  ShoppingCart,
  Users,
  Settings,
  User,
  LifeBuoy
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface AdminUserDropdownProps {
  user: {
    name?: string;
    email?: string;
    image?: string;
    role?: string; // Added optional role
  };
  handleLogout: () => void;
}

// Grouping links into a config array cleans up the JSX and makes it highly scalable
const MENU_GROUPS = [
  {
    label: "User Area",
    items: [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { name: "History", href: "/admin/my-rentals/socks5-proxy", icon: History },
      { name: "Deposit Balance", href: "/admin/deposit", icon: Wallet },
      { name: "Proxies", href: "/admin/socks5-proxy-ips", icon: Server },
    ],
  },
  {
    label: "Administration",
    items: [
      { name: "Statistics", href: "/admin/statistics", icon: BarChart3 },
      { name: "All Transactions", href: "/admin/transactions", icon: Receipt },
      { name: "Sales History", href: "/admin/sale-history/socks5-proxy", icon: ShoppingCart },
      { name: "All Users", href: "/admin/users", icon: Users },
    ],
  },
  {
    label: "System",
    items: [
      { name: "Proxy API", href: "/admin/products-api", icon: Code2 },
      { name: "Payments API", href: "/admin/payment-api", icon: CreditCard },
      { name: "General Settings", href: "/admin/settings", icon: Settings },
    ],
  },
  {
    label: "Account",
    items: [
      { name: "My Profile", href: "/admin/profile", icon: User },
      { name: "Support", href: "/admin/support", icon: LifeBuoy },
    ],
  },
];

const AdminUserDropdown = ({ user, handleLogout }: AdminUserDropdownProps) => {
  const { dropdownOpen, setDropdownOpen, dropdownRef } = useDropdown();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Trigger - Changed to button for semantic HTML and keyboard accessibility */}
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center w-full border border-white/10 bg-white/5 p-1 rounded-[8px] gap-2 cursor-pointer transition duration-200 hover:bg-c-bg-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-brand-500 shrink-0">
          <Image src={user?.image || "/default-avatar.png"} width={32} height={32} alt="Avatar" />
        </div>

        {/* User Name and Role */}
        <div className="flex-col leading-tight hidden lg:flex text-left">
          <span className="text-[14px] text-white font-medium truncate max-w-[120px]">
            {user?.name}
          </span>
          <span className="text-[12px] text-c-gray-400">
            {user?.role || "Administrator"}
          </span>
        </div>

        {/* Chevron Icon */}
        <ChevronUp
          className={`w-5 text-c-gray-400 transition-transform duration-300 ml-1 ${
            dropdownOpen ? "rotate-0" : "rotate-180"
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-c-bg-500 text-c-gray-300 shadow-2xl rounded-lg z-50 overflow-hidden border border-c-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* User Header Section */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-c-gray-700 bg-black/20">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <Image src={user?.image || "/default-avatar.png"} width={40} height={40} alt="Avatar" />
              </div>
              <span className="absolute bottom-0 right-0 size-3 bg-c-emerald-400 border-2 border-c-bg-500 rounded-full"></span>
            </div>

            <div className="flex flex-col min-w-0">
              <span className="font-bold text-white text-base leading-tight truncate">
                {user?.name}
              </span>
              <span className="text-c-gray-400 text-sm truncate">{user?.email}</span>
            </div>
          </div>

          {/* Links Section */}
          <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
            {MENU_GROUPS.map((group, index) => (
              <div key={index} className="py-2 border-b border-c-gray-700 last:border-b-0">
                {/* Section Label */}
                <span className="block px-5 mb-1 text-[11px] font-bold text-c-gray-500 uppercase tracking-wider">
                  {group.label}
                </span>
                
                {/* Section Items */}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex items-center px-5 py-2 hover:bg-c-bg-400 text-[13px] font-medium transition-colors group"
                    >
                      <Icon className="size-4 mr-3 text-c-gray-400 group-hover:text-white transition-colors" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Logout Section */}
          <div className="py-1 border-t border-c-gray-700 bg-black/10">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-5 py-3 hover:bg-red-500/10 transition-colors group"
            >
              <LucideLogOut className="size-4 mr-3 text-red-400 group-hover:text-red-500" />
              <span className="text-[13px] font-medium text-red-400 group-hover:text-red-500">
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