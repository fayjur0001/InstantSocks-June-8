"use client";

import { useEffect, useState } from "react";
import { Server, FileText, Settings, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BsBellFill } from "react-icons/bs";
import { useAuth } from "@/context/AuthContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Link from "next/link";
import {
  notificationService,
  formatRelativeTime,
  type Notification,
  type NotificationFilter,
} from "@/lib/notification.service";

type TabLabel = "Today" | "This Week" | "Earlier";

const TAB_FILTER_MAP: Record<TabLabel, NotificationFilter> = {
  Today: "today",
  "This Week": "week",
  Earlier: "earlier",
};

// ─── Icon by notification type ────────────────────────────────────────────────
const NotifIcon = ({ type }: { type: string }) => {
  const baseClass =
    "p-2.5 rounded-full bg-c-slate-800/50 border border-c-slate-700 shadow-sm";
  switch (type) {
    case "topup_approved":
      return (
        <div className={baseClass}>
          <Wallet className="w-5 h-5 text-c-slate-200" />
        </div>
      );
    case "proxy_rent":
      return (
        <div className={baseClass}>
          <Server className="w-5 h-5 text-c-slate-200" />
        </div>
      );
    case "system":
      return (
        <div className={baseClass}>
          <Settings className="w-5 h-5 text-c-slate-200" />
        </div>
      );
    default:
      return (
        <div className={baseClass}>
          <FileText className="w-5 h-5 text-c-slate-200" />
        </div>
      );
  }
};

// ─── Component ────────────────────────────────────────────────────────────────
const NotificationDropdown = () => {
  const [activeTab, setActiveTab] = useState<TabLabel>("Today");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, notificationsCount, refreshNotifications } = useAuth();

  // Fetch whenever tab changes or popover opens
  useEffect(() => {
    if (!open) return;
    const filter = TAB_FILTER_MAP[activeTab];
    setLoading(true);
    notificationService
      .getNotifications(filter)
      .then((res) => setNotifications(res.data ?? []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [activeTab, open]);

  // Pusher real-time subscription — নতুন notification এলে bell badge refresh হবে
  useEffect(() => {
    if (!user) return;
    const PUSHER_KEY     = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!PUSHER_KEY || !PUSHER_CLUSTER) return;

    let pusherClient: any;
    let channel: any;

    (async () => {
      const PusherJS = (await import("pusher-js")).default;
      pusherClient = new PusherJS(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
      channel = pusherClient.subscribe(`user-${user.id}`);
      channel.bind("revalidate", (data: { page: string; action?: string }) => {
        if (data.page === "/notifications" && data.action === "notification") {
          refreshNotifications();
        }
      });
    })();

    return () => {
      channel?.unbind_all();
      pusherClient?.disconnect();
    };
  }, [user, refreshNotifications]);

  // When popover opens, mark all read and refresh count
  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && notificationsCount > 0) {
      notificationService.markAllRead().then(() => refreshNotifications());
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button className="relative cursor-pointer p-2 rounded-[6px] border border-white/10 bg-white/5 hover:bg-white/20 hover:border-white/30 transition duration-200 outline-none">
          <BsBellFill className="w-6 h-6 text-white" />
          {notificationsCount > 0 && (
            <span className="absolute top-3 right-3 block w-2 h-2 rounded-full bg-c-red-500 ring-2 ring-c-bg-750"></span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[343px] sm:w-[510px] lg:w-[529px] p-0 bg-c-bg-750 border border-c-slate-800 rounded-[12px] shadow-2xl z-50 overflow-hidden font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-bold text-white">Notification Centre</h2>
          <Link href="/user/notification">
            <Button
              variant="outline"
              className="h-8 rounded-lg text-xs font-bold text-c-slate-400 border-c-slate-700 bg-transparent hover:bg-c-slate-800 hover:text-white px-4"
            >
              See All
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="px-6 mb-4">
          <div className="flex bg-c-slate-900/50 p-1.5 rounded-[14px] border border-c-slate-800">
            {(["Today", "This Week", "Earlier"] as TabLabel[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-sm font-semibold rounded-[10px] transition-all ${
                  activeTab === tab
                    ? "bg-c-slate-800 text-white shadow-sm"
                    : "text-c-slate-500 hover:text-c-slate-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Notification List */}
        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-10 text-center text-c-slate-500 text-sm">
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center text-c-slate-500 text-sm">
              No notifications.
            </div>
          ) : (
            notifications.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-start gap-4 px-6 py-5 group cursor-pointer hover:bg-c-slate-800/30 transition-colors ${
                  index !== notifications.length - 1
                    ? "border-b border-c-slate-800/50"
                    : ""
                }`}
              >
                <div className="relative">
                  <NotifIcon type={item.type} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {!item.isRead && (
                        <div className="w-2 h-2 rounded-full bg-green" />
                      )}
                      <h4 className="text-[15px] font-bold text-c-slate-100">
                        {item.title}
                      </h4>
                    </div>
                    <span className="text-[13px] font-medium text-c-slate-500">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-[13.5px] leading-relaxed text-c-slate-400 font-medium line-clamp-2">
                    {item.message}
                  </p>
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