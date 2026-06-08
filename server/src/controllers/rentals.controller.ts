import { Request, Response } from "express";
import db from "@/db";
import { LongTermRentsModel, OneTimeRentModel, UserModel } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

// ─────────────────────────────────────────────
// GET /api/rentals/numbers
// Current user এর সব LTR + OTR rentals
// ─────────────────────────────────────────────
export async function getMyNumberRentals(req: Request, res: Response) {
  try {
    const payload = req.payload!;
    const { page, limit, type } = z.object({
      page:  z.coerce.number().int().min(1).catch(1),
      limit: z.coerce.number().int().min(1).max(100).catch(20),
      type:  z.enum(["ltr", "otr", "all"]).catch("all"),
    }).parse(req.query);

    const offset = (page - 1) * limit;

    // FIX: in-memory pagination সরানো হয়েছে।
    // LTR + OTR আলাদা type হওয়ায় একটাই DB query তে merge+sort+paginate সম্ভব না।
    // তাই count query আলাদা করে total বের করা হচ্ছে, তারপর প্রতিটা থেকে
    // প্রয়োজনীয় rows টেনে JS এ final sort+slice — কিন্তু এখন শুধু
    // (offset + limit) rows পর্যন্ত টানা হচ্ছে, সব নয়।
    const [ltrRentals, otrRentals, ltrCount, otrCount] = await Promise.all([
      type !== "otr"
        ? db.query.LongTermRentsModel.findMany({
            where: (m, { eq }) => eq(m.userId, payload.id),
            orderBy: [desc(LongTermRentsModel.createdAt)],
            limit: offset + limit,
          })
        : [],
      type !== "ltr"
        ? db.query.OneTimeRentModel.findMany({
            where: (m, { eq }) => eq(m.userId, payload.id),
            orderBy: [desc(OneTimeRentModel.createdAt)],
            limit: offset + limit,
          })
        : [],
      type !== "otr"
        ? db.select({ c: sql<number>`count(*)::int` })
            .from(LongTermRentsModel)
            .where(eq(LongTermRentsModel.userId, payload.id))
            .then((r) => r.at(0)?.c ?? 0)
        : 0,
      type !== "ltr"
        ? db.select({ c: sql<number>`count(*)::int` })
            .from(OneTimeRentModel)
            .where(eq(OneTimeRentModel.userId, payload.id))
            .then((r) => r.at(0)?.c ?? 0)
        : 0,
    ]);

    const merged = [
      ...(ltrRentals as typeof ltrRentals).map((r) => ({ ...r, rentKind: "ltr" as const })),
      ...(otrRentals as typeof otrRentals).map((r) => ({ ...r, rentKind: "otr" as const })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = (ltrCount as number) + (otrCount as number);
    const paginated = merged.slice(offset, offset + limit);

    res.json({
      success: true,
      rentals: paginated,
      total,
      totalPage: Math.ceil(total / limit),
    });
  } catch {
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────
// GET /api/admin/rentals/numbers
// Admin — সব users এর LTR + OTR rentals
// ─────────────────────────────────────────────
export async function getAllNumberRentals(req: Request, res: Response) {
  try {
    const { page, limit, type, userId } = z.object({
      page:   z.coerce.number().int().min(1).catch(1),
      limit:  z.coerce.number().int().min(1).max(100).catch(20),
      type:   z.enum(["ltr", "otr", "all"]).catch("all"),
      userId: z.coerce.number().int().positive().optional(),
    }).parse(req.query);

    const offset = (page - 1) * limit;

    // FIX: in-memory pagination সরানো হয়েছে — count query আলাদা করে total বের করা।
    const [ltrRentals, otrRentals, ltrCount, otrCount] = await Promise.all([
      type !== "otr"
        ? db.query.LongTermRentsModel.findMany({
            where: userId ? (m, { eq }) => eq(m.userId, userId) : undefined,
            orderBy: [desc(LongTermRentsModel.createdAt)],
            limit: offset + limit,
          })
        : [],
      type !== "ltr"
        ? db.query.OneTimeRentModel.findMany({
            where: userId ? (m, { eq }) => eq(m.userId, userId) : undefined,
            orderBy: [desc(OneTimeRentModel.createdAt)],
            limit: offset + limit,
          })
        : [],
      type !== "otr"
        ? db.select({ c: sql<number>`count(*)::int` })
            .from(LongTermRentsModel)
            .where(userId ? eq(LongTermRentsModel.userId, userId) : undefined)
            .then((r) => r.at(0)?.c ?? 0)
        : 0,
      type !== "ltr"
        ? db.select({ c: sql<number>`count(*)::int` })
            .from(OneTimeRentModel)
            .where(userId ? eq(OneTimeRentModel.userId, userId) : undefined)
            .then((r) => r.at(0)?.c ?? 0)
        : 0,
    ]);

    const userIds = [...new Set([
      ...(ltrRentals as typeof ltrRentals).map((r) => r.userId),
      ...(otrRentals as typeof otrRentals).map((r) => r.userId),
    ])];

    const users = userIds.length
      ? await db.query.UserModel.findMany({
          where: (m, { inArray }) => inArray(m.id, userIds),
          columns: { id: true, username: true, email: true },
        })
      : [];

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const merged = [
      ...(ltrRentals as typeof ltrRentals).map((r) => ({
        ...r,
        rentKind: "ltr" as const,
        user: userMap[r.userId] || null,
      })),
      ...(otrRentals as typeof otrRentals).map((r) => ({
        ...r,
        rentKind: "otr" as const,
        user: userMap[r.userId] || null,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = (ltrCount as number) + (otrCount as number);
    const paginated = merged.slice(offset, offset + limit);

    res.json({
      success: true,
      rentals: paginated,
      total,
      totalPage: Math.ceil(total / limit),
    });
  } catch {
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}