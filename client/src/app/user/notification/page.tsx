"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Server, FileText, Settings, Wallet } from "lucide-react";
import {
  notificationService,
  formatRelativeTime,
  type Notification,
  type NotificationFilter,
} from "@/lib/notification.service";

// ─── Icon by type ─────────────────────────────────────────────────────────────
const getIcon = (type: string) => {
  switch (type) {
    case "topup_approved":
      return <Wallet className="h-5 w-5 text-c-slate-300" />;
    case "proxy_rent":
      return <Server className="h-5 w-5 text-c-slate-300" />;
    case "system":
      return <Settings className="h-5 w-5 text-c-slate-300" />;
    default:
      return <FileText className="h-5 w-5 text-c-slate-300" />;
  }
};

// ─── Single row ───────────────────────────────────────────────────────────────
const NotificationItem = ({ item }: { item: Notification }) => (
  <div className="flex items-start gap-4 py-4 border-b border-c-slate-800/50 last:border-0 hover:bg-c-slate-800/30 transition-colors">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-c-slate-800/50 border border-c-slate-700 shadow-sm mt-1">
      {getIcon(item.type)}
    </div>
    <div className="flex-1 space-y-1">
      <div className="flex items-center gap-2">
        {!item.isRead && (
          <span className="h-1.5 w-1.5 rounded-full bg-c-green-tw-500 block" />
        )}
        <h4
          className={`text-sm font-semibold ${
            !item.isRead ? "text-white" : "text-c-slate-200"
          }`}
        >
          {item.title}
        </h4>
      </div>
      <p className="text-sm text-c-slate-400 leading-relaxed">{item.message}</p>
    </div>
    <div className="shrink-0">
      <span className="text-xs text-c-slate-500 font-medium whitespace-nowrap">
        {formatRelativeTime(item.createdAt)}
      </span>
    </div>
  </div>
);

// ─── Tab content ──────────────────────────────────────────────────────────────
const TabPane = ({ filter }: { filter: NotificationFilter }) => {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    notificationService
      .getNotifications(filter)
      .then((res) => setItems(res.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [filter]);

  if (loading) {
    return (
      <div className="py-10 text-center text-c-slate-500 text-sm">Loading…</div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-10 text-center text-c-slate-500 text-sm">
        No notifications found.
      </div>
    );
  }

  return (
    <div className="flex flex-col max-h-[73vh] min-h-[50vh] overflow-y-auto custom-scrollbar pr-3">
      {items.map((n) => (
        <NotificationItem key={n.id} item={n} />
      ))}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NotificationCentre() {
  return (
    <div className="bg-black p-4 rounded-2xl">
      <div className="mx-auto">
        <h5 className="text-xl font-semibold text-white mb-6">
          Notification Centre
        </h5>

        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Tabs defaultValue="all" className="w-full">
              <div className="max-w-fit mb-2">
                <TabsList className="flex flex-wrap gap-4 bg-c-slate-900/50 p-1.5 rounded-[14px] border border-c-slate-800 h-auto w-full justify-between">
                  {(["all", "today", "thisWeek", "earlier"] as const).map(
                    (val) => (
                      <TabsTrigger
                        key={val}
                        value={val}
                        className="flex-1 bg-transparent py-2 text-sm font-semibold rounded-[10px] transition-all text-c-slate-500 data-[state=active]:bg-c-slate-800 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border-transparent hover:text-c-slate-300 hover:bg-transparent"
                      >
                        {val === "all"
                          ? "All"
                          : val === "today"
                          ? "Today"
                          : val === "thisWeek"
                          ? "This Week"
                          : "Earlier"}
                      </TabsTrigger>
                    )
                  )}
                </TabsList>
              </div>

              <TabsContent value="all" className="mt-0">
                <TabPane filter="all" />
              </TabsContent>
              <TabsContent value="today">
                <TabPane filter="today" />
              </TabsContent>
              <TabsContent value="thisWeek">
                <TabPane filter="week" />
              </TabsContent>
              <TabsContent value="earlier">
                <TabPane filter="earlier" />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}