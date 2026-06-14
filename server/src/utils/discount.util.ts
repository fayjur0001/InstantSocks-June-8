



import db from "@/db";
import { AddedFundModel, DiscountTierModel } from "@/db/schema";
import { and, eq, sql, asc } from "drizzle-orm";

export type BadgeTier = "Basic" | "Bronze" | "Silver" | "Gold" | "Diamond";

export interface UserBadgeInfo {
  tier: BadgeTier;
  discountPct: number;   
  totalTopUp: number;    
}


async function getTotalTopUp(userId: number, tx?: any): Promise<number> {
  const d = tx || db;
  const rows = await d
    .select({ total: sql<number>`coalesce(sum(${AddedFundModel.amount}), 0)::real` })
    .from(AddedFundModel)
    .where(
      and(
        eq(AddedFundModel.userId, userId),
        eq(AddedFundModel.status, "approved"),
      ),
    );
  return rows[0]?.total ?? 0;
}


async function getTiers(tx?: any) {
  const d = tx || db;
  return d
    .select()
    .from(DiscountTierModel)
    .orderBy(asc(DiscountTierModel.sortOrder));
}


export async function getUserBadge(
  userId: number,
  tx?: any,
): Promise<UserBadgeInfo> {
  const [totalTopUp, tiers] = await Promise.all([
    getTotalTopUp(userId, tx),
    getTiers(tx),
  ]);

  if (tiers.length === 0) {
    
    return { tier: "Basic", discountPct: 0, totalTopUp };
  }

  
  
  
  let matched = tiers[0];
  for (const t of tiers) {
    const aboveMin = totalTopUp >= t.minSpend;
    const belowMax = t.maxSpend === null || totalTopUp <= t.maxSpend;
    if (aboveMin && belowMax) {
      matched = t;
      break;
    }
  }

  return {
    tier: matched.tier as BadgeTier,
    discountPct: matched.discount,
    totalTopUp,
  };
}


export function applyDiscount(price: number, discountPct: number): number {
  if (discountPct <= 0) return price;
  return parseFloat((price * (1 - discountPct / 100)).toFixed(4));
}