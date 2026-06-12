/**
 * discount.util.ts
 *
 * User-এর approved top-up total দিয়ে badge tier বের করে,
 * এবং সেই tier-এর discount % return করে।
 *
 * Badge কোথাও store হয় না — runtime-এ calculate হয়।
 * Discount apply হয় add-to-cart-এর সময়।
 */

import db from "@/db";
import { AddedFundModel, DiscountTierModel } from "@/db/schema";
import { and, eq, sql, asc } from "drizzle-orm";

export type BadgeTier = "Basic" | "Bronze" | "Silver" | "Gold" | "Diamond";

export interface UserBadgeInfo {
  tier: BadgeTier;
  discountPct: number;   // e.g. 10  (means 10%)
  totalTopUp: number;    // lifetime approved top-up in USD
}

// ─────────────────────────────────────────────────────────────────────────────
// User-এর lifetime approved top-up sum করো
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// DB থেকে tier config আনো (sortOrder অনুযায়ী)
// ─────────────────────────────────────────────────────────────────────────────
async function getTiers(tx?: any) {
  const d = tx || db;
  return d
    .select()
    .from(DiscountTierModel)
    .orderBy(asc(DiscountTierModel.sortOrder));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main — user-এর badge + discount বের করো
// ─────────────────────────────────────────────────────────────────────────────
export async function getUserBadge(
  userId: number,
  tx?: any,
): Promise<UserBadgeInfo> {
  const [totalTopUp, tiers] = await Promise.all([
    getTotalTopUp(userId, tx),
    getTiers(tx),
  ]);

  if (tiers.length === 0) {
    // Seed script চালানো হয়নি — safe fallback: no discount
    return { tier: "Basic", discountPct: 0, totalTopUp };
  }

  // totalTopUp যে tier-এর range-এ পড়ে সেটা খোঁজো
  // Tiers sortOrder অনুযায়ী আছে (Basic → Diamond)
  // শেষ matching tier নাও (Diamond-এ maxSpend null থাকে)
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

// ─────────────────────────────────────────────────────────────────────────────
// Price-এ discount apply করো
// finalPrice = price * (1 - discountPct / 100)
// ─────────────────────────────────────────────────────────────────────────────
export function applyDiscount(price: number, discountPct: number): number {
  if (discountPct <= 0) return price;
  return parseFloat((price * (1 - discountPct / 100)).toFixed(4));
}