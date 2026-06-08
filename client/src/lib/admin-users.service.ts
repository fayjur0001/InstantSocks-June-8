import { apiFetch } from "@/lib/api";

export interface AdminUserApiItem {
  id: number;
  username: string;
  email: string;
  role: "general" | "support" | "admin" | "super admin";
  lastActivity: string;
  isOnline: boolean;
  banned: boolean;
  bannedTill: string | null;
  // ✅ FIX Bug 2: server থেকে আসা real balance fields
  currentBalance: number;
  totalTopUp: number;
}

export interface GetAdminUsersParams {
  page: number;
  limit: number;
  username?: string;
  email?: string;
  role?: string;
  type?: string;
}

export interface GetAdminUsersResponse {
  success: boolean;
  users: AdminUserApiItem[];
  totalPage: number;
  total?: number;
}

export interface ApiSuccessResponse {
  success: boolean;
  message?: string;
}

const toQueryString = (params: GetAdminUsersParams) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    // Skip empty strings, undefined, and "all" values — let backend return everything
    if (value === undefined || value === "" || value === "all") return;
    query.set(key, String(value));
  });

  return query.toString();
};

export const adminUsersService = {
  getUsers: (params: GetAdminUsersParams) =>
    apiFetch(`/api/admin/users?${toQueryString(params)}`) as Promise<GetAdminUsersResponse>,

  banUser: (id: string, forSevenDays: boolean) =>
    apiFetch(`/api/admin/users/${id}/ban`, {
      method: "PATCH",
      body: JSON.stringify({ id, forSevenDays }),
    }) as Promise<ApiSuccessResponse>,

  unbanUser: (id: string) =>
    apiFetch(`/api/admin/users/${id}/unban`, {
      method: "PATCH",
      body: JSON.stringify({ id }),
    }) as Promise<ApiSuccessResponse>,

  changeRole: (id: string, role: "general" | "support" | "admin") =>
    apiFetch(`/api/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ id, role }),
    }) as Promise<ApiSuccessResponse>,

  changePassword: (id: string, password: string) =>
    apiFetch(`/api/admin/users/${id}/password`, {
      method: "PATCH",
      body: JSON.stringify({ id, password }),
    }) as Promise<ApiSuccessResponse>,

  updateUser: (id: string, username: string, email: string) =>
    apiFetch(`/api/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify({ id, username, email }),
    }) as Promise<ApiSuccessResponse>,

  loginAs: (id: string) =>
    apiFetch("/api/auth/login-as", {
      method: "POST",
      body: JSON.stringify({ id }),
    }) as Promise<ApiSuccessResponse>,
};