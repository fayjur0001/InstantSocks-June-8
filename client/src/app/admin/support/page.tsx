"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { ReusableTable } from "@/components/tables/ReusableTable";
import CreateTicketModal from "@/components/modals/CreateTicketModal";
import Link from "next/link";
import { supportApi, Ticket } from "@/lib/support.service";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

// --- Types ---

interface SupportTicketRow {
  id: string;
  ticketId: string;
  category: "Billing" | "Technical";
  subject: string;
  status: "In Progress" | "Completed" | "Open";
  tab: "unclaimed" | "mine" | "other";
  agentInfo: { agentSerial: number | null; username: string } | null;
}

function toUiStatus(ticket: Ticket): "In Progress" | "Completed" | "Open" {
  if (ticket.status === "closed") return "Completed";
  if (ticket.agentId) return "In Progress";
  return "Open";
}

function toUiCategory(ticket: Ticket): "Billing" | "Technical" {
  // category field থাকলে use করো, না থাকলে subject থেকে guess করো
  const sub = ticket.subject?.toLowerCase() ?? "";
  if (
    sub.includes("bill") ||
    sub.includes("payment") ||
    sub.includes("subscription") ||
    sub.includes("invoice") ||
    sub.includes("charge")
  ) {
    return "Billing";
  }
  return "Technical";
}

export default function AdminSupportPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"unclaimed" | "mine" | "other">("unclaimed");
  const [page, setPage] = useState(1);
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);

  // --- Status & Category Styles ---
  const statusStyles = {
    "In Progress": "bg-c-orange-900/30 text-c-orange-400 border-c-orange-800/50",
    Completed: "bg-c-green-tw-900/30 text-c-green-tw-400 border-c-green-tw-800/50",
    Open: "bg-c-blue-900/30 text-c-blue-400 border-c-blue-800/50",
  };

  const categoryStyles = {
    Billing: "bg-c-cyan-900/30 text-c-cyan-400 border-none px-4",
    Technical: "bg-c-orange-900/30 text-c-orange-400 border-none px-4",
  };

  // --- Fetch Tickets ---
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      let rawTickets: Ticket[] = [];
      if (activeTab === "unclaimed") {
        const res = await supportApi.getUnclaimedTickets();
        if (res.success) rawTickets = res.tickets;
      } else if (activeTab === "mine") {
        const res = await supportApi.getMyTickets();
        if (res.success) rawTickets = res.tickets;
      } else {
        const res = await supportApi.getOtherTickets();
        if (res.success) rawTickets = res.tickets;
      }
      setTickets(
        rawTickets.map((t: Ticket) => ({
          id: String(t.id),
          ticketId: `TCK-${String(t.id).padStart(5, "0")}`,
          category: toUiCategory(t),
          subject: t.subject,
          status: toUiStatus(t),
          tab: activeTab,
          agentInfo: (t as any).agentInfo ?? null,
        }))
      );
      setPage(1);
    } catch {
      toast.error("Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // --- Pusher real-time revalidation ---
  useEffect(() => {
    if (!user) return;
    const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!PUSHER_KEY || !PUSHER_CLUSTER) return;

    let pusher: any;
    let channels: any[] = [];

    (async () => {
      const PusherClient = (await import("pusher-js")).default;
      pusher = new PusherClient(PUSHER_KEY, { cluster: PUSHER_CLUSTER });

      const revalidatePages = [
        "/support/my-tickets",
        "/support/unclaimed-tickets",
        "/support/other-tickets",
      ];

      const bind = (channelName: string) => {
        const ch = pusher.subscribe(channelName);
        ch.bind("revalidate", (data: { page: string }) => {
          if (revalidatePages.includes(data.page)) fetchTickets();
        });
        channels.push(ch);
      };

      bind(`user-${user.id}`);
      bind("staff");
      bind("admin");
    })();

    return () => {
      channels.forEach((ch) => ch.unbind_all());
      pusher?.disconnect();
    };
  }, [user, fetchTickets]);

  // --- Delete handler ---
  const handleDelete = async (ticketId: string) => {
    if (!confirm("Are you sure you want to close this ticket?")) return;
    try {
      await supportApi.closeTicket(Number(ticketId));
      toast.success("Ticket closed successfully.");
      fetchTickets();
    } catch {
      toast.error("Failed to close ticket.");
    }
  };

  // --- Table Configuration ---
  const ticketColumns: ColumnDef<SupportTicketRow>[] = [
    {
      accessorKey: "ticketId",
      header: "Ticket ID",
      cell: ({ row }) => (
        <span className="text-c-slate-300 font-medium text-sm">
          {row.original.ticketId}
        </span>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge
          className={`rounded-full py-0.5 font-medium shadow-none ${
            categoryStyles[row.original.category]
          }`}
        >
          {row.original.category}
        </Badge>
      ),
    },
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => (
        <span className="text-c-slate-300 text-sm">{row.original.subject}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const { agentInfo } = row.original;
        const agentLabel = agentInfo?.agentSerial !== undefined && agentInfo?.agentSerial !== null
          ? `AGT-${String(agentInfo.agentSerial).padStart(3, "0")}`
          : null;
        return (
          <div className="flex flex-col gap-1">
            <Badge
              variant="outline"
              className={`rounded-full px-4 py-0.5 border font-medium shadow-none w-fit ${
                statusStyles[row.original.status]
              }`}
            >
              {row.original.status}
            </Badge>
            {agentLabel && (
              <span className="text-[11px] text-c-slate-500 ml-1">{agentLabel}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Link href={`/admin/support/${row.original.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 border-c-slate-700 bg-transparent text-c-slate-300 hover:bg-c-slate-800 hover:text-white"
            >
              <Eye className="w-4 h-4" />
              View
            </Button>
          </Link>
          <Button
            variant="outline"
            size="icon"
            title="Close Ticket"
            className="h-8 w-8 border-c-slate-700 bg-transparent text-c-red-400 hover:bg-red-950 hover:text-c-red-300 hover:border-c-red-900"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const paginated = tickets.slice((page - 1) * 5, page * 5);

  const tabs: { key: "unclaimed" | "mine" | "other"; label: string }[] = [
    { key: "unclaimed", label: "Unclaimed" },
    { key: "mine", label: "My Tickets" },
    { key: "other", label: "All Tickets" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4 p-4 bg-black rounded-2xl">
        {/* Header inside the card */}
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <h3 className="font-bold text-white/90">Support Tickets</h3>
            <p className="text-sm text-c-slate-400">
              Manage and track your support requests
            </p>
          </div>
          <Button onClick={() => setIsCreateTicketOpen(true)}>
            <Plus className="w-4 h-4" />
            Create New Ticket
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-c-slate-800 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-c-slate-800 text-white"
                  : "text-c-slate-400 hover:text-c-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Inner Table Container */}
        <div className="space-y-4">
          <h4 className="font-bold text-white/90 text-sm ml-1">
            {tabs.find((t) => t.key === activeTab)?.label ?? "Tickets"}
          </h4>
          <div className="rounded-xl overflow-hidden border border-c-slate-800">
            {loading ? (
              <div className="py-12 text-center text-c-slate-400 text-sm">
                Loading tickets...
              </div>
            ) : (
              <ReusableTable
                columns={ticketColumns}
                data={paginated}
                currentPage={page}
                setCurrentPage={setPage}
                itemsPerPage={5}
                totalItems={tickets.length}
              />
            )}
          </div>
        </div>

        {/* Create Ticket Modal */}
        <CreateTicketModal
          isCreateTicketOpen={isCreateTicketOpen}
          setIsCreateTicketOpen={setIsCreateTicketOpen}
          onCreated={fetchTickets}
        />
      </div>
    </div>
  );
}