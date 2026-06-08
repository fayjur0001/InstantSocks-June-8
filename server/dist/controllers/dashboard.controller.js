"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserDashboardStats = getUserDashboardStats;
exports.getAdminDashboardStats = getAdminDashboardStats;
exports.getAdminStatistics = getAdminStatistics;
exports.getAdminSummaryBoxes = getAdminSummaryBoxes;
exports.getAdminProxyTransactions = getAdminProxyTransactions;
exports.getAdminTopUsers = getAdminTopUsers;
const db_1 = __importDefault(require("@/db"));
const schema_1 = require("@/db/schema");
const get_balance_1 = __importDefault(require("@/utils/get-balance"));
const drizzle_orm_1 = require("drizzle-orm");
// ─── Helper: period string → Date cutoff ─────────────────────────────────────
function getChartPeriodStart(period) {
    const d = new Date();
    if (period === "1m") {
        d.setDate(d.getDate() - 30);
        return d;
    }
    if (period === "3m") {
        d.setDate(d.getDate() - 90);
        return d;
    }
    d.setDate(d.getDate() - 7); // default 7d
    return d;
}
function getSummaryPeriodStart(period) {
    const d = new Date();
    if (period === "3days") {
        d.setDate(d.getDate() - 3);
        return d;
    }
    if (period === "weekly") {
        d.setDate(d.getDate() - 7);
        return d;
    }
    if (period === "monthly") {
        d.setDate(d.getDate() - 30);
        return d;
    }
    // today
    d.setHours(0, 0, 0, 0);
    return d;
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/stats  — logged-in user
// ─────────────────────────────────────────────────────────────────────────────
async function getUserDashboardStats(req, res) {
    try {
        const userId = req.payload.id;
        const [balance, spendRow, pendingRow] = await Promise.all([
            (0, get_balance_1.default)(userId),
            db_1.default.select({
                total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.Socks5ProxyTransactionModel.price}), 0)::real`,
            }).from(schema_1.Socks5ProxyTransactionModel)
                .where((0, drizzle_orm_1.eq)(schema_1.Socks5ProxyTransactionModel.userId, userId)),
            db_1.default.select({
                total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.AddedFundModel.amount}), 0)::real`,
            }).from(schema_1.AddedFundModel)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.AddedFundModel.userId, userId), (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.status, "pending"))),
        ]);
        res.json({
            success: true,
            data: {
                balance: Number(balance.toFixed(2)),
                totalSpend: Number((spendRow[0]?.total ?? 0).toFixed(2)),
                pendingTopup: Number((pendingRow[0]?.total ?? 0).toFixed(2)),
            },
        });
    }
    catch (e) {
        console.error("GET USER DASHBOARD STATS ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard  — admin
// ─────────────────────────────────────────────────────────────────────────────
async function getAdminDashboardStats(_req, res) {
    try {
        const [totalRow, onlineRow, bannedRow, pendingCntRow, revenueRow, socks5Row, proxyBalanceRow] = await Promise.all([
            db_1.default.select({ c: (0, drizzle_orm_1.sql) `count(*)::int` }).from(schema_1.UserModel),
            db_1.default.select({ c: (0, drizzle_orm_1.sql) `count(*)::int` }).from(schema_1.UserModel).where((0, drizzle_orm_1.eq)(schema_1.UserModel.isOnline, true)),
            db_1.default.select({ c: (0, drizzle_orm_1.sql) `count(*)::int` }).from(schema_1.UserModel).where((0, drizzle_orm_1.eq)(schema_1.UserModel.banned, true)),
            db_1.default.select({ c: (0, drizzle_orm_1.sql) `count(*)::int` }).from(schema_1.AddedFundModel).where((0, drizzle_orm_1.eq)(schema_1.AddedFundModel.status, "pending")),
            // Total Turnover — website শুরু থেকে সব approved top-up এর sum
            db_1.default.select({ total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.AddedFundModel.amount}), 0)::real` })
                .from(schema_1.AddedFundModel).where((0, drizzle_orm_1.eq)(schema_1.AddedFundModel.status, "approved")),
            db_1.default.select({ c: (0, drizzle_orm_1.sql) `count(*)::int` }).from(schema_1.Socks5ProxyTransactionModel),
            // Proxy Balance — website শুরু থেকে সব proxy sell এর sum
            db_1.default.select({ total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.Socks5ProxyTransactionModel.price}), 0)::real` })
                .from(schema_1.Socks5ProxyTransactionModel),
        ]);
        res.json({
            success: true,
            data: {
                totalUsers: totalRow[0]?.c ?? 0,
                onlineUsers: onlineRow[0]?.c ?? 0,
                bannedUsers: bannedRow[0]?.c ?? 0,
                pendingTopupCount: pendingCntRow[0]?.c ?? 0,
                totalRevenue: Number((revenueRow[0]?.total ?? 0).toFixed(2)),
                activeSocks5Rentals: socks5Row[0]?.c ?? 0,
                proxyBalance: Number((proxyBalanceRow[0]?.total ?? 0).toFixed(2)),
            },
        });
    }
    catch (e) {
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
async function getAdminStatistics(req, res) {
    try {
        const tab = req.query.tab || "proxy";
        const period = req.query.period || "7d";
        const summaryPeriod = req.query.summaryPeriod || "today";
        const chartStart = getChartPeriodStart(period);
        const summaryStart = getSummaryPeriodStart(summaryPeriod);
        // ── PROXY TAB ────────────────────────────────────────────────────────────
        if (tab === "proxy") {
            // Chart: daily turnover grouped by date
            const chartRows = await db_1.default
                .select({
                date: (0, drizzle_orm_1.sql) `to_char(date_trunc('day', ${schema_1.Socks5ProxyTransactionModel.createdAt}), 'Mon DD, YYYY')`,
                turnover: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.Socks5ProxyTransactionModel.price}), 0)::real`,
                deposit: (0, drizzle_orm_1.sql) `count(*)::int`,
                topCountry: (0, drizzle_orm_1.sql) `mode() within group (order by ${schema_1.Socks5ProxyTransactionModel.country})`,
            })
                .from(schema_1.Socks5ProxyTransactionModel)
                .where((0, drizzle_orm_1.gte)(schema_1.Socks5ProxyTransactionModel.createdAt, chartStart))
                .groupBy((0, drizzle_orm_1.sql) `date_trunc('day', ${schema_1.Socks5ProxyTransactionModel.createdAt})`)
                .orderBy((0, drizzle_orm_1.sql) `date_trunc('day', ${schema_1.Socks5ProxyTransactionModel.createdAt})`);
            const chartData = chartRows.map((r) => ({
                date: r.date,
                turnover: Number(r.turnover.toFixed(2)),
                value: Number(r.turnover.toFixed(2)),
                deposit: Number(r.deposit),
                proxyLocation: r.topCountry ?? "N/A",
            }));
            // Summary boxes: use summaryPeriod window
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - 7);
            weekStart.setHours(0, 0, 0, 0);
            const [summaryTurnoverRow, summaryCountRow, summaryTopUserRow, summaryTopServiceRow, dayRentRow, weeklyRentRow, availableRow] = await Promise.all([
                // Total turnover in summaryPeriod
                db_1.default.select({
                    total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.Socks5ProxyTransactionModel.price}), 0)::real`,
                }).from(schema_1.Socks5ProxyTransactionModel)
                    .where((0, drizzle_orm_1.gte)(schema_1.Socks5ProxyTransactionModel.createdAt, summaryStart)),
                // Total rented count in summaryPeriod
                db_1.default.select({
                    count: (0, drizzle_orm_1.sql) `count(*)::int`,
                }).from(schema_1.Socks5ProxyTransactionModel)
                    .where((0, drizzle_orm_1.gte)(schema_1.Socks5ProxyTransactionModel.createdAt, summaryStart)),
                // Top user by spend in summaryPeriod
                db_1.default.select({
                    username: schema_1.UserModel.username,
                    total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.Socks5ProxyTransactionModel.price}), 0)::real`,
                }).from(schema_1.Socks5ProxyTransactionModel)
                    .leftJoin(schema_1.UserModel, (0, drizzle_orm_1.eq)(schema_1.Socks5ProxyTransactionModel.userId, schema_1.UserModel.id))
                    .where((0, drizzle_orm_1.gte)(schema_1.Socks5ProxyTransactionModel.createdAt, summaryStart))
                    .groupBy(schema_1.UserModel.username)
                    .orderBy((0, drizzle_orm_1.sql) `sum(${schema_1.Socks5ProxyTransactionModel.price}) desc`)
                    .limit(1),
                // Top service = country/state combo (e.g. "US/NY") by count
                db_1.default.select({
                    country: schema_1.Socks5ProxyTransactionModel.country,
                    state: schema_1.Socks5ProxyTransactionModel.state,
                    cnt: (0, drizzle_orm_1.sql) `count(*)::int`,
                }).from(schema_1.Socks5ProxyTransactionModel)
                    .where((0, drizzle_orm_1.gte)(schema_1.Socks5ProxyTransactionModel.createdAt, summaryStart))
                    .groupBy(schema_1.Socks5ProxyTransactionModel.country, schema_1.Socks5ProxyTransactionModel.state)
                    .orderBy((0, drizzle_orm_1.sql) `count(*) desc`)
                    .limit(1),
                // Day Rented = today's count (always fixed, not summaryPeriod)
                db_1.default.select({
                    count: (0, drizzle_orm_1.sql) `count(*)::int`,
                }).from(schema_1.Socks5ProxyTransactionModel)
                    .where((0, drizzle_orm_1.gte)(schema_1.Socks5ProxyTransactionModel.createdAt, todayStart)),
                // Weekly Rented = last 7 days count (always fixed)
                db_1.default.select({
                    count: (0, drizzle_orm_1.sql) `count(*)::int`,
                }).from(schema_1.Socks5ProxyTransactionModel)
                    .where((0, drizzle_orm_1.gte)(schema_1.Socks5ProxyTransactionModel.createdAt, weekStart)),
                // Available = all time total proxy transactions (stock indicator)
                db_1.default.select({
                    count: (0, drizzle_orm_1.sql) `count(*)::int`,
                }).from(schema_1.Socks5ProxyTransactionModel),
            ]);
            const totalTurnover = summaryTurnoverRow[0]?.total ?? 0;
            const totalCount = summaryCountRow[0]?.count ?? 0;
            const avgValue = totalCount > 0 ? totalTurnover / totalCount : 0;
            const topService = summaryTopServiceRow[0]
                ? `${summaryTopServiceRow[0].country}/${summaryTopServiceRow[0].state}`
                : "N/A";
            const summaryBoxes = [
                { label: "Available", value: availableRow[0]?.count ?? 0, highlight: true },
                { label: "Rented", value: totalCount, highlight: true },
                { label: "Day Rented", value: dayRentRow[0]?.count ?? 0, highlight: true },
                { label: "Weekly Rented", value: weeklyRentRow[0]?.count ?? 0, highlight: true },
                { label: "Top User", value: summaryTopUserRow[0]?.username ?? "N/A" },
                { label: "Top Services", value: topService },
                { label: "Avg Rent Value", value: `$${avgValue.toFixed(2)}` },
            ];
            return res.json({ success: true, data: { chartData, summaryBoxes } });
        }
        // ── TRANSACTIONS TAB ─────────────────────────────────────────────────────
        // Chart: daily approved deposit amounts + count
        const chartRows = await db_1.default
            .select({
            date: (0, drizzle_orm_1.sql) `to_char(date_trunc('day', ${schema_1.AddedFundModel.createdAt}), 'Mon DD, YYYY')`,
            deposit: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.AddedFundModel.amount}), 0)::real`,
            count: (0, drizzle_orm_1.sql) `count(*)::int`,
        })
            .from(schema_1.AddedFundModel)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.AddedFundModel.createdAt, chartStart), (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.status, "approved")))
            .groupBy((0, drizzle_orm_1.sql) `date_trunc('day', ${schema_1.AddedFundModel.createdAt})`)
            .orderBy((0, drizzle_orm_1.sql) `date_trunc('day', ${schema_1.AddedFundModel.createdAt})`);
        const chartData = chartRows.map((r) => ({
            date: r.date,
            turnover: Number(r.deposit.toFixed(2)),
            value: Number(r.deposit.toFixed(2)),
            deposit: Number(r.count), // ওই দিন কতটা deposit হয়েছে (count)
        }));
        // Summary boxes: summaryPeriod window
        const [approvedRow, pendingRow, rejectedRow, topUserRow] = await Promise.all([
            db_1.default.select({
                total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.AddedFundModel.amount}), 0)::real`,
                count: (0, drizzle_orm_1.sql) `count(*)::int`,
            }).from(schema_1.AddedFundModel)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.AddedFundModel.createdAt, summaryStart), (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.status, "approved"))),
            db_1.default.select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(schema_1.AddedFundModel)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.AddedFundModel.createdAt, summaryStart), (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.status, "pending"))),
            db_1.default.select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(schema_1.AddedFundModel)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.AddedFundModel.createdAt, summaryStart), (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.status, "rejected"))),
            // Top user by deposit amount
            db_1.default.select({
                username: schema_1.UserModel.username,
                total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.AddedFundModel.amount}), 0)::real`,
            }).from(schema_1.AddedFundModel)
                .leftJoin(schema_1.UserModel, (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.userId, schema_1.UserModel.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.AddedFundModel.createdAt, summaryStart), (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.status, "approved")))
                .groupBy(schema_1.UserModel.username)
                .orderBy((0, drizzle_orm_1.sql) `sum(${schema_1.AddedFundModel.amount}) desc`)
                .limit(1),
        ]);
        const totalDeposit = approvedRow[0]?.total ?? 0;
        const completedCnt = approvedRow[0]?.count ?? 0;
        const pendingCnt = pendingRow[0]?.count ?? 0;
        const failedCnt = rejectedRow[0]?.count ?? 0;
        const avgTxn = completedCnt > 0 ? totalDeposit / completedCnt : 0;
        const summaryBoxes = [
            { label: "Transaction Amount", value: `$${totalDeposit.toFixed(2)}`, highlight: true },
            { label: "Top User", value: topUserRow[0]?.username ?? "N/A", highlight: true },
            { label: "Failed Transactions", value: failedCnt, highlight: true },
            { label: "Pending Transactions", value: pendingCnt },
            { label: "Completed Transactions", value: completedCnt },
            { label: "Avg Txn Value", value: `$${avgTxn.toFixed(2)}` },
        ];
        return res.json({ success: true, data: { chartData, summaryBoxes } });
    }
    catch (e) {
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
async function getAdminSummaryBoxes(req, res) {
    try {
        const tab = req.query.tab || "transactions";
        const summaryPeriod = req.query.summaryPeriod || "today";
        const summaryStart = getSummaryPeriodStart(summaryPeriod);
        // ── PROXY TAB ────────────────────────────────────────────────────────────
        if (tab === "proxy") {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - 7);
            weekStart.setHours(0, 0, 0, 0);
            const [turnoverRow, countRow, topUserRow, topServiceRow, dayRentRow, weeklyRentRow, availableRow] = await Promise.all([
                // Total turnover in summaryPeriod
                db_1.default.select({
                    total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.Socks5ProxyTransactionModel.price}), 0)::real`,
                }).from(schema_1.Socks5ProxyTransactionModel)
                    .where((0, drizzle_orm_1.gte)(schema_1.Socks5ProxyTransactionModel.createdAt, summaryStart)),
                // Total rented count in summaryPeriod
                db_1.default.select({
                    count: (0, drizzle_orm_1.sql) `count(*)::int`,
                }).from(schema_1.Socks5ProxyTransactionModel)
                    .where((0, drizzle_orm_1.gte)(schema_1.Socks5ProxyTransactionModel.createdAt, summaryStart)),
                // Top user by spend in summaryPeriod
                db_1.default.select({
                    username: schema_1.UserModel.username,
                    total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.Socks5ProxyTransactionModel.price}), 0)::real`,
                }).from(schema_1.Socks5ProxyTransactionModel)
                    .leftJoin(schema_1.UserModel, (0, drizzle_orm_1.eq)(schema_1.Socks5ProxyTransactionModel.userId, schema_1.UserModel.id))
                    .where((0, drizzle_orm_1.gte)(schema_1.Socks5ProxyTransactionModel.createdAt, summaryStart))
                    .groupBy(schema_1.UserModel.username)
                    .orderBy((0, drizzle_orm_1.sql) `sum(${schema_1.Socks5ProxyTransactionModel.price}) desc`)
                    .limit(1),
                // Top service = country/state combo (e.g. "US/NY") by count
                db_1.default.select({
                    country: schema_1.Socks5ProxyTransactionModel.country,
                    state: schema_1.Socks5ProxyTransactionModel.state,
                    cnt: (0, drizzle_orm_1.sql) `count(*)::int`,
                }).from(schema_1.Socks5ProxyTransactionModel)
                    .where((0, drizzle_orm_1.gte)(schema_1.Socks5ProxyTransactionModel.createdAt, summaryStart))
                    .groupBy(schema_1.Socks5ProxyTransactionModel.country, schema_1.Socks5ProxyTransactionModel.state)
                    .orderBy((0, drizzle_orm_1.sql) `count(*) desc`)
                    .limit(1),
                // Day Rented = today's count (fixed, not summaryPeriod)
                db_1.default.select({
                    count: (0, drizzle_orm_1.sql) `count(*)::int`,
                }).from(schema_1.Socks5ProxyTransactionModel)
                    .where((0, drizzle_orm_1.gte)(schema_1.Socks5ProxyTransactionModel.createdAt, todayStart)),
                // Weekly Rented = last 7 days count (fixed)
                db_1.default.select({
                    count: (0, drizzle_orm_1.sql) `count(*)::int`,
                }).from(schema_1.Socks5ProxyTransactionModel)
                    .where((0, drizzle_orm_1.gte)(schema_1.Socks5ProxyTransactionModel.createdAt, weekStart)),
                // Available = all time total (stock indicator)
                db_1.default.select({
                    count: (0, drizzle_orm_1.sql) `count(*)::int`,
                }).from(schema_1.Socks5ProxyTransactionModel),
            ]);
            const totalTurnover = turnoverRow[0]?.total ?? 0;
            const totalCount = countRow[0]?.count ?? 0;
            const avgValue = totalCount > 0 ? totalTurnover / totalCount : 0;
            const topService = topServiceRow[0]
                ? `${topServiceRow[0].country}/${topServiceRow[0].state}`
                : "N/A";
            return res.json({
                success: true,
                data: {
                    summaryBoxes: [
                        { label: "Available", value: availableRow[0]?.count ?? 0, highlight: true },
                        { label: "Rented", value: totalCount, highlight: true },
                        { label: "Day Rented", value: dayRentRow[0]?.count ?? 0, highlight: true },
                        { label: "Weekly Rented", value: weeklyRentRow[0]?.count ?? 0, highlight: true },
                        { label: "Top User", value: topUserRow[0]?.username ?? "N/A" },
                        { label: "Top Services", value: topService },
                        { label: "Avg Rent Value", value: `$${avgValue.toFixed(2)}` },
                    ],
                },
            });
        }
        // ── TRANSACTIONS TAB ─────────────────────────────────────────────────────
        const [approvedRow, pendingRow, rejectedRow, topUserRow] = await Promise.all([
            // selected period এ approved top-up এর sum + count
            db_1.default.select({
                total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.AddedFundModel.amount}), 0)::real`,
                count: (0, drizzle_orm_1.sql) `count(*)::int`,
            }).from(schema_1.AddedFundModel)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.AddedFundModel.createdAt, summaryStart), (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.status, "approved"))),
            // selected period এ pending count
            db_1.default.select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(schema_1.AddedFundModel)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.AddedFundModel.createdAt, summaryStart), (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.status, "pending"))),
            // selected period এ rejected count
            db_1.default.select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(schema_1.AddedFundModel)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.AddedFundModel.createdAt, summaryStart), (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.status, "rejected"))),
            // selected period এ সবচেয়ে বেশি top-up করা user
            // একই user এর সব approved top-up sum করে সবচেয়ে বড় যে
            db_1.default.select({
                username: schema_1.UserModel.username,
                total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.AddedFundModel.amount}), 0)::real`,
            }).from(schema_1.AddedFundModel)
                .leftJoin(schema_1.UserModel, (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.userId, schema_1.UserModel.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.AddedFundModel.createdAt, summaryStart), (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.status, "approved")))
                .groupBy(schema_1.UserModel.username)
                .orderBy((0, drizzle_orm_1.sql) `sum(${schema_1.AddedFundModel.amount}) desc`)
                .limit(1),
        ]);
        const totalDeposit = approvedRow[0]?.total ?? 0;
        const completedCnt = approvedRow[0]?.count ?? 0;
        const pendingCnt = pendingRow[0]?.count ?? 0;
        const failedCnt = rejectedRow[0]?.count ?? 0;
        const avgTxn = completedCnt > 0 ? totalDeposit / completedCnt : 0;
        return res.json({
            success: true,
            data: {
                summaryBoxes: [
                    { label: "Transaction Amount", value: `$${totalDeposit.toFixed(2)}`, highlight: true },
                    { label: "Top User", value: topUserRow[0]?.username ?? "N/A", highlight: true },
                    { label: "Failed Transactions", value: failedCnt, highlight: true },
                    { label: "Pending Transactions", value: pendingCnt },
                    { label: "Completed Transactions", value: completedCnt },
                    { label: "Avg Txn Value", value: `$${avgTxn.toFixed(2)}` },
                ],
            },
        });
    }
    catch (e) {
        console.error("GET ADMIN SUMMARY BOXES ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/statistics/proxy-transactions
//   ?page=1&limit=20&search=<ip|username>
//   Admin — Socks5ProxyTransactionModel এর paginated list
// ─────────────────────────────────────────────────────────────────────────────
async function getAdminProxyTransactions(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page || "1", 10));
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
        const search = (req.query.search || "").trim().toLowerCase();
        const offset = (page - 1) * limit;
        // Build where clause
        const where = search
            ? (0, drizzle_orm_1.sql) `(lower(${schema_1.Socks5ProxyTransactionModel.ip}) like ${"%" + search + "%"}
          or lower(${schema_1.UserModel.username}) like ${"%" + search + "%"}
          or lower(${schema_1.Socks5ProxyTransactionModel.country}) like ${"%" + search + "%"})`
            : undefined;
        const baseQuery = db_1.default
            .select({
            id: schema_1.Socks5ProxyTransactionModel.id,
            ip: schema_1.Socks5ProxyTransactionModel.ip,
            country: schema_1.Socks5ProxyTransactionModel.country,
            state: schema_1.Socks5ProxyTransactionModel.state,
            city: schema_1.Socks5ProxyTransactionModel.city,
            zip: schema_1.Socks5ProxyTransactionModel.zip,
            port: schema_1.Socks5ProxyTransactionModel.port,
            type: schema_1.Socks5ProxyTransactionModel.type,
            note: schema_1.Socks5ProxyTransactionModel.note,
            price: schema_1.Socks5ProxyTransactionModel.price,
            createdAt: schema_1.Socks5ProxyTransactionModel.createdAt,
            username: schema_1.UserModel.username,
        })
            .from(schema_1.Socks5ProxyTransactionModel)
            .leftJoin(schema_1.UserModel, (0, drizzle_orm_1.eq)(schema_1.Socks5ProxyTransactionModel.userId, schema_1.UserModel.id));
        const [rows, countRows] = await Promise.all([
            (where ? baseQuery.where(where) : baseQuery)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.Socks5ProxyTransactionModel.createdAt))
                .limit(limit)
                .offset(offset),
            (where
                ? db_1.default.select({ c: (0, drizzle_orm_1.sql) `count(*)::int` })
                    .from(schema_1.Socks5ProxyTransactionModel)
                    .leftJoin(schema_1.UserModel, (0, drizzle_orm_1.eq)(schema_1.Socks5ProxyTransactionModel.userId, schema_1.UserModel.id))
                    .where(where)
                : db_1.default.select({ c: (0, drizzle_orm_1.sql) `count(*)::int` })
                    .from(schema_1.Socks5ProxyTransactionModel)),
        ]);
        const total = countRows[0]?.c ?? 0;
        res.json({
            success: true,
            data: {
                transactions: rows.map((r) => ({
                    id: r.id,
                    ip: r.ip,
                    country: r.country,
                    state: r.state,
                    city: r.city,
                    zip: r.zip,
                    port: r.port,
                    type: r.type,
                    note: r.note ?? "-",
                    price: Number(r.price.toFixed(2)),
                    bought: r.createdAt,
                    username: r.username ?? "-",
                })),
                total,
                page,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (e) {
        console.error("GET ADMIN PROXY TRANSACTIONS ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/statistics/top-users
//   ?tab=proxy|transactions&period=7d|1m|3m
//   Top spenders — "Top Users" chart tab এর জন্য
// ─────────────────────────────────────────────────────────────────────────────
async function getAdminTopUsers(req, res) {
    try {
        const tab = req.query.tab || "proxy";
        const period = req.query.period || "7d";
        const start = getChartPeriodStart(period);
        if (tab === "proxy") {
            // প্রতিটা দিনের জন্য সব users এর data আনো
            const rows = await db_1.default
                .select({
                day: (0, drizzle_orm_1.sql) `date_trunc('day', ${schema_1.Socks5ProxyTransactionModel.createdAt})`,
                date: (0, drizzle_orm_1.sql) `to_char(date_trunc('day', ${schema_1.Socks5ProxyTransactionModel.createdAt}), 'Mon DD, YYYY')`,
                name: schema_1.UserModel.username,
                turnover: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.Socks5ProxyTransactionModel.price}), 0)::real`,
                deposit: (0, drizzle_orm_1.sql) `count(*)::int`,
            })
                .from(schema_1.Socks5ProxyTransactionModel)
                .leftJoin(schema_1.UserModel, (0, drizzle_orm_1.eq)(schema_1.Socks5ProxyTransactionModel.userId, schema_1.UserModel.id))
                .where((0, drizzle_orm_1.gte)(schema_1.Socks5ProxyTransactionModel.createdAt, start))
                .groupBy((0, drizzle_orm_1.sql) `date_trunc('day', ${schema_1.Socks5ProxyTransactionModel.createdAt})`, schema_1.UserModel.username)
                .orderBy((0, drizzle_orm_1.sql) `date_trunc('day', ${schema_1.Socks5ProxyTransactionModel.createdAt})`);
            // প্রতিটা দিনের জন্য সবচেয়ে বেশি $ খরচ করা user বের করো
            const byDay = new Map();
            for (const r of rows) {
                const existing = byDay.get(r.day);
                const turnover = Number(r.turnover);
                if (!existing || turnover > existing.turnover) {
                    byDay.set(r.day, {
                        date: r.date,
                        name: r.name ?? "Unknown",
                        turnover: Number(turnover.toFixed(2)),
                        deposit: Number(r.deposit),
                    });
                }
            }
            const chartData = Array.from(byDay.values()).map((r) => ({
                date: r.date,
                name: r.name,
                turnover: r.turnover,
                value: r.turnover,
                deposit: r.deposit, // ওই দিন top user কতবার proxy কিনেছে (count)
            }));
            return res.json({ success: true, data: { chartData } });
        }
        // transactions tab — Top Users
        const rows = await db_1.default
            .select({
            day: (0, drizzle_orm_1.sql) `date_trunc('day', ${schema_1.AddedFundModel.createdAt})`,
            date: (0, drizzle_orm_1.sql) `to_char(date_trunc('day', ${schema_1.AddedFundModel.createdAt}), 'Mon DD, YYYY')`,
            name: schema_1.UserModel.username,
            turnover: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.AddedFundModel.amount}), 0)::real`,
            deposit: (0, drizzle_orm_1.sql) `count(*)::int`,
        })
            .from(schema_1.AddedFundModel)
            .leftJoin(schema_1.UserModel, (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.userId, schema_1.UserModel.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.AddedFundModel.createdAt, start), (0, drizzle_orm_1.eq)(schema_1.AddedFundModel.status, "approved")))
            .groupBy((0, drizzle_orm_1.sql) `date_trunc('day', ${schema_1.AddedFundModel.createdAt})`, schema_1.UserModel.username)
            .orderBy((0, drizzle_orm_1.sql) `date_trunc('day', ${schema_1.AddedFundModel.createdAt})`);
        // প্রতিটা দিনের জন্য সবচেয়ে বেশি $ top-up করা user বের করো
        const byDay = new Map();
        for (const r of rows) {
            const existing = byDay.get(r.day);
            const turnover = Number(r.turnover);
            if (!existing || turnover > existing.turnover) {
                byDay.set(r.day, {
                    date: r.date,
                    name: r.name ?? "Unknown",
                    turnover: Number(turnover.toFixed(2)),
                    deposit: Number(r.deposit), // ওই দিন top user কতবার top-up করেছে (count)
                });
            }
        }
        const chartData = Array.from(byDay.values()).map((r) => ({
            date: r.date,
            name: r.name,
            turnover: r.turnover,
            value: r.turnover,
            deposit: r.deposit,
        }));
        return res.json({ success: true, data: { chartData } });
    }
    catch (e) {
        console.error("GET TOP USERS ERROR:", e);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}
