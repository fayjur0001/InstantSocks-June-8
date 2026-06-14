import { apiFetch } from "@/lib/api";



export type BadgeTier = "Basic" | "Bronze" | "Silver" | "Gold" | "Diamond";

export interface DiscountTier {
  id:        number;
  tier:      BadgeTier;
  minSpend:  number;
  maxSpend:  number | null;
  discount:  number;
  sortOrder: number;
}

export interface DiscountUser {
  id:          number;
  userId:      string;
  username:    string;
  totalTopUp:  number;
  totalSpend:  number;
  badge:       BadgeTier;
}

export interface GetTiersResponse {
  success: boolean;
  tiers:   DiscountTier[];
}

export interface UpdateTierPayload {
  maxSpend?: number | null;
  discount:  number;
}

export interface GetDiscountUsersParams {
  page?:     number;
  limit?:    number;
  username?: string;
  badge?:    string;
}

export interface GetDiscountUsersResponse {
  success:   boolean;
  users:     DiscountUser[];
  totalPage: number;
  total:     number;
}



export const discountService = {
  getTiers: () =>
    apiFetch("/api/admin/discount/tiers") as Promise<GetTiersResponse>,

  updateTier: (tier: string, payload: UpdateTierPayload) =>
    apiFetch(`/api/admin/discount/tiers/${tier}`, {
      method: "PATCH",
      body:   JSON.stringify(payload),
    }) as Promise<{ success: boolean; tier: DiscountTier }>,

  getUsers: (params: GetDiscountUsersParams = {}) => {
    const query = new URLSearchParams();
    if (params.page)     query.set("page",     String(params.page));
    if (params.limit)    query.set("limit",    String(params.limit));
    if (params.username) query.set("username", params.username);
    if (params.badge && params.badge !== "all") query.set("badge", params.badge);
    const qs = query.toString();
    return apiFetch(`/api/admin/discount/users${qs ? `?${qs}` : ""}`) as Promise<GetDiscountUsersResponse>;
  },
};