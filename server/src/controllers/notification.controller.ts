import { Request, Response } from "express";
import db from "@/db";
import { NotificationModel } from "@/db/schema";
import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";

const NOTIFICATION_LIMIT = 50;


function getFilterRange(filter: string): { from?: Date; to?: Date } {
  const now = new Date();

  if (filter === "today") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    return { from };
  }

  if (filter === "week") {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(0, 0, 0, 0);
    return { from, to };
  }

  if (filter === "earlier") {
    const to = new Date(now);
    to.setDate(to.getDate() - 7);
    to.setHours(0, 0, 0, 0);
    return { to };
  }

  
  return {};
}


export async function getNotifications(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;
    const filter = (req.query.filter as string) || "all";
    const { from, to } = getFilterRange(filter);

    const conditions = [eq(NotificationModel.userId, userId)];
    if (from) conditions.push(gte(NotificationModel.createdAt, from));
    if (to)   conditions.push(lt(NotificationModel.createdAt, to));

    const notifications = await db
      .select()
      .from(NotificationModel)
      .where(and(...conditions))
      .orderBy(desc(NotificationModel.createdAt))
      .limit(NOTIFICATION_LIMIT);

    res.json({ success: true, data: notifications });
  } catch (e) {
    console.error("GET NOTIFICATIONS ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}


export async function markAllRead(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;

    await db
      .update(NotificationModel)
      .set({ isRead: true })
      .where(
        and(
          eq(NotificationModel.userId, userId),
          eq(NotificationModel.isRead, false),
        )
      );

    res.json({ success: true });
  } catch (e) {
    console.error("MARK ALL READ ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}


export async function markOneRead(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }

    await db
      .update(NotificationModel)
      .set({ isRead: true })
      .where(
        and(
          eq(NotificationModel.id, id),
          eq(NotificationModel.userId, userId),
          eq(NotificationModel.isRead, false),
        )
      );

    res.json({ success: true });
  } catch (e) {
    console.error("MARK ONE READ ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}


export async function createNotification({
  userId,
  type,
  title,
  message,
}: {
  userId: number;
  type:    string;
  title:   string;
  message: string;
}) {
  try {
    await db.insert(NotificationModel).values({ userId, type, title, message });

    
    const count = await db
      .select({ total: sql<number>`count(*)` })
      .from(NotificationModel)
      .where(eq(NotificationModel.userId, userId))
      .then((r) => Number(r[0]?.total ?? 0));

    if (count > NOTIFICATION_LIMIT) {
      
      const excess = count - NOTIFICATION_LIMIT;
      const oldest = await db
        .select({ id: NotificationModel.id })
        .from(NotificationModel)
        .where(eq(NotificationModel.userId, userId))
        .orderBy(asc(NotificationModel.createdAt))
        .limit(excess);

      if (oldest.length > 0) {
        const ids = oldest.map((r) => r.id);
        await db
          .delete(NotificationModel)
          .where(inArray(NotificationModel.id, ids));
      }
    }
  } catch (e) {
    console.error("CREATE NOTIFICATION ERROR:", e);
  }
}