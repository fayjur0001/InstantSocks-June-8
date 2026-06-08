"use client"; // Required if you are using Next.js App Router

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const Nav = () => {
  const pathname = usePathname();

  const navLinks = [
    {
      name: "Proxies",
      href: "/user/socks5-proxy-ips",
    },
    {
      name: "History",
      href: "/user/my-rentals/socks5-proxy",
    },
  ];

  return (
    <nav className="hidden lg:flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-md shadow-xl w-fit">
      {navLinks.map((link) => {
        const isActive =
          pathname === link.href || pathname.startsWith(link.href + "/");

        return (
          <Link key={link.name} href={link.href}>
            <div
              className={`relative flex items-center px-4 py-1 rounded-full text-sm font-semibold tracking-wide transition-all duration-300 ease-out overflow-hidden
              ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                  : "text-gray-400 border border-transparent hover:text-white hover:bg-white/10"
              }`}
            >
              {/* Active State Indicator Dot */}
              {isActive && (
                <span className="w-1.5 h-1.5 mr-2 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              )}
              
              {link.name}
            </div>
          </Link>
        );
      })}
    </nav>
  );
};

export default Nav;