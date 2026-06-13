import { Request, Response } from "express";
import db from "@/db";
import { AddedFundModel, DiscountTierModel, UserModel } from "@/db/schema";
import { asc, and, eq, inArray, ne, sql, ilike } from "drizzle-orm";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/discount/tiers
// ─────────────────────────────────────────────────────────────────────────────
export async function getDiscountTiers(req: Request, res: Response) {
  try {
    const tiers = await db
      .select()
      .from(DiscountTierModel)
      .orderBy(asc(DiscountTierModel.sortOrder));

    return res.json({ success: true, tiers });
  } catch (err) {
    console.error("[getDiscountTiers]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/discount/tiers/:tier
// ─────────────────────────────────────────────────────────────────────────────
export async function updateDiscountTier(req: Request, res: Response) {
  try {
    const tierName = z.string().min(1).parse(req.params.tier);

    const { maxSpend, discount } = z
      .object({
        maxSpend: z.number().positive().nullable().optional(),
        discount: z.number().min(0).max(100),
      })
      .parse(req.body);

    const existing = await db.query.DiscountTierModel.findFirst({
      where: (m, { eq }) => eq(m.tier, tierName),
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Tier not found." });
    }

    const isDiamond  = tierName === "Diamond";
    const newMaxSpend = isDiamond ? null : (maxSpend ?? existing.maxSpend);

    if (!isDiamond && newMaxSpend !== null && newMaxSpend <= existing.minSpend) {
      return res.status(400).json({
        success: false,
        message: `Max spend ($${newMaxSpend}) must be greater than min spend ($${existing.minSpend}).`,
      });
    }

    const [updated] = await db
      .update(DiscountTierModel)
      .set({ maxSpend: newMaxSpend, discount, updatedAt: new Date() })
      .where(eq(DiscountTierModel.tier, tierName))
      .returning();

    // Next tier-এর minSpend cascade করো
    if (!isDiamond && newMaxSpend !== null) {
      const allTiers = await db
        .select()
        .from(DiscountTierModel)
        .orderBy(asc(DiscountTierModel.sortOrder));

      const currentIdx = allTiers.findIndex((t) => t.tier === tierName);
      const nextTier   = allTiers[currentIdx + 1];

      if (nextTier) {
        const newNextMin = newMaxSpend + 1;
        if (nextTier.maxSpend === null || newNextMin < nextTier.maxSpend) {
          await db
            .update(DiscountTierModel)
            .set({ minSpend: newNextMin, updatedAt: new Date() })
            .where(eq(DiscountTierModel.tier, nextTier.tier));
        }
      }
    }

    return res.json({ success: true, tier: updated });
  } catch (err) {
    console.error("[updateDiscountTier]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/discount/users
// ─────────────────────────────────────────────────────────────────────────────
export async function getDiscountUsers(req: Request, res: Response) {
  try {
    const { page, limit, username, badge } = z
      .object({
        page:     z.coerce.number().int().min(1).catch(1),
        limit:    z.coerce.number().int().min(1).max(100).catch(10),
        username: z.string().optional(),
        badge:    z.string().optional(),
      })
      .parse(req.query);

    const offset = (page - 1) * limit;

    // ── Step 1: Users আনো ────────────────────────────────────────────────────
    const allUsers = await db
      .select({
        id:       UserModel.id,
        username: UserModel.username,
      })
      .from(UserModel)
      .where(
        and(
          ne(UserModel.role, "super admin"),
          username ? ilike(UserModel.username, `%${username}%`) : undefined,
        ),
      );

    if (allUsers.length === 0) {
      return res.json({ success: true, users: [], totalPage: 1, total: 0 });
    }

    const userIds = allUsers.map((u) => u.id);

    // ── Step 2: Bulk topUp sum ────────────────────────────────────────────────
    const topUpRows = await db
      .select({
        userId: AddedFundModel.userId,
        total:  sql<number>`coalesce(sum(${AddedFundModel.amount}), 0)::real`,
      })
      .from(AddedFundModel)
      .where(
        and(
          inArray(AddedFundModel.userId, userIds),
          eq(AddedFundModel.status, "approved"),
        ),
      )
      .groupBy(AddedFundModel.userId);

    const topUpMap = new Map<number, number>(
      topUpRows.map((r) => [r.userId, r.total]),
    );

    // ── Step 2b: Bulk totalSpend sum (সব purchase table মিলিয়ে) ─────────────
    // Rejected status গুলো বাদ — বাকি সব count করা হয়
    const spendRows = await db.execute<{ user_id: number; total: number }>(
      sql`
        SELECT user_id, coalesce(sum(price), 0)::real AS total
        FROM (
          SELECT user_id, price FROM socks5_proxy_transactions
          UNION ALL
          SELECT user_id, price FROM rented_proxies
          UNION ALL
          SELECT user_id, price FROM device_transactions
          UNION ALL
          SELECT user_id, price FROM one_time_rents    WHERE status <> 'Rejected'
          UNION ALL
          SELECT user_id, price FROM long_term_rents   WHERE status <> 'Rejected'
          UNION ALL
          SELECT user_id, price FROM sms_pva_one_time_rents WHERE status <> 'Rejected'
          UNION ALL
          SELECT user_id, price FROM sms_pva_long_term_rents WHERE status <> 'Rejected'
        ) AS all_purchases
        WHERE user_id = ANY(${sql.raw(`ARRAY[${userIds.join(",")}]::int[]`)})
        GROUP BY user_id
      `
    );

    const spendMap = new Map<number, number>(
      spendRows.rows.map((r) => [r.user_id, r.total]),
    );

    // ── Step 3: Tier config আনো ───────────────────────────────────────────────
    const tiers = await db
      .select()
      .from(DiscountTierModel)
      .orderBy(asc(DiscountTierModel.sortOrder));

    // ── Step 4: Badge calculate ───────────────────────────────────────────────
    function calcBadge(totalTopUp: number): string {
      if (tiers.length === 0) return "Basic";
      let matched = tiers[0];
      for (const t of tiers) {
        if (totalTopUp >= t.minSpend && (t.maxSpend === null || totalTopUp <= t.maxSpend)) {
          matched = t;
          break;
        }
      }
      return matched.tier;
    }

    // ── Step 5: Enrich + badge filter ────────────────────────────────────────
    const enriched = allUsers
      .map((u) => {
        const totalTopUp = topUpMap.get(u.id) ?? 0;
        const totalSpend = spendMap.get(u.id) ?? 0;
        return {
          id:         u.id,
          userId:     `#${u.id}`,
          username:   u.username,
          totalTopUp,
          totalSpend,
          badge:      calcBadge(totalTopUp),
        };
      })
      .filter((u) => !badge || badge === "all" || u.badge === badge);

    // ── Step 6: Pagination ────────────────────────────────────────────────────
    const total     = enriched.length;
    const paginated = enriched.slice(offset, offset + limit);
    const totalPage = Math.max(1, Math.ceil(total / limit));

    return res.json({ success: true, users: paginated, totalPage, total });
  } catch (err) {
    console.error("[getDiscountUsers]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}