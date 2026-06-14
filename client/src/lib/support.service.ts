import { apiFetch } from "@/lib/api";



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
  senderInfo: { agentSerial: number | null; role: string | null; username: string | null } | null;
}

export interface CreateTicketPayload {
  subject: string;
  message: string;
  toUserId?: number;
  category?: string;
}



export const supportApi = {
  
  getMyTickets: (): Promise<{ success: boolean; tickets: Ticket[] }> =>
    apiFetch("/api/support/my-tickets"),

  
  getUnclaimedTickets: (): Promise<{ success: boolean; tickets: Ticket[] }> =>
    apiFetch("/api/support/unclaimed"),

  
  getOtherTickets: (): Promise<{ success: boolean; tickets: Ticket[] }> =>
    apiFetch("/api/support/other-tickets"),

  
  getTicket: (ticketId: number): Promise<{ success: boolean; ticket: Ticket }> =>
    apiFetch(`/api/support/${ticketId}`),

  
  createTicket: (
    payload: CreateTicketPayload
  ): Promise<{ success: boolean; ticketId: number }> =>
    apiFetch("/api/support/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  
  getMessages: (
    ticketId: number
  ): Promise<{ success: boolean; messages: TicketMessage[] }> =>
    apiFetch(`/api/support/${ticketId}/messages`),

  
  sendMessage: (
    ticketId: number,
    message: string
  ): Promise<{ success: boolean }> =>
    apiFetch(`/api/support/${ticketId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  
  closeTicket: (ticketId: number): Promise<{ success: boolean }> =>
    apiFetch(`/api/support/${ticketId}/close`, { method: "PATCH" }),

  
  reopenTicket: (ticketId: number): Promise<{ success: boolean }> =>
    apiFetch(`/api/support/${ticketId}/reopen`, { method: "PATCH" }),

  
  claimTicket: (ticketId: number): Promise<{ success: boolean }> =>
    apiFetch(`/api/support/${ticketId}/claim`, { method: "PATCH" }),

  
  editMessage: (messageId: number, message: string): Promise<{ success: boolean }> =>
    apiFetch(`/api/support/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ message }),
    }),

  
  deleteMessage: (messageId: number): Promise<{ success: boolean }> =>
    apiFetch(`/api/support/messages/${messageId}`, { method: "DELETE" }),

  
  deleteTicket: (ticketId: number): Promise<{ success: boolean }> =>
    apiFetch(`/api/support/${ticketId}`, { method: "DELETE" }),
};