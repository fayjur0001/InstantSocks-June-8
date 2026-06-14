
"use client";

import { useEffect, useState, useCallback } from "react";
import { Server, FileText, Settings, Wallet, ShieldCheck, Check } from "lucide-react";
import { BsBellFill } from "react-icons/bs";
import { useAuth } from "@/context/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Link from "next/link";
import {
  notificationService,
  formatRelativeTime,
  type Notification,
} from "@/lib/notification.service";

const NotifIcon = ({ type }: { type: string }) => {
  const base = "p-1 rounded-full bg-c-slate-800/60 border border-c-slate-700";
  switch (type) {
    case "topup_approved": return <div className={base}><Wallet className="w-3 h-3 text-c-slate-200" /></div>;
    case "proxy_rent":     return <div className={base}><Server className="w-3 h-3 text-c-slate-200" /></div>;
    case "security":       return <div className={base}><ShieldCheck className="w-3 h-3 text-yellow-400" /></div>;
    case "system":         return <div className={base}><Settings className="w-3 h-3 text-c-slate-200" /></div>;
    default:               return <div className={base}><FileText className="w-3 h-3 text-c-slate-200" /></div>;
  }
};

const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, notificationsCount, refreshNotifications } = useAuth();

  const fetchLatest = useCallback(() => {
    setLoading(true);
    notificationService
      .getNotifications("all", 10)
      .then((res) => setNotifications(res.data ?? []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (open) fetchLatest();
  }, [open, fetchLatest]);

  useEffect(() => {
    if (!user) return;
    const KEY     = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!KEY || !CLUSTER) return;
    let pusherClient: any, channel: any;
    (async () => {
      const PusherJS = (await import("pusher-js")).default;
      pusherClient = new PusherJS(KEY, { cluster: CLUSTER });
      channel = pusherClient.subscribe(`user-${user.id}`);
      channel.bind("revalidate", (data: { page: string; action?: string }) => {
        if (data.page === "/notifications" && data.action === "notification") refreshNotifications();
      });
    })();
    return () => { channel?.unbind_all(); pusherClient?.disconnect(); };
  }, [user, refreshNotifications]);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) refreshNotifications();
  };

  const handleMarkOne = useCallback(async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    try {
      await notificationService.markOneRead(id);
      refreshNotifications();
    } catch {
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: false } : n));
    }
  }, [refreshNotifications]);

  const handleMarkAll = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await notificationService.markAllRead();
      refreshNotifications();
    } catch {}
  }, [refreshNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button className="relative cursor-pointer p-1.5 rounded-[6px] border border-white/10 bg-white/5 hover:bg-white/20 hover:border-white/30 transition duration-200 outline-none">
          <BsBellFill className="w-4 h-4 text-white" />
          {notificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] flex items-center justify-center rounded-full bg-c-red-500 ring-2 ring-black text-[8px] font-bold text-white leading-none px-1">
              {notificationsCount > 99 ? "99+" : notificationsCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[340px] sm:w-[400px] p-0 bg-c-bg-750 border border-c-slate-800 rounded-[10px] shadow-2xl z-50 overflow-hidden font-sans"
      >
        {}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-c-slate-800/60">
          <h2 className="text-xs font-bold text-white tracking-wide">Notification Centre</h2>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="h-6 rounded-md text-[10px] font-semibold text-c-slate-400 border border-c-slate-700 bg-transparent hover:bg-c-slate-800 hover:text-white px-2 transition-colors"
              >
                Mark all read
              </button>
            )}
            <Link href="/user/notification">
              <button className="h-6 rounded-md text-[10px] font-semibold text-c-slate-400 border border-c-slate-700 bg-transparent hover:bg-c-slate-800 hover:text-white px-2 transition-colors">
                See All
              </button>
            </Link>
          </div>
        </div>

        {}
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-5 text-center text-c-slate-500 text-[11px]">Loading…</div>
          ) : notifications.length === 0 ? (
            <div className="py-5 text-center text-c-slate-500 text-[11px]">No notifications.</div>
          ) : (
            notifications.map((item, i) => (
              <div
                key={item.id}
                className={`flex items-start gap-2 px-3 py-2 transition-colors ${!item.isRead ? "bg-c-slate-800/20" : ""} hover:bg-c-slate-800/30 ${i !== notifications.length - 1 ? "border-b border-c-slate-800/40" : ""}`}
              >
                <div className="shrink-0 mt-0.5"><NotifIcon type={item.type} /></div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      {!item.isRead && <div className="w-1 h-1 shrink-0 rounded-full bg-c-green-tw-500" />}
                      <span className={`text-[12px] font-bold truncate ${!item.isRead ? "text-white" : "text-c-slate-200"}`}>
                        {item.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-c-slate-500 shrink-0">{formatRelativeTime(item.createdAt)}</span>
                  </div>
                  <p className="text-[11px] leading-snug text-c-slate-400 line-clamp-2">{item.message}</p>
                  {!item.isRead && (
                    <button
                      onClick={(e) => handleMarkOne(e, item.id)}
                      className="flex items-center gap-1 text-[10px] font-semibold text-c-slate-500 hover:text-c-green-tw-400 transition-colors"
                    >
                      <Check className="w-2.5 h-2.5" /> Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationDropdown;