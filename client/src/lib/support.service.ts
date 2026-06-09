import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TicketStatus = "opened" | "closed";

export interface Ticket {
  id: number;
  userId: number;
  agentId: number | null;
  subject: string;
  category: string | null;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  agentInfo?: {
    agentSerial: number | null;
    username: string;
  } | null;
}

export interface TicketMessage {
  id: number;
  ticketId: number;
  userId: number;
  message: string;
  createdAt: string;
  seenByOther: boolean;
  senderInfo: { agentSerial: number | null } | null;
}

export interface CreateTicketPayload {
  subject: string;
  message: string;
  toUserId?: number;
  category?: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const supportApi = {
  // User: get their own tickets
  getMyTickets: (): Promise<{ success: boolean; tickets: Ticket[] }> =>
    apiFetch("/api/support/my-tickets"),

  // Admin: unclaimed tickets (no agent yet)
  getUnclaimedTickets: (): Promise<{ success: boolean; tickets: Ticket[] }> =>
    apiFetch("/api/support/unclaimed"),

  // Admin: tickets claimed by current agent/admin
  getOtherTickets: (): Promise<{ success: boolean; tickets: Ticket[] }> =>
    apiFetch("/api/support/other-tickets"),

  // Get single ticket
  getTicket: (ticketId: number): Promise<{ success: boolean; ticket: Ticket }> =>
    apiFetch(`/api/support/${ticketId}`),

  // Create a ticket
  createTicket: (
    payload: CreateTicketPayload
  ): Promise<{ success: boolean; ticketId: number }> =>
    apiFetch("/api/support/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Get messages for a ticket
  getMessages: (
    ticketId: number
  ): Promise<{ success: boolean; messages: TicketMessage[] }> =>
    apiFetch(`/api/support/${ticketId}/messages`),

  // Send a message
  sendMessage: (
    ticketId: number,
    message: string
  ): Promise<{ success: boolean }> =>
    apiFetch(`/api/support/${ticketId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  // Close a ticket
  closeTicket: (ticketId: number): Promise<{ success: boolean }> =>
    apiFetch(`/api/support/${ticketId}/close`, { method: "PATCH" }),

  // Reopen a ticket
  reopenTicket: (ticketId: number): Promise<{ success: boolean }> =>
    apiFetch(`/api/support/${ticketId}/reopen`, { method: "PATCH" }),

  // Claim a ticket (admin/agent)
  claimTicket: (ticketId: number): Promise<{ success: boolean }> =>
    apiFetch(`/api/support/${ticketId}/claim`, { method: "PATCH" }),

  // Edit a message (owner only)
  editMessage: (messageId: number, message: string): Promise<{ success: boolean }> =>
    apiFetch(`/api/support/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ message }),
    }),

  // Delete a message (owner only)
  deleteMessage: (messageId: number): Promise<{ success: boolean }> =>
    apiFetch(`/api/support/messages/${messageId}`, { method: "DELETE" }),

  // Delete a ticket (admin only — permanent)
  deleteTicket: (ticketId: number): Promise<{ success: boolean }> =>
    apiFetch(`/api/support/${ticketId}`, { method: "DELETE" }),
};