import { Request, Response } from "express";
import db from "@/db";
import {
  UserModel,
  AddedFundModel,
  OneTimeRentModel,
  LongTermRentsModel,
  DeviceTransactionModel,
  RentedProxyModel,
  Socks5ProxyTransactionModel,
  SMSPVAOneTimeRentModel,
  SMSPVALongTermRentModel,
} from "@/db/schema";
import UnloggingError from "@/utils/unlogging-error";
import pusher from "@/utils/pusher";
import { and, asc, desc, eq, gte, inArray, ne, notInArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";

export async function getUsers(req: Request, res: Response) {
  try {
    const { page, limit, username, email, role, type } = z.object({
      page: z.coerce.number().int().min(1).catch(1),
      limit: z.coerce.number().int().min(1).catch(20),
      username: z.string().optional(),
      email: z.string().optional(),
      role: z.string().catch("all role"),
      type: z.string().catch("all"),
    }).parse(req.query);

    const offset = (page - 1) * limit;
    const userId = req.payload!.id;

    const query = db.select({
      id: UserModel.id,
      username: UserModel.username,
      email: UserModel.email,
      role: UserModel.role,
      lastActivity: UserModel.updatedAt,
      isOnline: UserModel.isOnline,
      
      
      banned: UserModel.banned,
      bannedTill: UserModel.bannedTill,
    }).from(UserModel).where(and(
      ne(UserModel.role, "super admin"),
      ne(UserModel.id, userId),
      username ? sql`${UserModel.username} ~* ${username}` : undefined,
      email ? sql`${UserModel.email} ~* ${email}` : undefined,
      role === "all role" ? undefined : eq(UserModel.role, role as any),
      type === "online" ? eq(UserModel.isOnline, true) :
      type === "suspended" ? sql`${UserModel.bannedTill} > now()` :
      type === "banned" ? eq(UserModel.banned, true) : undefined,
    )).as("query");

    const [users, total] = await Promise.all([
      db.select().from(query).offset(offset).limit(limit).orderBy(desc(query.isOnline), desc(query.id), asc(query.username)),
      db.select({ total: sql<number>`count(*)::int` }).from(query).then((r) => r.at(0)?.total || 0),
    ]);

    
    
    
    const pageUserIds = users.map((u) => u.id);

    if (pageUserIds.length === 0) {
      return res.json({ success: true, users: [], totalPage: Math.ceil(total / limit) });
    }

    
    const topUpRows = await db
      .select({
        userId: AddedFundModel.userId,
        total: sql<number>`coalesce(sum(${AddedFundModel.amount}), 0)::real`,
      })
      .from(AddedFundModel)
      .where(and(
        inArray(AddedFundModel.userId, pageUserIds),
        eq(AddedFundModel.status, "approved"),
      ))
      .groupBy(AddedFundModel.userId);

    
    
    const spendingQueries = await Promise.all([
      db.select({ userId: OneTimeRentModel.userId, total: sql<number>`coalesce(sum(${OneTimeRentModel.price}), 0)::real` })
        .from(OneTimeRentModel)
        .where(and(inArray(OneTimeRentModel.userId, pageUserIds), inArray(OneTimeRentModel.status, ["Awaiting MDN", "Completed", "Reserved"])))
        .groupBy(OneTimeRentModel.userId),

      db.select({ userId: LongTermRentsModel.userId, total: sql<number>`coalesce(sum(${LongTermRentsModel.price}), 0)::real` })
        .from(LongTermRentsModel)
        .where(and(inArray(LongTermRentsModel.userId, pageUserIds), inArray(LongTermRentsModel.status, ["Reserved", "Active", "Awaiting MDN", "Expired", "Completed"])))
        .groupBy(LongTermRentsModel.userId),

      db.select({ userId: DeviceTransactionModel.userId, total: sql<number>`coalesce(sum(${DeviceTransactionModel.price}), 0)::real` })
        .from(DeviceTransactionModel)
        .where(inArray(DeviceTransactionModel.userId, pageUserIds))
        .groupBy(DeviceTransactionModel.userId),

      db.select({ userId: RentedProxyModel.userId, total: sql<number>`coalesce(sum(${RentedProxyModel.price}), 0)::real` })
        .from(RentedProxyModel)
        .where(inArray(RentedProxyModel.userId, pageUserIds))
        .groupBy(RentedProxyModel.userId),

      db.select({ userId: Socks5ProxyTransactionModel.userId, total: sql<number>`coalesce(sum(${Socks5ProxyTransactionModel.price}), 0)::real` })
        .from(Socks5ProxyTransactionModel)
        .where(inArray(Socks5ProxyTransactionModel.userId, pageUserIds))
        .groupBy(Socks5ProxyTransactionModel.userId),

      db.select({ userId: SMSPVAOneTimeRentModel.userId, total: sql<number>`coalesce(sum(${SMSPVAOneTimeRentModel.price}), 0)::real` })
        .from(SMSPVAOneTimeRentModel)
        .where(and(inArray(SMSPVAOneTimeRentModel.userId, pageUserIds), inArray(SMSPVAOneTimeRentModel.status, ["Awaiting MDN", "Completed", "Reserved"])))
        .groupBy(SMSPVAOneTimeRentModel.userId),

      db.select({ userId: SMSPVALongTermRentModel.userId, total: sql<number>`coalesce(sum(${SMSPVALongTermRentModel.price}), 0)::real` })
        .from(SMSPVALongTermRentModel)
        .where(and(inArray(SMSPVALongTermRentModel.userId, pageUserIds), inArray(SMSPVALongTermRentModel.status, ["Reserved", "Active", "Awaiting MDN", "Expired", "Completed"])))
        .groupBy(SMSPVALongTermRentModel.userId),
    ]);

    
    const topUpMap = new Map(topUpRows.map((r) => [r.userId, r.total]));

    
    const spendingMap = new Map<number, number>();
    for (const tableRows of spendingQueries) {
      for (const row of tableRows) {
        spendingMap.set(row.userId, (spendingMap.get(row.userId) ?? 0) + row.total);
      }
    }

    
    const usersWithBalance = users.map((u) => {
      const topUp = topUpMap.get(u.id) ?? 0;
      const spent = spendingMap.get(u.id) ?? 0;
      return {
        ...u,
        totalTopUp: topUp,
        currentBalance: topUp - spent,
      };
    });

    res.json({ success: true, users: usersWithBalance, totalPage: Math.ceil(total / limit) });
  } catch (e) {
    console.error("GET USERS ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

export async function banUser(req: Request, res: Response) {
  try {
    
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const { forSevenDays } = z.object({
      forSevenDays: z.coerce.boolean().default(false),
    }).parse(req.body);

    
    const target = await db.query.UserModel.findFirst({
      where: (m, { eq }) => eq(m.id, id),
      columns: { role: true },
    });

    if (!target) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }
    if (target.role === "admin" || target.role === "super admin") {
      res.status(403).json({ success: false, message: "Cannot ban admin users." });
      return;
    }

    
    
    
    await db.update(UserModel)
      .set(
        forSevenDays
          ? { bannedTill: sql`now() + '7 days'::interval`, banned: false }
          : { banned: true, bannedTill: null }
      )
      .where(eq(UserModel.id, id));

    await pusher({ page: "/admin-area/users", to: "admin" });
    res.json({ success: true });
  } catch (e) {
    console.error("BAN USER ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

export async function unbanUser(req: Request, res: Response) {
  try {
    
    const id = z.coerce.number().int().min(1).parse(req.params.id);

    
    
    
    
    
    
    const updated = await db.update(UserModel)
      .set({ banned: false, bannedTill: null })
      .where(and(
        eq(UserModel.id, id),
        notInArray(UserModel.role, ["super admin", "admin"]),
      ))
      .returning({ id: UserModel.id })
      .then((r) => r.at(0));

    if (!updated) {
      res.status(404).json({ success: false, message: "User not found or cannot unban this user." });
      return;
    }

    await pusher({ page: "/admin-area/users", to: "admin" });
    res.json({ success: true });
  } catch (e) {
    console.error("UNBAN USER ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

export async function changePassword(req: Request, res: Response) {
  try {
    
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const { password } = z.object({
      password: z.string().min(8),
    }).parse(req.body);

    
    const hashed = await bcrypt.hash(password, 10);
    await db.update(UserModel)
      .set({ password: hashed })
      .where(and(eq(UserModel.id, id), notInArray(UserModel.role, ["admin", "super admin"])));

    res.json({ success: true });
  } catch (e) {
    console.error("CHANGE PASSWORD ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

export async function changeRole(req: Request, res: Response) {
  try {
    
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const { role } = z.object({
      role: z.enum(["general", "support", "admin"]),
    }).parse(req.body);

    
    const updated = await db.update(UserModel)
      .set({ role })
      .where(and(
        eq(UserModel.id, id),
        notInArray(UserModel.role, ["super admin"]),
      ))
      .returning({ id: UserModel.id, agentSerial: UserModel.agentSerial })
      .then((r) => r.at(0));

    if (!updated) {
      res.status(404).json({ success: false, message: "User not found or cannot change role of super admin." });
      return;
    }

    
    
    if ((role === "support" || role === "admin") && updated.agentSerial === null) {
      const maxRow = await db.query.UserModel.findMany({
        columns: { agentSerial: true },
        orderBy: (u: any, { desc }: any) => desc(u.agentSerial),
        limit: 1,
      });
      const nextSerial = (maxRow[0]?.agentSerial ?? 0) + 1;
      await db
        .update(UserModel)
        .set({ agentSerial: nextSerial })
        .where(eq(UserModel.id, id));
    }
    

    await pusher({ page: "/admin-area/users", to: "admin" });
    res.json({ success: true });
  } catch (e) {
    console.error("CHANGE ROLE ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

export async function addBalance(req: Request, res: Response) {
  try {
    const { id } = z.object({
      id: z.coerce.number().int().min(1),
    }).parse(req.params);

    const { amount, currency, walletAddress, txid } = z.object({
      amount: z.number().positive(),
      currency: z.string().min(1),
      walletAddress: z.string().min(1),
      txid: z.string().optional(),
    }).parse(req.body);

    const user = await db.query.UserModel.findFirst({
      where: (m, { eq }) => eq(m.id, id),
      columns: { id: true },
    });

    if (!user) throw new UnloggingError("User not found.");

    await db.insert(AddedFundModel).values({
      userId: id,
      amount,
      currency,
      walletAddress,
      txid: txid ?? null,
      status: "approved",
      method: "now_payments",
      manualyUploaded: true,
    });

    await Promise.all([
      pusher({ page: "/admin-area/users", to: "admin" }),
      pusher({ page: "/admin-area/transactions", to: "admin" }),
      pusher({ page: "/top-up/transactions", to: `user-${id}` }),
      pusher({ page: "/header/user", to: `user-${id}` }),
    ]);

    res.json({ success: true });
  } catch (e) {
    console.error("ADD BALANCE ERROR:", e);
    if (e instanceof UnloggingError) {
      res.status(400).json({ success: false, message: e.message });
      return;
    }
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

export async function editUser(req: Request, res: Response) {
  try {
    
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const { username, email } = z.object({
      username: z.string().min(1),
      email: z.string().email(),
    }).parse(req.body);

    
    const conflict = await db.query.UserModel.findFirst({
      where: (m, { and, or, eq, ne }) => and(
        or(eq(m.username, username), eq(m.email, email)),
        ne(m.id, id),
      ),
      columns: { username: true, email: true },
    });

    if (conflict) {
      const field = conflict.username === username ? "Username" : "Email";
      throw new UnloggingError(`${field} is already taken.`);
    }

    const updated = await db.update(UserModel)
      .set({ username, email })
      .where(and(eq(UserModel.id, id), notInArray(UserModel.role, ["super admin", "admin"])))
      .returning({ id: UserModel.id })
      .then((r) => r.at(0));

    if (!updated) throw new UnloggingError("User not found.");

    await pusher({ page: "/admin-area/users", to: "admin" });
    await pusher({ page: "/header/user", to: `user-${updated.id}` });

    res.json({ success: true });
  } catch (e) {
    console.error("EDIT USER ERROR:", e);
    if (e instanceof UnloggingError) {
      res.status(400).json({ success: false, message: e.message });
      return;
    }
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}


export async function getAllTransactions(req: Request, res: Response) {
  try {
    const { page, limit, status, userId } = z.object({
      page: z.coerce.number().int().min(1).catch(1),
      limit: z.coerce.number().int().min(1).max(100).catch(20),
      status: z.enum(["pending", "approved", "rejected", "all"]).catch("all"),
      userId: z.coerce.number().int().min(1).optional(),
    }).parse(req.query);

    const offset = (page - 1) * limit;

    const where = and(
      userId ? eq(AddedFundModel.userId, userId) : undefined,
      status !== "all" ? eq(AddedFundModel.status, status) : undefined,
    );

    const [transactions, totalRows] = await Promise.all([
      db
        .select({
          id: AddedFundModel.id,
          date: AddedFundModel.createdAt,
          wallet: AddedFundModel.currency,
          walletAddress: AddedFundModel.walletAddress,
          txnId: AddedFundModel.txid,
          amount: AddedFundModel.amount,
          status: AddedFundModel.status,
          method: AddedFundModel.method,
          manuallyUploaded: AddedFundModel.manualyUploaded,
          userId: AddedFundModel.userId,
          username: UserModel.username,
        })
        .from(AddedFundModel)
        .leftJoin(UserModel, eq(AddedFundModel.userId, UserModel.id))
        .where(where)
        .orderBy(desc(AddedFundModel.id))
        .offset(offset)
        .limit(limit),

      db
        .select({ total: sql<number>`count(*)::int` })
        .from(AddedFundModel)
        .where(where)
        .then((r) => r.at(0)?.total ?? 0),
    ]);

    res.json({
      success: true,
      transactions,
      totalPage: Math.ceil(totalRows / limit),
      total: totalRows,
    });
  } catch (e) {
    console.error("GET ALL TRANSACTIONS ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}