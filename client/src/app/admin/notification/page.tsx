
"use client";

import { useCallback, useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Server, FileText, Settings, Wallet, ShieldCheck, Check, CheckCheck } from "lucide-react";
import {
  notificationService,
  formatRelativeTime,
  type Notification,
  type NotificationFilter,
} from "@/lib/notification.service";
import { useAuth } from "@/context/AuthContext";

const getIcon = (type: string) => {
  const base = "p-1.5 rounded-full bg-c-slate-800/50 border border-c-slate-700";
  switch (type) {
    case "topup_approved": return <div className={base}><Wallet className="w-3.5 h-3.5 text-c-slate-200" /></div>;
    case "proxy_rent":     return <div className={base}><Server className="w-3.5 h-3.5 text-c-slate-200" /></div>;
    case "security":       return <div className={base}><ShieldCheck className="w-3.5 h-3.5 text-yellow-400" /></div>;
    case "system":         return <div className={base}><Settings className="w-3.5 h-3.5 text-c-slate-200" /></div>;
    default:               return <div className={base}><FileText className="w-3.5 h-3.5 text-c-slate-200" /></div>;
  }
};

const NotificationItem = ({ item, onMarkOne }: { item: Notification; onMarkOne: (id: number) => void }) => (
  <div className={`flex items-start gap-2.5 py-2.5 border-b border-c-slate-800/40 last:border-0 transition-colors ${!item.isRead ? "bg-c-slate-800/10" : ""} hover:bg-c-slate-800/20`}>
    <div className="shrink-0 mt-0.5">{getIcon(item.type)}</div>
    <div className="flex-1 space-y-0.5 min-w-0">
      <div className="flex items-center gap-1.5 min-w-0">
        {!item.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-c-green-tw-500 block" />}
        <h4 className={`text-[12px] font-bold truncate ${!item.isRead ? "text-white" : "text-c-slate-200"}`}>
          {item.title}
        </h4>
      </div>
      <p className="text-[11px] text-c-slate-400 leading-snug">{item.message}</p>
      {!item.isRead && (
        <button onClick={() => onMarkOne(item.id)} className="flex items-center gap-1 text-[10px] font-semibold text-c-slate-500 hover:text-c-green-tw-400 transition-colors">
          <Check className="w-2.5 h-2.5" /> Mark as read
        </button>
      )}
    </div>
    <span className="text-[10px] text-c-slate-500 font-medium whitespace-nowrap shrink-0 mt-0.5">
      {formatRelativeTime(item.createdAt)}
    </span>
  </div>
);

const TabPane = ({ filter }: { filter: NotificationFilter }) => {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshNotifications } = useAuth();

  const load = useCallback(() => {
    setLoading(true);
    notificationService.getNotifications(filter)
      .then((res) => setItems(res.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleMarkOne = useCallback(async (id: number) => {
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    try { await notificationService.markOneRead(id); refreshNotifications(); }
    catch { setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: false } : n)); }
  }, [refreshNotifications]);

  const handleMarkAll = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try { await notificationService.markAllRead(); refreshNotifications(); }
    catch { load(); }
  }, [refreshNotifications, load]);

  const unreadCount = items.filter((n) => !n.isRead).length;

  if (loading) return <div className="py-8 text-center text-c-slate-500 text-xs">Loading…</div>;
  if (items.length === 0) return <div className="py-8 text-center text-c-slate-500 text-xs">No notifications found.</div>;

  return (
    <div>
      {unreadCount > 0 && (
        <div className="flex justify-end mb-2">
          <button onClick={handleMarkAll} className="flex items-center gap-1.5 text-[11px] font-semibold text-c-slate-400 hover:text-white border border-c-slate-700 hover:border-c-slate-500 bg-transparent hover:bg-c-slate-800 px-2.5 py-1 rounded-md transition-colors">
            <CheckCheck className="w-3 h-3" /> Mark all as read
          </button>
        </div>
      )}
      <div className="flex flex-col max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
        {items.map((n) => <NotificationItem key={n.id} item={n} onMarkOne={handleMarkOne} />)}
      </div>
    </div>
  );
};

export default function NotificationCentre() {
  return (
    <div className="bg-black p-4 rounded-2xl">
      <div className="mx-auto">
        <h5 className="text-sm font-bold text-white mb-3">Notification Centre</h5>
        <Tabs defaultValue="today" className="w-full">
          <div className="max-w-fit mb-3">
            <TabsList className="flex gap-2 bg-c-slate-900/50 p-1 rounded-[10px] border border-c-slate-800 h-auto">
              {(["today", "thisWeek", "earlier"] as const).map((val) => (
                <TabsTrigger
                  key={val}
                  value={val}
                  className="px-3 py-1 text-xs font-semibold rounded-[8px] transition-all text-c-slate-500 data-[state=active]:bg-c-slate-800 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border-transparent hover:text-c-slate-300 hover:bg-transparent bg-transparent"
                >
                  {val === "today" ? "Today" : val === "thisWeek" ? "This Week" : "Earlier"}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="today" className="mt-0"><TabPane filter="today" /></TabsContent>
          <TabsContent value="thisWeek"><TabPane filter="week" /></TabsContent>
          <TabsContent value="earlier"><TabPane filter="earlier" /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}