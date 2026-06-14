import { apiFetch } from "@/lib/api";



export type NotificationFilter = "all" | "today" | "week" | "earlier";

export interface Notification {
  id: number;
  userId: number;
  type: string;          
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface GetNotificationsResponse {
  success: boolean;
  data: Notification[];
}

export interface MarkAllReadResponse {
  success: boolean;
}



export const notificationService = {
  


  getNotifications: (filter: NotificationFilter = "all"): Promise<GetNotificationsResponse> =>
    apiFetch(`/api/notifications?filter=${filter}`),

  


  markAllRead: (): Promise<MarkAllReadResponse> =>
    apiFetch("/api/notifications/read", { method: "PATCH" }),

  


  markOneRead: (id: number): Promise<MarkAllReadResponse> =>
    apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" }),
};

export function formatRelativeTime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}