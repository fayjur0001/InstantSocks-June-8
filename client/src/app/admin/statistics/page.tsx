"use client";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TransactionsTabContent from "@/components/admin/pages/statistics/TransactionsTabContent";
import ProxyTabContent from "@/components/admin/pages/statistics/ProxyTabContent";
import { cn } from "@/lib/utils";
import { dashboardApi, AdminDashboardStats } from "@/lib/dashboard.service";

function TopCardSkeleton() {
  return (
    <div className="bg-c-bg-750 border border-c-slate-800 rounded-xl p-6 flex flex-col justify-center space-y-2 shadow-sm animate-pulse">
      <div className="h-4 w-28 bg-zinc-800 rounded" />
      <div className="h-7 w-36 bg-zinc-800 rounded" />
    </div>
  );
}

export default function MainDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getAdminStats()
      .then((res) => { if (res.success) setStats(res.data); })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  const tabTriggerClass =
    "text-16-semibold-inter px-5 py-2.5 rounded-lg bg-black text-c-slate-300 data-[state=active]:bg-c-green-500 hover:bg-c-emerald-600 hover:text-white data-[state=active]:text-white data-[state=active]:shadow-[0_0_10px_rgba(15,164,111,0.3)] border border-transparent data-[state=active]:border-c-emerald-400/50 transition-all";

  const topCards = [
    {
      title: "Total Turnover",
      value: statsLoading ? null : `$ ${(stats?.totalRevenue ?? 0).toFixed(2)}`,
      color: "text-c-orange-500",
    },
    {
      title: "NSocks Balance",
      value: statsLoading ? null : `$ ${(stats?.nsocksBalance ?? 0).toFixed(2)}`,
      color: "text-c-orange-500",
    },
    {
      title: "Total Sales",
      value: statsLoading ? null : `$ ${(stats?.proxyBalance ?? 0).toFixed(2)}`,
      color: "text-c-orange-500",
    },
  ];

  return (
    <div className="w-full space-y-6 p-3 lg:p-6 rounded-[12px] bg-c-bg-900 text-c-slate-200">
      {/* Top Statistics Grid */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
        {topCards.map((card, idx) =>
          card.value === null ? (
            <TopCardSkeleton key={idx} />
          ) : (
            <div
              key={idx}
              className="bg-c-bg-750 border border-c-slate-800 rounded-xl p-6 flex flex-col justify-center space-y-2 shadow-sm"
            >
              <h3 className="text-sm font-medium text-c-slate-400">{card.title}</h3>
              <p className={`text-2xl font-semibold tracking-tight ${card.color}`}>
                {card.value}
              </p>
            </div>
          )
        )}
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="transactions" className="w-full mt-8">
        <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-2.5 lg:gap-4 justify-start border-none mb-6">
          <TabsTrigger value="transactions" className={tabTriggerClass}>
            Transactions
          </TabsTrigger>
          <TabsTrigger value="proxy" className={tabTriggerClass}>
            Proxy
          </TabsTrigger>
          <TabsTrigger
            value="api"
            className={cn(tabTriggerClass, "cursor-not-allowed pointer-events-none")}
          >
            Api
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-0 outline-none space-y-6">
          <TransactionsTabContent />
        </TabsContent>

        <TabsContent value="proxy" className="mt-0 outline-none space-y-6">
          <ProxyTabContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}