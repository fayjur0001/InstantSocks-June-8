"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Paperclip, CheckCheck, Pencil, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supportApi, Ticket, TicketMessage } from "@/lib/support.service";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function AdminSupportChatPage() {
  const { id } = useParams<{ id: string }>();
  const ticketId = Number(id);
  const { user } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [ticketRes, msgsRes] = await Promise.all([
        supportApi.getTicket(ticketId),
        supportApi.getMessages(ticketId),
      ]);
      if (ticketRes.success) setTicket(ticketRes.ticket);
      if (msgsRes.success) setMessages(msgsRes.messages);
    } catch {
      toast.error("Failed to load ticket.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  
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

      const bind = (channelName: string) => {
        const ch = pusher.subscribe(channelName);
        ch.bind("revalidate", (data: { page: string }) => {
          if (data.page === `/support/${ticketId}`) fetchData();
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
  }, [user, ticketId, fetchData]);

  const handleSend = async () => {
    const trimmed = messageInput.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setMessageInput("");
    
    const tempId = Date.now();
    const optimisticMsg: TicketMessage = {
      id: tempId,
      ticketId,
      userId: user!.id,
      message: trimmed,
      createdAt: new Date().toISOString(),
      seenByOther: false,
      senderInfo: null,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    try {
      await supportApi.sendMessage(ticketId, trimmed);
      fetchData();
    } catch {
      toast.error("Failed to send message.");
      setMessageInput(trimmed);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleClose = async () => {
    
    setTicket((prev) => prev ? { ...prev, status: "closed" } : prev);
    try {
      await supportApi.closeTicket(ticketId);
      toast.success("Ticket closed.");
      fetchData();
    } catch {
      toast.error("Failed to close ticket.");
      fetchData(); 
    }
  };

  const handleReopen = async () => {
    
    setTicket((prev) => prev ? { ...prev, status: "opened" } : prev);
    try {
      await supportApi.reopenTicket(ticketId);
      toast.success("Ticket reopened.");
      fetchData();
    } catch {
      toast.error("Failed to reopen ticket.");
      fetchData(); 
    }
  };

  const handleClaim = async () => {
    
    setTicket((prev) => prev ? { ...prev, agentId: user!.id } : prev);
    try {
      await supportApi.claimTicket(ticketId);
      toast.success("Ticket claimed!");
      fetchData();
    } catch {
      toast.error("Failed to claim ticket.");
      fetchData(); 
    }
  };

  const handleEditStart = (msg: TicketMessage) => {
    setEditingId(msg.id);
    setEditingText(msg.message);
  };

  const handleEditSave = async (messageId: number) => {
    const trimmed = editingText.trim();
    if (!trimmed) return;
    const prevMessages = messages;
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, message: trimmed } : m));
    setEditingId(null);
    setEditingText("");
    try {
      await supportApi.editMessage(messageId, trimmed);
    } catch {
      toast.error("Failed to edit message.");
      setMessages(prevMessages);
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingText("");
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!confirm("Delete this message?")) return;
    const prevMessages = messages;
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    try {
      await supportApi.deleteMessage(messageId);
    } catch {
      toast.error("Failed to delete message.");
      setMessages(prevMessages);
    }
  };

  const statusLabel = ticket?.status === "closed" ? "Completed" : ticket?.agentId ? "In Progress" : "Open";
  const statusStyle =
    ticket?.status === "closed"
      ? "bg-c-green-tw-900/30 text-c-green-tw-400 hover:bg-c-green-tw-900/40 border-c-green-tw-800/50"
      : ticket?.agentId
      ? "bg-c-orange-900/30 text-c-orange-400 hover:bg-c-orange-900/40 border-c-orange-800/50"
      : "bg-c-blue-900/30 text-c-blue-400 hover:bg-c-blue-900/40 border-c-blue-800/50";

  const ticketLabel = `TCK-${String(ticketId).padStart(5, "0")}`;

  const agentSerial = ticket?.agentInfo?.agentSerial;
  const agentLabel =
    agentSerial !== undefined && agentSerial !== null
      ? `AGT-${String(agentSerial).padStart(3, "0")}`
      : "Support Agent";

  if (loading) {
    return (
      <div className="relative overflow-hidden gap-0 bg-black rounded-[12px] h-full flex items-center justify-center">
        <p className="text-c-slate-400 text-sm">Loading ticket...</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden gap-0 bg-black rounded-[12px] h-full">
      {}
      <div className="p-8 pb-6 relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-white">{ticketLabel}</h3>
            <p className="text-sm text-c-slate-400">{ticket?.subject}</p>
          </div>
          <div className="flex gap-2">
            {ticket?.status === "opened" && !ticket?.agentId && (
              <Button
                size="sm"
                variant="outline"
                className="border-c-slate-700 bg-transparent text-c-blue-400 hover:bg-c-slate-800"
                onClick={handleClaim}
              >
                Claim
              </Button>
            )}
            {ticket?.status === "closed" && (
              <Button
                size="sm"
                variant="outline"
                className="border-c-slate-700 bg-transparent text-c-blue-400 hover:bg-c-slate-800"
                onClick={handleReopen}
              >
                Reopen
              </Button>
            )}
            {ticket?.status === "opened" && (
              <Button
                size="sm"
                variant="outline"
                className="border-c-slate-700 bg-transparent text-c-red-400 hover:bg-red-950"
                onClick={handleClose}
              >
                Close Ticket
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Badge className={`border px-4 py-1 rounded-full text-xs font-medium shadow-none ${statusStyle}`}>
            {statusLabel}
          </Badge>
          {ticket?.agentId && (
            <Badge className="border px-4 py-1 rounded-full text-xs font-medium shadow-none bg-c-cyan-900/30 text-c-cyan-400 border-c-cyan-800/50">
              {agentLabel}
            </Badge>
          )}
        </div>
      </div>

      {}
      <div className="px-8 py-4 h-[370px] sm:h-[420px] lg:h-[450px] mb-[72px] lg:mb-[97px] overflow-y-auto space-y-6 flex flex-col">
        {messages.length === 0 && (
          <p className="text-c-slate-500 text-sm text-center mt-8">No messages yet.</p>
        )}
        {messages.map((msg) => {
          const isOwn = String(msg.userId) === String(user?.id);
          const isStaffMsg = msg.senderInfo !== null && msg.senderInfo !== undefined;
          const senderLabel = isStaffMsg
            ? (msg.senderInfo!.role === "super admin"
                ? "Superadmin"
                : msg.senderInfo!.username ?? "Support Agent")
            : "User";
          const isEditing = editingId === msg.id;

          return (
            <div key={msg.id} className={`${isOwn ? "self-end" : "self-start"} max-w-[70%] space-y-2`}>
              {isOwn && (
                <div className="flex flex-wrap items-center justify-end gap-1.5 text-[11px] text-c-slate-500 mr-1">
                  <button
                    className="flex items-center gap-1 hover:text-c-slate-300 transition-colors"
                    onClick={() => handleEditStart(msg)}
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <span>•</span>
                  <button
                    className="flex items-center gap-1 hover:text-c-red-400 transition-colors"
                    onClick={() => handleDeleteMessage(msg.id)}
                  >
                    <Trash className="w-3 h-3" /> Delete
                  </button>
                </div>
              )}
              {!isOwn && (
                <div className="text-[11px] text-c-slate-500 ml-1 mb-1">{senderLabel}</div>
              )}

              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <Input
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEditSave(msg.id);
                      if (e.key === "Escape") handleEditCancel();
                    }}
                    className="h-10 border-c-slate-700 bg-c-slate-800 text-c-slate-200 text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-c-slate-700 bg-transparent text-c-slate-300"
                      onClick={handleEditCancel}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleEditSave(msg.id)}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isOwn
                      ? "bg-green text-white rounded-tr-none"
                      : "bg-c-slate-800 text-c-slate-300 rounded-tl-none"
                  }`}
                >
                  {msg.message}
                </div>
              )}

              <div
                className={`flex flex-wrap items-center gap-1.5 text-[11px] text-c-slate-500 ${
                  isOwn ? "justify-end mr-1" : "justify-start ml-1"
                }`}
              >
                <span>{formatDate(msg.createdAt)}</span>
                <span>•</span>
                <span>{formatTime(msg.createdAt)}</span>
                {isOwn && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <CheckCheck className={`w-3.5 h-3.5 ${msg.seenByOther ? "text-c-blue-400" : ""}`} />
                      {msg.seenByOther ? "Read" : "Sent"}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {}
      <div className="p-3 lg:p-6 flex gap-3 items-center absolute bottom-0 left-0 w-full bg-c-bg-900/90 backdrop-blur-sm border-t border-c-slate-800">
        <div className="relative flex-1">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-c-slate-500 cursor-pointer hover:text-c-slate-300">
            <Paperclip className="w-5 h-5 rotate-45" />
          </div>
          <Input
            placeholder="Type your message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={ticket?.status === "closed" || sending}
            className="h-12 pl-12 pr-4 border-c-slate-800 bg-transparent rounded-lg focus-visible:ring-c-purple text-sm text-c-slate-200 placeholder:text-c-slate-500"
          />
        </div>
        <Button
          className="h-12 px-8"
          onClick={handleSend}
          disabled={ticket?.status === "closed" || sending || !messageInput.trim()}
        >
          {sending ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  );
}