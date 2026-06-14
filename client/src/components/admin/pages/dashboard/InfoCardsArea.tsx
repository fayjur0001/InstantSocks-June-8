"use client";

import { useEffect, useState } from "react";
import { DashboardCardData } from "@/types/admin/dashboard";
import { DashboardCard } from "../../cards/DashboardCard";
import { dashboardApi, AdminDashboardStats } from "@/lib/dashboard.service";


function CardSkeleton() {
  return (
    <div className="border-none bg-black shadow-md flex flex-col justify-between p-3 rounded-[16px] animate-pulse min-h-[120px]">
      <div className="pb-2 space-y-2">
        <div className="h-4 w-20 bg-zinc-800 rounded" />
        <div className="h-6 w-28 bg-zinc-800 rounded" />
      </div>
      <div className="flex justify-end">
        <div className="h-8 w-24 bg-zinc-800 rounded" />
      </div>
    </div>
  );
}


function buildCards(stats: AdminDashboardStats): DashboardCardData[] {
  return [
    {
      id: "totalUsers",
      type: "metric",
      title: "Total",
      subtitle: "Users",
      value: String(stats.totalUsers),
      valueColorClass: "text-c-red-300",
    },
    {
      id: "onlineUsers",
      type: "metric",
      title: "Online",
      subtitle: "Users",
      value: String(stats.onlineUsers),
      valueColorClass: "text-c-green-400",
    },
    {
      id: "bannedUsers",
      type: "metric",
      title: "Banned",
      subtitle: "Users",
      value: String(stats.bannedUsers),
      valueColorClass: "text-c-red-300",
    },
    {
      id: "pendingTopup",
      type: "metric",
      title: "Pending",
      subtitle: "Top UP",
      value: String(stats.pendingTopupCount),
      valueColorClass: "text-c-red-300",
    },
    {
      id: "revenue",
      type: "metric",
      title: "Total",
      subtitle: "Revenue",
      value: `$ ${stats.totalRevenue.toFixed(2)}`,
      valueColorClass: "text-c-green-400",
    },
    {
      id: "socks5",
      type: "metric",
      title: "Socks5",
      subtitle: "Rentals",
      value: String(stats.activeSocks5Rentals),
      valueColorClass: "text-c-red-300",
    },
  ];
}


function InfoCardsArea() {
  const [cards, setCards] = useState<DashboardCardData[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboardApi
      .getAdminStats()
      .then((res) => {
        if (res.success) setCards(buildCards(res.data));
        else setError(true);
      })
      .catch(() => setError(true));
  }, []);

  if (cards === null && !error) {
    return (
      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(210px,1fr))]">
        {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  const displayCards =
    cards ??
    buildCards({
      totalUsers: 0, onlineUsers: 0, bannedUsers: 0,
      pendingTopupCount: 0, totalRevenue: 0, activeSocks5Rentals: 0,
    });

  return (
    <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(210px,1fr))]">
      {displayCards.map((card) => (
        <DashboardCard key={card.id} card={card} />
      ))}
    </div>
  );
}

export default InfoCardsArea;