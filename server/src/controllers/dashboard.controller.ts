import { Request, Response } from "express";
import db from "@/db";
import {
  AddedFundModel,
  Socks5ProxyTransactionModel,
  UserModel,
} from "@/db/schema";
import getBalance from "@/utils/get-balance";
import { and, desc, eq, gte, sql } from "drizzle-orm";

// ─── Helper: period string → Date cutoff ─────────────────────────────────────
function getChartPeriodStart(period: string): Date {
  const d = new Date();
  if (period === "1m")  { d.setDate(d.getDate() - 30);  return d; }
  if (period === "3m")  { d.setDate(d.getDate() - 90);  return d; }
  d.setDate(d.getDate() - 7); // default 7d
  return d;
}

function getSummaryPeriodStart(period: string): Date {
  const d = new Date();
  if (period === "3days")  { d.setDate(d.getDate() - 3);  return d; }
  if (period === "weekly") { d.setDate(d.getDate() - 7);  return d; }
  if (period === "monthly"){ d.setDate(d.getDate() - 30); return d; }
  // today
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/stats  — logged-in user
// ─────────────────────────────────────────────────────────────────────────────
export async function getUserDashboardStats(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;

    const [balance, spendRow, pendingRow] = await Promise.all([
      getBalance(userId),

      db.select({
        total: sql<number>`coalesce(sum(${Socks5ProxyTransactionModel.price}), 0)::real`,
      }).from(Socks5ProxyTransactionModel)
        .where(eq(Socks5ProxyTransactionModel.userId, userId)),

      db.select({
        total: sql<number>`coalesce(sum(${AddedFundModel.amount}), 0)::real`,
      }).from(AddedFundModel)
        .where(and(
          eq(AddedFundModel.userId, userId),
          eq(AddedFundModel.status, "pending"),
        )),
    ]);

    res.json({
      success: true,
      data: {
        balance:      Number(balance.toFixed(2)),
        totalSpend:   Number((spendRow[0]?.total   ?? 0).toFixed(2)),
        pendingTopup: Number((pendingRow[0]?.total ?? 0).toFixed(2)),
      },
    });
  } catch (e) {
    console.error("GET USER DASHBOARD STATS ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard  — admin
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminDashboardStats(_req: Request, res: Response) {
  try {
    const [totalRow, onlineRow, bannedRow, pendingCntRow, revenueRow, socks5Row, proxyBalanceRow] =
      await Promise.all([
        db.select({ c: sql<number>`count(*)::int` }).from(UserModel),
        db.select({ c: sql<number>`count(*)::int` }).from(UserModel).where(eq(UserModel.isOnline, true)),
        db.select({ c: sql<number>`count(*)::int` }).from(UserModel).where(eq(UserModel.banned, true)),
        db.select({ c: sql<number>`count(*)::int` }).from(AddedFundModel).where(eq(AddedFundModel.status, "pending")),
        // Total Turnover — website শুরু থেকে সব approved top-up এর sum
        db.select({ total: sql<number>`coalesce(sum(${AddedFundModel.amount}), 0)::real` })
          .from(AddedFundModel).where(eq(AddedFundModel.status, "approved")),
        db.select({ c: sql<number>`count(*)::int` }).from(Socks5ProxyTransactionModel),
        // Proxy Balance — website শুরু থেকে সব proxy sell এর sum
        db.select({ total: sql<number>`coalesce(sum(${Socks5ProxyTransactionModel.price}), 0)::real` })
          .from(Socks5ProxyTransactionModel),
      ]);

    res.json({
      success: true,
      data: {
        totalUsers:           totalRow[0]?.c   ?? 0,
        onlineUsers:          onlineRow[0]?.c  ?? 0,
        bannedUsers:          bannedRow[0]?.c  ?? 0,
        pendingTopupCount:    pendingCntRow[0]?.c ?? 0,
        totalRevenue:         Number((revenueRow[0]?.total ?? 0).toFixed(2)),
        activeSocks5Rentals:  socks5Row[0]?.c ?? 0,
        proxyBalance:         Number((proxyBalanceRow[0]?.total ?? 0).toFixed(2)),
      },
    });
  } catch (e) {
    console.error("GET ADMIN DASHBOARD STATS ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/statistics
//   ?tab=proxy|transactions
//   ?period=7d|1m|3m          ← chart range
//   ?summaryPeriod=today|3days|weekly|monthly  ← summary boxes range
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminStatistics(req: Request, res: Response) {
  try {
    const tab           = (req.query.tab           as string) || "proxy";
    const period        = (req.query.period        as string) || "7d";
    const summaryPeriod = (req.query.summaryPeriod as string) || "today";

    const chartStart   = getChartPeriodStart(period);
    const summaryStart = getSummaryPeriodStart(summaryPeriod);

    // ── PROXY TAB ────────────────────────────────────────────────────────────
    if (tab === "proxy") {

      // Chart: daily turnover grouped by date
      const chartRows = await db
        .select({
          date:     sql<string>`to_char(date_trunc('day', ${Socks5ProxyTransactionModel.createdAt}), 'Mon DD, YYYY')`,
          turnover: sql<number>`coalesce(sum(${Socks5ProxyTransactionModel.price}), 0)::real`,
          deposit:  sql<number>`count(*)::int`,
          topCountry: sql<string>`mode() within group (order by ${Socks5ProxyTransactionModel.country})`,
        })
        .from(Socks5ProxyTransactionModel)
        .where(gte(Socks5ProxyTransactionModel.createdAt, chartStart))
        .groupBy(sql`date_trunc('day', ${Socks5ProxyTransactionModel.createdAt})`)
        .orderBy(sql`date_trunc('day', ${Socks5ProxyTransactionModel.createdAt})`);

      const chartData = chartRows.map((r) => ({
        date:          r.date,
        turnover:      Number(r.turnover.toFixed(2)),
        value:         Number(r.turnover.toFixed(2)),
        deposit:       Number(r.deposit),
        proxyLocation: r.topCountry ?? "N/A",
      }));

      // Summary boxes: use summaryPeriod window
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const weekStart  = new Date(); weekStart.setDate(weekStart.getDate() - 7); weekStart.setHours(0, 0, 0, 0);

      const [summaryTurnoverRow, summaryCountRow, summaryTopUserRow, summaryTopServiceRow, dayRentRow, weeklyRentRow, availableRow] =
        await Promise.all([
          // Total turnover in summaryPeriod
          db.select({
            total: sql<number>`coalesce(sum(${Socks5ProxyTransactionModel.price}), 0)::real`,
          }).from(Socks5ProxyTransactionModel)
            .where(gte(Socks5ProxyTransactionModel.createdAt, summaryStart)),

          // Total rented count in summaryPeriod
          db.select({
            count: sql<number>`count(*)::int`,
          }).from(Socks5ProxyTransactionModel)
            .where(gte(Socks5ProxyTransactionModel.createdAt, summaryStart)),

          // Top user by spend in summaryPeriod
          db.select({
            username: UserModel.username,
            total:    sql<number>`coalesce(sum(${Socks5ProxyTransactionModel.price}), 0)::real`,
          }).from(Socks5ProxyTransactionModel)
            .leftJoin(UserModel, eq(Socks5ProxyTransactionModel.userId, UserModel.id))
            .where(gte(Socks5ProxyTransactionModel.createdAt, summaryStart))
            .groupBy(UserModel.username)
            .orderBy(sql`sum(${Socks5ProxyTransactionModel.price}) desc`)
            .limit(1),

          // Top service = country/state combo (e.g. "US/NY") by count
          db.select({
            country: Socks5ProxyTransactionModel.country,
            state:   Socks5ProxyTransactionModel.state,
            cnt:     sql<number>`count(*)::int`,
          }).from(Socks5ProxyTransactionModel)
            .where(gte(Socks5ProxyTransactionModel.createdAt, summaryStart))
            .groupBy(Socks5ProxyTransactionModel.country, Socks5ProxyTransactionModel.state)
            .orderBy(sql`count(*) desc`)
            .limit(1),

          // Day Rented = today's count (always fixed, not summaryPeriod)
          db.select({
            count: sql<number>`count(*)::int`,
          }).from(Socks5ProxyTransactionModel)
            .where(gte(Socks5ProxyTransactionModel.createdAt, todayStart)),

          // Weekly Rented = last 7 days count (always fixed)
          db.select({
            count: sql<number>`count(*)::int`,
          }).from(Socks5ProxyTransactionModel)
            .where(gte(Socks5ProxyTransactionModel.createdAt, weekStart)),

          // Available = all time total proxy transactions (stock indicator)
          db.select({
            count: sql<number>`count(*)::int`,
          }).from(Socks5ProxyTransactionModel),
        ]);

      const totalTurnover = summaryTurnoverRow[0]?.total ?? 0;
      const totalCount    = summaryCountRow[0]?.count ?? 0;
      const avgValue      = totalCount > 0 ? totalTurnover / totalCount : 0;
      const topService    = summaryTopServiceRow[0]
        ? `${summaryTopServiceRow[0].country}/${summaryTopServiceRow[0].state}`
        : "N/A";

      const summaryBoxes = [
        { label: "Available",      value: availableRow[0]?.count ?? 0,         highlight: true },
        { label: "Rented",         value: totalCount,                           highlight: true },
        { label: "Day Rented",     value: dayRentRow[0]?.count ?? 0,           highlight: true },
        { label: "Weekly Rented",  value: weeklyRentRow[0]?.count ?? 0,        highlight: true },
        { label: "Top User",       value: summaryTopUserRow[0]?.username ?? "N/A" },
        { label: "Top Services",   value: topService },
        { label: "Avg Rent Value", value: `$${avgValue.toFixed(2)}` },
      ];

      return res.json({ success: true, data: { chartData, summaryBoxes } });
    }

    // ── TRANSACTIONS TAB ─────────────────────────────────────────────────────

    // Chart: daily approved deposit amounts + count
    const chartRows = await db
      .select({
        date:    sql<string>`to_char(date_trunc('day', ${AddedFundModel.createdAt}), 'Mon DD, YYYY')`,
        deposit: sql<number>`coalesce(sum(${AddedFundModel.amount}), 0)::real`,
        count:   sql<number>`count(*)::int`,
      })
      .from(AddedFundModel)
      .where(and(
        gte(AddedFundModel.createdAt, chartStart),
        eq(AddedFundModel.status, "approved"),
      ))
      .groupBy(sql`date_trunc('day', ${AddedFundModel.createdAt})`)
      .orderBy(sql`date_trunc('day', ${AddedFundModel.createdAt})`);

    const chartData = chartRows.map((r) => ({
      date:     r.date,
      turnover: Number(r.deposit.toFixed(2)),
      value:    Number(r.deposit.toFixed(2)),
      deposit:  Number(r.count),  // ওই দিন কতটা deposit হয়েছে (count)
    }));

    // Summary boxes: summaryPeriod window
    const [approvedRow, pendingRow, rejectedRow, topUserRow] = await Promise.all([
      db.select({
        total: sql<number>`coalesce(sum(${AddedFundModel.amount}), 0)::real`,
        count: sql<number>`count(*)::int`,
      }).from(AddedFundModel)
        .where(and(
          gte(AddedFundModel.createdAt, summaryStart),
          eq(AddedFundModel.status, "approved"),
        )),

      db.select({ count: sql<number>`count(*)::int` })
        .from(AddedFundModel)
        .where(and(
          gte(AddedFundModel.createdAt, summaryStart),
          eq(AddedFundModel.status, "pending"),
        )),

      db.select({ count: sql<number>`count(*)::int` })
        .from(AddedFundModel)
        .where(and(
          gte(AddedFundModel.createdAt, summaryStart),
          eq(AddedFundModel.status, "rejected"),
        )),

      // Top user by deposit amount
      db.select({
        username: UserModel.username,
        total:    sql<number>`coalesce(sum(${AddedFundModel.amount}), 0)::real`,
      }).from(AddedFundModel)
        .leftJoin(UserModel, eq(AddedFundModel.userId, UserModel.id))
        .where(and(
          gte(AddedFundModel.createdAt, summaryStart),
          eq(AddedFundModel.status, "approved"),
        ))
        .groupBy(UserModel.username)
        .orderBy(sql`sum(${AddedFundModel.amount}) desc`)
        .limit(1),
    ]);

    const totalDeposit  = approvedRow[0]?.total ?? 0;
    const completedCnt  = approvedRow[0]?.count ?? 0;
    const pendingCnt    = pendingRow[0]?.count  ?? 0;
    const failedCnt     = rejectedRow[0]?.count ?? 0;
    const avgTxn        = completedCnt > 0 ? totalDeposit / completedCnt : 0;

    const summaryBoxes = [
      { label: "Transaction Amount",      value: `$${totalDeposit.toFixed(2)}`,  highlight: true },
      { label: "Top User",                value: topUserRow[0]?.username ?? "N/A", highlight: true },
      { label: "Failed Transactions",     value: failedCnt,                       highlight: true },
      { label: "Pending Transactions",    value: pendingCnt },
      { label: "Completed Transactions",  value: completedCnt },
      { label: "Avg Txn Value",           value: `$${avgTxn.toFixed(2)}` },
    ];

    return res.json({ success: true, data: { chartData, summaryBoxes } });
  } catch (e) {
    console.error("GET ADMIN STATISTICS ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/statistics/summary
//   ?tab=proxy|transactions
//   ?summaryPeriod=today|3days|weekly|monthly
//   শুধু summary boxes return করে — chart data ছাড়া।
//   Period dropdown change হলে শুধু এই endpoint call হবে।
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminSummaryBoxes(req: Request, res: Response) {
  try {
    const tab           = (req.query.tab           as string) || "transactions";
    const summaryPeriod = (req.query.summaryPeriod as string) || "today";
    const summaryStart  = getSummaryPeriodStart(summaryPeriod);

    // ── PROXY TAB ────────────────────────────────────────────────────────────
    if (tab === "proxy") {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const weekStart  = new Date(); weekStart.setDate(weekStart.getDate() - 7); weekStart.setHours(0, 0, 0, 0);

      const [turnoverRow, countRow, topUserRow, topServiceRow, dayRentRow, weeklyRentRow, availableRow] = await Promise.all([
        // Total turnover in summaryPeriod
        db.select({
          total: sql<number>`coalesce(sum(${Socks5ProxyTransactionModel.price}), 0)::real`,
        }).from(Socks5ProxyTransactionModel)
          .where(gte(Socks5ProxyTransactionModel.createdAt, summaryStart)),

        // Total rented count in summaryPeriod
        db.select({
          count: sql<number>`count(*)::int`,
        }).from(Socks5ProxyTransactionModel)
          .where(gte(Socks5ProxyTransactionModel.createdAt, summaryStart)),

        // Top user by spend in summaryPeriod
        db.select({
          username: UserModel.username,
          total:    sql<number>`coalesce(sum(${Socks5ProxyTransactionModel.price}), 0)::real`,
        }).from(Socks5ProxyTransactionModel)
          .leftJoin(UserModel, eq(Socks5ProxyTransactionModel.userId, UserModel.id))
          .where(gte(Socks5ProxyTransactionModel.createdAt, summaryStart))
          .groupBy(UserModel.username)
          .orderBy(sql`sum(${Socks5ProxyTransactionModel.price}) desc`)
          .limit(1),

        // Top service = country/state combo (e.g. "US/NY") by count
        db.select({
          country: Socks5ProxyTransactionModel.country,
          state:   Socks5ProxyTransactionModel.state,
          cnt:     sql<number>`count(*)::int`,
        }).from(Socks5ProxyTransactionModel)
          .where(gte(Socks5ProxyTransactionModel.createdAt, summaryStart))
          .groupBy(Socks5ProxyTransactionModel.country, Socks5ProxyTransactionModel.state)
          .orderBy(sql`count(*) desc`)
          .limit(1),

        // Day Rented = today's count (fixed, not summaryPeriod)
        db.select({
          count: sql<number>`count(*)::int`,
        }).from(Socks5ProxyTransactionModel)
          .where(gte(Socks5ProxyTransactionModel.createdAt, todayStart)),

        // Weekly Rented = last 7 days count (fixed)
        db.select({
          count: sql<number>`count(*)::int`,
        }).from(Socks5ProxyTransactionModel)
          .where(gte(Socks5ProxyTransactionModel.createdAt, weekStart)),

        // Available = all time total (stock indicator)
        db.select({
          count: sql<number>`count(*)::int`,
        }).from(Socks5ProxyTransactionModel),
      ]);

      const totalTurnover = turnoverRow[0]?.total ?? 0;
      const totalCount    = countRow[0]?.count    ?? 0;
      const avgValue      = totalCount > 0 ? totalTurnover / totalCount : 0;
      const topService    = topServiceRow[0]
        ? `${topServiceRow[0].country}/${topServiceRow[0].state}`
        : "N/A";

      return res.json({
        success: true,
        data: {
          summaryBoxes: [
            { label: "Available",      value: availableRow[0]?.count ?? 0,        highlight: true },
            { label: "Rented",         value: totalCount,                          highlight: true },
            { label: "Day Rented",     value: dayRentRow[0]?.count ?? 0,          highlight: true },
            { label: "Weekly Rented",  value: weeklyRentRow[0]?.count ?? 0,       highlight: true },
            { label: "Top User",       value: topUserRow[0]?.username ?? "N/A" },
            { label: "Top Services",   value: topService },
            { label: "Avg Rent Value", value: `$${avgValue.toFixed(2)}` },
          ],
        },
      });
    }

    // ── TRANSACTIONS TAB ─────────────────────────────────────────────────────
    const [approvedRow, pendingRow, rejectedRow, topUserRow] = await Promise.all([
      // selected period এ approved top-up এর sum + count
      db.select({
        total: sql<number>`coalesce(sum(${AddedFundModel.amount}), 0)::real`,
        count: sql<number>`count(*)::int`,
      }).from(AddedFundModel)
        .where(and(
          gte(AddedFundModel.createdAt, summaryStart),
          eq(AddedFundModel.status, "approved"),
        )),

      // selected period এ pending count
      db.select({ count: sql<number>`count(*)::int` })
        .from(AddedFundModel)
        .where(and(
          gte(AddedFundModel.createdAt, summaryStart),
          eq(AddedFundModel.status, "pending"),
        )),

      // selected period এ rejected count
      db.select({ count: sql<number>`count(*)::int` })
        .from(AddedFundModel)
        .where(and(
          gte(AddedFundModel.createdAt, summaryStart),
          eq(AddedFundModel.status, "rejected"),
        )),

      // selected period এ সবচেয়ে বেশি top-up করা user
      // একই user এর সব approved top-up sum করে সবচেয়ে বড় যে
      db.select({
        username: UserModel.username,
        total:    sql<number>`coalesce(sum(${AddedFundModel.amount}), 0)::real`,
      }).from(AddedFundModel)
        .leftJoin(UserModel, eq(AddedFundModel.userId, UserModel.id))
        .where(and(
          gte(AddedFundModel.createdAt, summaryStart),
          eq(AddedFundModel.status, "approved"),
        ))
        .groupBy(UserModel.username)
        .orderBy(sql`sum(${AddedFundModel.amount}) desc`)
        .limit(1),
    ]);

    const totalDeposit = approvedRow[0]?.total ?? 0;
    const completedCnt = approvedRow[0]?.count ?? 0;
    const pendingCnt   = pendingRow[0]?.count  ?? 0;
    const failedCnt    = rejectedRow[0]?.count ?? 0;
    const avgTxn       = completedCnt > 0 ? totalDeposit / completedCnt : 0;

    return res.json({
      success: true,
      data: {
        summaryBoxes: [
          { label: "Transaction Amount",     value: `$${totalDeposit.toFixed(2)}`, highlight: true },
          { label: "Top User",               value: topUserRow[0]?.username ?? "N/A", highlight: true },
          { label: "Failed Transactions",    value: failedCnt,                     highlight: true },
          { label: "Pending Transactions",   value: pendingCnt },
          { label: "Completed Transactions", value: completedCnt },
          { label: "Avg Txn Value",          value: `$${avgTxn.toFixed(2)}` },
        ],
      },
    });
  } catch (e) {
    console.error("GET ADMIN SUMMARY BOXES ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/statistics/proxy-transactions
//   ?page=1&limit=20&search=<ip|username>
//   Admin — Socks5ProxyTransactionModel এর paginated list
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminProxyTransactions(req: Request, res: Response) {
  try {
    const page   = Math.max(1, parseInt((req.query.page  as string) || "1", 10));
    const limit  = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "20", 10)));
    const search = ((req.query.search as string) || "").trim().toLowerCase();
    const offset = (page - 1) * limit;

    // Build where clause
    const where = search
      ? sql`(lower(${Socks5ProxyTransactionModel.ip}) like ${"%" + search + "%"}
          or lower(${UserModel.username}) like ${"%" + search + "%"}
          or lower(${Socks5ProxyTransactionModel.country}) like ${"%" + search + "%"})`
      : undefined;

    const baseQuery = db
      .select({
        id:        Socks5ProxyTransactionModel.id,
        ip:        Socks5ProxyTransactionModel.ip,
        country:   Socks5ProxyTransactionModel.country,
        state:     Socks5ProxyTransactionModel.state,
        city:      Socks5ProxyTransactionModel.city,
        zip:       Socks5ProxyTransactionModel.zip,
        port:      Socks5ProxyTransactionModel.port,
        type:      Socks5ProxyTransactionModel.type,
        note:      Socks5ProxyTransactionModel.note,
        price:     Socks5ProxyTransactionModel.price,
        createdAt: Socks5ProxyTransactionModel.createdAt,
        username:  UserModel.username,
      })
      .from(Socks5ProxyTransactionModel)
      .leftJoin(UserModel, eq(Socks5ProxyTransactionModel.userId, UserModel.id));

    const [rows, countRows] = await Promise.all([
      (where ? baseQuery.where(where) : baseQuery)
        .orderBy(desc(Socks5ProxyTransactionModel.createdAt))
        .limit(limit)
        .offset(offset),

      (where
        ? db.select({ c: sql<number>`count(*)::int` })
            .from(Socks5ProxyTransactionModel)
            .leftJoin(UserModel, eq(Socks5ProxyTransactionModel.userId, UserModel.id))
            .where(where)
        : db.select({ c: sql<number>`count(*)::int` })
            .from(Socks5ProxyTransactionModel)
      ),
    ]);

    const total = countRows[0]?.c ?? 0;

    res.json({
      success: true,
      data: {
        transactions: rows.map((r) => ({
          id:        r.id,
          ip:        r.ip,
          country:   r.country,
          state:     r.state,
          city:      r.city,
          zip:       r.zip,
          port:      r.port,
          type:      r.type,
          note:      r.note ?? "-",
          price:     Number(r.price.toFixed(2)),
          bought:    r.createdAt,
          username:  r.username ?? "-",
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    console.error("GET ADMIN PROXY TRANSACTIONS ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/statistics/top-users
//   ?tab=proxy|transactions&period=7d|1m|3m
//   Top spenders — "Top Users" chart tab এর জন্য
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminTopUsers(req: Request, res: Response) {
  try {
    const tab    = (req.query.tab    as string) || "proxy";
    const period = (req.query.period as string) || "7d";
    const start  = getChartPeriodStart(period);

    if (tab === "proxy") {
      // প্রতিটা দিনের জন্য সব users এর data আনো
      const rows = await db
        .select({
          day:      sql<string>`date_trunc('day', ${Socks5ProxyTransactionModel.createdAt})`,
          date:     sql<string>`to_char(date_trunc('day', ${Socks5ProxyTransactionModel.createdAt}), 'Mon DD, YYYY')`,
          name:     UserModel.username,
          turnover: sql<number>`coalesce(sum(${Socks5ProxyTransactionModel.price}), 0)::real`,
          deposit:  sql<number>`count(*)::int`,
        })
        .from(Socks5ProxyTransactionModel)
        .leftJoin(UserModel, eq(Socks5ProxyTransactionModel.userId, UserModel.id))
        .where(gte(Socks5ProxyTransactionModel.createdAt, start))
        .groupBy(sql`date_trunc('day', ${Socks5ProxyTransactionModel.createdAt})`, UserModel.username)
        .orderBy(sql`date_trunc('day', ${Socks5ProxyTransactionModel.createdAt})`);

      // প্রতিটা দিনের জন্য সবচেয়ে বেশি $ খরচ করা user বের করো
      const byDay = new Map<string, { date: string; name: string; turnover: number; deposit: number }>();
      for (const r of rows) {
        const existing = byDay.get(r.day);
        const turnover = Number(r.turnover);
        if (!existing || turnover > existing.turnover) {
          byDay.set(r.day, {
            date:     r.date,
            name:     r.name ?? "Unknown",
            turnover: Number(turnover.toFixed(2)),
            deposit:  Number(r.deposit),
          });
        }
      }

      const chartData = Array.from(byDay.values()).map((r) => ({
        date:    r.date,
        name:    r.name,
        turnover: r.turnover,
        value:   r.turnover,
        deposit: r.deposit,  // ওই দিন top user কতবার proxy কিনেছে (count)
      }));

      return res.json({ success: true, data: { chartData } });
    }

    // transactions tab — Top Users
    const rows = await db
      .select({
        day:      sql<string>`date_trunc('day', ${AddedFundModel.createdAt})`,
        date:     sql<string>`to_char(date_trunc('day', ${AddedFundModel.createdAt}), 'Mon DD, YYYY')`,
        name:     UserModel.username,
        turnover: sql<number>`coalesce(sum(${AddedFundModel.amount}), 0)::real`,
        deposit:  sql<number>`count(*)::int`,
      })
      .from(AddedFundModel)
      .leftJoin(UserModel, eq(AddedFundModel.userId, UserModel.id))
      .where(and(
        gte(AddedFundModel.createdAt, start),
        eq(AddedFundModel.status, "approved"),
      ))
      .groupBy(sql`date_trunc('day', ${AddedFundModel.createdAt})`, UserModel.username)
      .orderBy(sql`date_trunc('day', ${AddedFundModel.createdAt})`);

    // প্রতিটা দিনের জন্য সবচেয়ে বেশি $ top-up করা user বের করো
    const byDay = new Map<string, { date: string; name: string; turnover: number; deposit: number }>();
    for (const r of rows) {
      const existing = byDay.get(r.day);
      const turnover = Number(r.turnover);
      if (!existing || turnover > existing.turnover) {
        byDay.set(r.day, {
          date:     r.date,
          name:     r.name ?? "Unknown",
          turnover: Number(turnover.toFixed(2)),
          deposit:  Number(r.deposit),  // ওই দিন top user কতবার top-up করেছে (count)
        });
      }
    }

    const chartData = Array.from(byDay.values()).map((r) => ({
      date:    r.date,
      name:    r.name,
      turnover: r.turnover,
      value:   r.turnover,
      deposit: r.deposit,
    }));

    return res.json({ success: true, data: { chartData } });
  } catch (e) {
    console.error("GET TOP USERS ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}