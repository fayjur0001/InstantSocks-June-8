/**
 * dashboard.service.ts
 * Module J — Dashboard & Statistics এর সব API call এখানে।
 */

import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserDashboardStats {
  balance:      number;
  totalSpend:   number;
  pendingTopup: number;
}

export interface AdminDashboardStats {
  totalUsers:          number;
  onlineUsers:         number;
  bannedUsers:         number;
  pendingTopupCount:   number;
  totalRevenue:        number;
  activeSocks5Rentals: number;
  proxyBalance:        number;
  nsocksBalance:       number;
}

export interface ChartDataPoint {
  date:          string;
  turnover:      number;
  deposit:       number;
  value:         number;
  name?:         string;   // Top Users tab এ username
  proxyLocation?: string;  // Proxy tab tooltip এ
}

export interface SummaryBox {
  label:      string;
  value:      string | number;
  subValue?:  string;
  highlight?: boolean;
}

export interface StatisticsData {
  chartData:    ChartDataPoint[];
  summaryBoxes: SummaryBox[];
}

export interface TopUsersData {
  chartData: ChartDataPoint[];
}

export type StatTab           = "proxy" | "transactions";
export type StatPeriod        = "7d" | "1m" | "3m";
export type StatSummaryPeriod = "today" | "3days" | "weekly" | "monthly";

// ─── Proxy Transaction ────────────────────────────────────────────────────────

export interface ProxyTransaction {
  id:       number;
  ip:       string;
  country:  string;
  state:    string;
  city:     string;
  zip:      string;
  port:     string;
  type:     string;
  note:     string;
  price:    number;
  bought:   string;
  username: string;
}

export interface ProxyTransactionsResponse {
  transactions: ProxyTransaction[];
  total:        number;
  page:         number;
  totalPages:   number;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  /** GET /api/dashboard/stats — user নিজের balance/spend/pending */
  getUserStats: (): Promise<{ success: boolean; data: UserDashboardStats }> =>
    apiFetch("/api/dashboard/stats"),

  /** GET /api/admin/dashboard — admin platform stats */
  getAdminStats: (): Promise<{ success: boolean; data: AdminDashboardStats }> =>
    apiFetch("/api/admin/dashboard"),

  /**
   * GET /api/admin/statistics
   * Chart data (period দিয়ে) + summary boxes (summaryPeriod দিয়ে) একসাথে আনে।
   */
  getStatistics: (
    tab:           StatTab,
    period:        StatPeriod,
    summaryPeriod: StatSummaryPeriod,
  ): Promise<{ success: boolean; data: StatisticsData }> =>
    apiFetch(
      `/api/admin/statistics?tab=${tab}&period=${period}&summaryPeriod=${summaryPeriod}`,
    ),

  /**
   * GET /api/admin/statistics/top-users
   * "Top Users" chart tab এর জন্য username-annotated chart data।
   */
  getTopUsers: (
    tab:    StatTab,
    period: StatPeriod,
  ): Promise<{ success: boolean; data: TopUsersData }> =>
    apiFetch(
      `/api/admin/statistics/top-users?tab=${tab}&period=${period}`,
    ),

  /**
   * GET /api/admin/statistics/summary
   * শুধু summary boxes — period dropdown change হলে শুধু এই call হবে।
   */
  getSummaryBoxes: (
    tab:           StatTab,
    summaryPeriod: StatSummaryPeriod,
  ): Promise<{ success: boolean; data: { summaryBoxes: SummaryBox[] } }> =>
    apiFetch(
      `/api/admin/statistics/summary?tab=${tab}&summaryPeriod=${summaryPeriod}`,
    ),
  /**
   * GET /api/admin/statistics/proxy-transactions
   * Paginated list of all Socks5 proxy transactions (admin).
   */
  getProxyTransactions: (
    page:   number,
    limit:  number,
    search: string,
  ): Promise<{ success: boolean; data: ProxyTransactionsResponse }> =>
    apiFetch(
      `/api/admin/statistics/proxy-transactions?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
    ),
};