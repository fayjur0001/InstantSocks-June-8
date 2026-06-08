"use client";

import { useEffect, useState } from "react";
import { DashboardCardData } from "@/types/user/dashboard";
import { DashboardCard } from "../../cards/DashboardCard";
import { dashboardApi, UserDashboardStats } from "@/lib/dashboard.service";

// ── Skeleton ──────────────────────────────────────────────────────────────
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

// ── Build cards from API data ─────────────────────────────────────────────
function buildCards(stats: UserDashboardStats): DashboardCardData[] {
  return [
    {
      id: "balance",
      type: "metric",
      title: "Current",
      subtitle: "Balance",
      value: `$ ${stats.balance.toFixed(2)}`,
      valueColorClass: "text-c-red-300",
    },
    {
      id: "spend",
      type: "metric",
      title: "Total",
      subtitle: "Spend",
      value: `$ ${stats.totalSpend.toFixed(2)}`,
      valueColorClass: "text-c-red-300",
    },
    {
      id: "pending",
      type: "metric",
      title: "Pending",
      subtitle: "Top UP",
      value: `$ ${stats.pendingTopup.toFixed(2)}`,
      valueColorClass: "text-c-red-300",
    },
    // Discount — backend এ discount system এখনো নেই, static রাখা হয়েছে
    {
      id: "discount",
      type: "metric",
      title: "Current",
      subtitle: "Discount",
      value: "15%",
      valueColorClass: "text-c-green-400",
    },
    // Expiring Soon — backend এ expiry tracking এখনো নেই, static রাখা হয়েছে
    {
      id: "expiring",
      type: "list",
      title: "Service",
      subtitle: "Expiring Soon",
      items: [],
    },
  ];
}

// ── Component ─────────────────────────────────────────────────────────────
function InfoCardsArea() {
  const [cards, setCards] = useState<DashboardCardData[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboardApi
      .getUserStats()
      .then((res) => {
        if (res.success) setCards(buildCards(res.data));
        else setError(true);
      })
      .catch(() => setError(true));
  }, []);

  if (cards === null && !error) {
    return (
      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(210px,1fr))]">
        {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  const displayCards =
    cards ?? buildCards({ balance: 0, totalSpend: 0, pendingTopup: 0 });

  return (
    <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(210px,1fr))]">
      {displayCards.map((card) => (
        <DashboardCard key={card.id} card={card} />
      ))}
    </div>
  );
}

export default InfoCardsArea;