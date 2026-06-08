"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { ReusableTable } from "@/components/tables/ReusableTable";
import CreateTicketModal from "@/components/modals/CreateTicketModal";
import Link from "next/link";
import { supportApi, Ticket } from "@/lib/support.service";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface SupportTicketRow {
  id: string;
  ticketId: string;
  subject: string;
  status: "In Progress" | "Completed" | "Open";
}

function toUiStatus(ticket: Ticket): "In Progress" | "Completed" | "Open" {
  if (ticket.status === "closed") return "Completed";
  if (ticket.agentId) return "In Progress";
  return "Open";
}

export default function UserSupportPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [loading, setLoading] = useState(false);

  const statusStyles = {
    "In Progress": "bg-c-orange-900/30 text-c-orange-400 border-c-orange-800/50",
    Completed: "bg-c-green-tw-900/30 text-c-green-tw-400 border-c-green-tw-800/50",
    Open: "bg-c-blue-900/30 text-c-blue-400 border-c-blue-800/50",
  };

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await supportApi.getMyTickets();
      if (res.success) {
        setTickets(
          res.tickets.map((t: Ticket) => ({
            id: String(t.id),
            ticketId: `TCK-${String(t.id).padStart(5, "0")}`,
            subject: t.subject,
            status: toUiStatus(t),
          }))
        );
      }
    } catch {
      toast.error("Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Pusher real-time revalidation — agent reply বা ticket status change হলে list refresh
  useEffect(() => {
    if (!user) return;
    const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!PUSHER_KEY || !PUSHER_CLUSTER) return;

    let pusher: any;
    let channel: any;

    (async () => {
      const PusherClient = (await import("pusher-js")).default;
      pusher = new PusherClient(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
      channel = pusher.subscribe(`user-${user.id}`);
      channel.bind("revalidate", (data: { page: string }) => {
        if (data.page === "/support/my-tickets") fetchTickets();
      });
    })();

    return () => {
      channel?.unbind_all();
      pusher?.disconnect();
    };
  }, [user, fetchTickets]);

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
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => (
        <span className="text-c-slate-300 text-sm">{row.original.subject}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={`rounded-full px-4 py-0.5 border font-medium shadow-none ${
            statusStyles[row.original.status]
          }`}
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Link href={`/user/support/${row.original.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 border-c-slate-700 bg-transparent text-c-slate-300 hover:bg-c-slate-800 hover:text-white"
            >
              <Eye className="w-4 h-4" />
              View
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const paginated = tickets.slice((page - 1) * 5, page * 5);

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

        {/* Inner Table Container */}
        <div className="space-y-4">
          <h4 className="font-bold text-white/90 text-sm ml-1">All Tickets</h4>
          <div className="rounded-xl overflow-hidden border border-c-slate-800">
            {loading ? (
              <div className="py-12 text-center text-c-slate-400 text-sm">Loading tickets...</div>
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