import { Request, Response } from "express";
import { randomBytes } from "crypto";
import db from "@/db";
import {
  Socks5ProxyCartModel,
  Socks5AuthModel,
  Socks5ProxyTransactionModel,
  UserModel,
} from "@/db/schema";
import { eq, desc, and, inArray, sql, ne } from "drizzle-orm";
import { z } from "zod";
import getBalance from "@/utils/get-balance";
import SiteOptions from "@/utils/site-options";
import { createNotification } from "@/controllers/notification.controller";
import {
  nsocksFetchList,
  nsocksBuyProxy,
  nsocksGetProxy,
  nsocksGetBalance,
  nsocksGetHistory,
  nsocksRefund,
  nsocksRenewTraffic,
  nsocksSetAutoRenew,
  nsocksGetCountries,
  nsocksGetStates,
  nsocksCheckRiskScore,
  nsocksCheckBlacks,
} from "@/utils/nsocks.adapter";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/proxy/list
// ─────────────────────────────────────────────────────────────────────────────
export async function getProxyDetails(req: Request, res: Response) {
  try {
    const proxyId = z.string().min(1).parse(req.params.id);
    const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
    if (!apiKey) {
      return res.status(503).json({ success: false, message: "Proxy provider not configured." });
    }
    const proxy = await nsocksGetProxy(apiKey, proxyId);
    if (!proxy) {
      return res.status(404).json({ success: false, message: "Proxy not found." });
    }
    const commissionPct = await SiteOptions.transactionCut.Socks5Proxy.get();
    return res.json({
      success: true,
      proxy: {
        ...proxy,
        originalPrice: proxy.price,
        price: commissionPct > 0
          ? parseFloat((proxy.price * (1 + commissionPct / 100)).toFixed(4))
          : proxy.price,
      },
    });
  } catch (err) {
    console.error("[getProxyDetails]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

export async function getProxyList(req: Request, res: Response) {
  try {
    const {
      country, ip, zip, domain, type, state, city, isp,
      added, area, rotating, discountFilter,
      excludeUsed, excludeBlacks, highSpeed, udp, sort,
      page, limit,
    } = z
      .object({
        country:        z.string().optional(),
        ip:             z.string().optional(),
        zip:            z.string().optional(),
        domain:         z.string().optional(),
        type:           z.string().optional(),
        state:          z.string().optional(),
        city:           z.string().optional(),
        isp:            z.string().optional(),
        added:          z.coerce.number().int().optional(),
        area:           z.coerce.number().int().refine((v) => [25, 50, 100].includes(v)).optional() as unknown as z.ZodOptional<z.ZodLiteral<25 | 50 | 100>>,
        rotating:       z.coerce.number().int().min(1).max(2).optional() as unknown as z.ZodOptional<z.ZodLiteral<1 | 2>>,
        discountFilter: z.coerce.boolean().optional(),
        excludeUsed:    z.coerce.boolean().optional(),
        excludeBlacks:  z.coerce.boolean().optional(),
        highSpeed:      z.coerce.boolean().optional(),
        udp:            z.coerce.boolean().optional(),
        sort:           z.string().optional(),
        page:           z.coerce.number().int().min(1).catch(1),
        limit:          z.coerce.number().int().min(1).max(100).catch(20),
      })
      .parse(req.query);

    const USE_MOCK = process.env.MOCK_SERVICES === "true";

    if (USE_MOCK) {
      const mockProxies = Array.from({ length: 50 }, (_, i) => ({
        id: `proxy-${i + 1}`,
        ip: `192.168.${Math.floor(i / 10)}.${i % 10 + 1}`,
        domain: `proxy${i + 1}.example.com`,
        countryCode: country || "US",
        country: "United States",
        state: state || "New York",
        city: city || "New York City",
        isp: isp || "T-Mobile",
        zip: zip || "10001",
        speed: "50Mbps",
        ping: Math.floor(Math.random() * 100) + 10,
        type: type || "ISP",
        added: new Date().toISOString(),
        price: parseFloat((Math.random() * 5 + 1).toFixed(2)),
        org: "T-Mobile USA",
        zone: "EST",
        dns: "8.8.8.8",
        blacklisted: false,
        usage: "0/100GB",
        connectionString: `socks5://user:pass@192.168.0.${i + 1}:1080`,
      }));

      const offset = (page - 1) * limit;
      const filtered = mockProxies.slice(offset, offset + limit);

      return res.json({
        success: true,
        proxies: filtered,
        total: mockProxies.length,
        totalPage: Math.ceil(mockProxies.length / limit),
      });
    }

    const [apiKey, commissionPct] = await Promise.all([
      SiteOptions.socks5ProxyAPIKey.get(),
      SiteOptions.transactionCut.Socks5Proxy.get(),
    ]);

    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: "Proxy provider not configured. Contact admin.",
      });
    }

    const data = await nsocksFetchList(apiKey, {
      country, ip, zip, domain, type, state, city, isp,
      added, area, rotating, discountFilter,
      excludeUsed, excludeBlacks, highSpeed, udp, sort,
      page, limit,
    });

    const proxiesWithMarkup = data.proxies.map((p) => ({
      ...p,
      originalPrice: p.price,
      price: commissionPct > 0
        ? parseFloat((p.price * (1 + commissionPct / 100)).toFixed(4))
        : p.price,
    }));

    return res.json({
      success: true,
      proxies: proxiesWithMarkup,
      total: data.total,
      totalPage: data.totalPage,
    });
  } catch (err) {
    console.error("[getProxyList]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/proxy/cart
// ─────────────────────────────────────────────────────────────────────────────
export async function getCart(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;

    const items = await db.query.Socks5ProxyCartModel.findMany({
      where: (m, { eq }) => eq(m.userId, userId),
      orderBy: [desc(Socks5ProxyCartModel.createdAt)],
    });

    return res.json({ success: true, items });
  } catch (err) {
    console.error("[getCart]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/proxy/cart
// ─────────────────────────────────────────────────────────────────────────────
export async function addToCart(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;

    const { proxyId, price, originalPrice } = z
      .object({
        proxyId: z.string().min(1),
        price: z.number().positive(),
        originalPrice: z.number().positive(),
      })
      .parse(req.body);

    const existing = await db.query.Socks5ProxyCartModel.findFirst({
      where: (m, { and, eq }) =>
        and(eq(m.userId, userId), eq(m.proxyId, proxyId)),
    });

    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Proxy already in cart." });
    }

    const [item] = await db
      .insert(Socks5ProxyCartModel)
      .values({ userId, proxyId, price, originalPrice })
      .returning();

    return res.status(201).json({ success: true, item });
  } catch (err) {
    console.error("[addToCart]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/proxy/cart/:id
// ─────────────────────────────────────────────────────────────────────────────
export async function removeFromCart(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;
    const id = z.coerce.number().int().positive().parse(req.params.id);

    const item = await db.query.Socks5ProxyCartModel.findFirst({
      where: (m, { and, eq }) => and(eq(m.id, id), eq(m.userId, userId)),
    });

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Cart item not found." });
    }

    await db
      .delete(Socks5ProxyCartModel)
      .where(
        and(
          eq(Socks5ProxyCartModel.id, id),
          eq(Socks5ProxyCartModel.userId, userId)
        )
      );

    return res.json({ success: true, message: "Removed from cart." });
  } catch (err) {
    console.error("[removeFromCart]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/proxy/rent
// ─────────────────────────────────────────────────────────────────────────────
export async function rentProxy(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;

    const userStatus = await db.query.UserModel.findFirst({
      where: (m, { eq }) => eq(m.id, userId),
      columns: { banned: true, bannedTill: true },
    });

    if (userStatus?.banned) {
      return res.status(403).json({
        success: false,
        message: "Your account has been banned. You cannot make purchases.",
        reason: "banned",
      });
    }

    if (userStatus?.bannedTill && userStatus.bannedTill > new Date()) {
      return res.status(403).json({
        success: false,
        message: `Your account is suspended until ${userStatus.bannedTill.toUTCString()}. You cannot make purchases.`,
        reason: "suspended",
        bannedTill: userStatus.bannedTill,
      });
    }

    const { proxyIds } = z
      .object({ proxyIds: z.array(z.string()).min(1) })
      .parse(req.body);

    const cartItems = await db.query.Socks5ProxyCartModel.findMany({
      where: (m, { and, eq, inArray }) =>
        and(eq(m.userId, userId), inArray(m.proxyId, proxyIds)),
    });

    if (cartItems.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No matching cart items found." });
    }

    const totalCost = cartItems.reduce((sum, i) => sum + i.price, 0);

    const USE_MOCK = process.env.MOCK_SERVICES === "true";

    type ProxyData = {
      ip: string;
      port: string;
      auth: string;
      country: string;
      state: string;
      city: string;
      zip: string;
      type: string;
      nsocksHistoryId?: string;
    };

    let proxyDataList: ProxyData[];

    if (USE_MOCK) {
      proxyDataList = cartItems.map((item, i) => ({
        ip: `192.168.0.${i + 1}`,
        port: "1080",
        auth: `user_${userId}:${randomBytes(8).toString("hex")}`,
        country: "US",
        state: "New York",
        city: "New York City",
        zip: "10001",
        type: "ISP",
      }));
    } else {
      const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
      if (!apiKey) {
        return res.status(503).json({
          success: false,
          message: "Proxy provider not configured. Contact admin.",
        });
      }

      try {
        const nsocksResults = await Promise.all(
          cartItems.map((item) => nsocksBuyProxy(apiKey, item.proxyId))
        );
        proxyDataList = nsocksResults.map((r) => ({
          ip: r.ip,
          port: r.port,
          auth: r.auth,
          country: r.country || r.countryCode,
          state: r.state,
          city: r.city,
          zip: r.zip,
          type: r.type,
          nsocksHistoryId: r.historyId,
        }));
      } catch (nsocksErr) {
        console.error("[rentProxy] NSocks buy failed:", nsocksErr);
        return res.status(502).json({
          success: false,
          message: "Failed to purchase from proxy provider. Please try again.",
        });
      }
    }

    async function generateUniquePort(tx: typeof db): Promise<string> {
      for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = String(Math.floor(Math.random() * 9000) + 1000);
        const existing = await (tx as any).query.Socks5ProxyTransactionModel.findFirst({
          where: (m: any, { eq }: any) => eq(m.port, candidate),
          columns: { id: true },
        });
        if (!existing) return candidate;
      }
      return randomBytes(2).readUInt16BE(0).toString();
    }

    const transactions = await db.transaction(async (tx) => {
      const balance = await getBalance(userId, tx);
      if (balance < totalCost) {
        await tx.rollback();
        return null;
      }

      const ports = await Promise.all(
        cartItems.map(() => generateUniquePort(tx as any))
      );

      const rows = await tx
        .insert(Socks5ProxyTransactionModel)
        .values(
          cartItems.map((item, i) => {
            const pd = proxyDataList[i];
            const noteValue = pd.nsocksHistoryId
              ? `nsocks_history_id:${pd.nsocksHistoryId}`
              : null;
            return {
              userId,
              port: ports[i],
              note: noteValue,
              originalPrice: item.originalPrice,
              price: item.price,
              country: pd.country,
              ip: pd.port ? `${pd.ip}:${pd.port}` : pd.ip,
              state: pd.state,
              city: pd.city,
              zip: pd.zip,
              type: pd.type,
              auth: pd.auth,
            };
          })
        )
        .returning();

      const rentedProxyIds = cartItems.map((item) => item.proxyId);
      await tx
        .delete(Socks5ProxyCartModel)
        .where(
          and(
            eq(Socks5ProxyCartModel.userId, userId),
            inArray(Socks5ProxyCartModel.proxyId, rentedProxyIds)
          )
        );

      return rows;
    });

    if (!transactions) {
      return res
        .status(402)
        .json({ success: false, message: "Insufficient balance." });
    }

    await createNotification({
      userId,
      type: "proxy_rent",
      title: "Proxy Rented Successfully",
      message: `You have rented ${transactions.length} proxy${
        transactions.length > 1 ? "s" : ""
      } for $${totalCost.toFixed(2)}.`,
    });

    return res.status(201).json({
      success: true,
      message: "Proxy rented successfully.",
      transactions,
    });
  } catch (err) {
    console.error("[rentProxy]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/proxy/my-rentals
// ─────────────────────────────────────────────────────────────────────────────
export async function getMyRentals(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;

    const { page, limit } = z
      .object({
        page: z.coerce.number().int().min(1).catch(1),
        limit: z.coerce.number().int().min(1).max(100).catch(20),
      })
      .parse(req.query);

    const offset = (page - 1) * limit;

    const [rentals, countRows] = await Promise.all([
      db.query.Socks5ProxyTransactionModel.findMany({
        where: (m, { eq }) => eq(m.userId, userId),
        orderBy: [desc(Socks5ProxyTransactionModel.createdAt)],
        limit,
        offset,
      }),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(Socks5ProxyTransactionModel)
        .where(eq(Socks5ProxyTransactionModel.userId, userId))
        .then((r) => r.at(0)?.c ?? 0),
    ]);

    const total = countRows as number;

    // NSocks history থেকে real-time online status আনো
    let nsocksHistoryMap: Record<string, { online: number; minsLeft: string }> = {};
    try {
      const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
      if (apiKey) {
        const historyData = await nsocksGetHistory(apiKey, { paid: 1, count: 100 });
        for (const h of historyData.proxies) {
          nsocksHistoryMap[h.historyId] = {
            online:   h.online,
            minsLeft: h.minsLeft,
          };
        }
      }
    } catch {
      // NSocks history না আসলে DB data দিয়ে চলবে — silent fallback
    }

    // rentals-এ nsocksOnline ও nsocksMinsLeft যোগ করো
    const enriched = rentals.map((r) => {
      const noteMatch = r.note?.match(/nsocks_history_id:(\d+)/);
      const historyId = noteMatch?.[1];
      const nsocksStatus = historyId ? nsocksHistoryMap[historyId] : null;
      return {
        ...r,
        nsocksOnline:   nsocksStatus ? nsocksStatus.online   : null,  // 1=online, 0=offline, null=unknown
        nsocksMinsLeft: nsocksStatus ? nsocksStatus.minsLeft : null,
      };
    });

    return res.json({
      success: true,
      rentals: enriched,
      total,
      totalPage: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[getMyRentals]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/proxy/auth
// ─────────────────────────────────────────────────────────────────────────────
export async function getProxyAuth(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;

    const user = await db.query.UserModel.findFirst({
      where: (m, { eq }) => eq(m.id, userId),
      columns: { username: true },
    });

    await db
      .insert(Socks5AuthModel)
      .values({
        userId,
        username: `${user!.username}_proxy`,
        password: randomBytes(10).toString("hex"),
      })
      .onConflictDoNothing({ target: Socks5AuthModel.userId });

    const auth = await db.query.Socks5AuthModel.findFirst({
      where: (m, { eq }) => eq(m.userId, userId),
    });

    return res.json({ success: true, auth });
  } catch (err) {
    console.error("[getProxyAuth]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/proxy/auth
// ─────────────────────────────────────────────────────────────────────────────
export async function updateProxyAuth(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;

    const { username, password } = z
      .object({
        username: z.string().min(3, "Username must be at least 3 characters").max(50),
        password: z.string().min(6, "Password must be at least 6 characters").max(100),
      })
      .parse(req.body);

    const user = await db.query.UserModel.findFirst({
      where: (m, { eq }) => eq(m.id, userId),
      columns: { username: true },
    });

    await db
      .insert(Socks5AuthModel)
      .values({
        userId,
        username: `${user!.username}_proxy`,
        password: randomBytes(10).toString("hex"),
      })
      .onConflictDoNothing({ target: Socks5AuthModel.userId });

    const [updated] = await db
      .update(Socks5AuthModel)
      .set({ username, password })
      .where(eq(Socks5AuthModel.userId, userId))
      .returning();

    return res.json({ success: true, auth: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: err.errors[0]?.message || "Invalid input.",
      });
    }
    console.error("[updateProxyAuth]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/proxy/swap-port
// ─────────────────────────────────────────────────────────────────────────────
export async function swapPort(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;

    const { currentPort, newPort } = z
      .object({
        currentPort: z.string().min(1),
        newPort: z.string().min(1),
      })
      .parse(req.body);

    const transaction = await db.query.Socks5ProxyTransactionModel.findFirst({
      where: (m, { and, eq }) =>
        and(eq(m.userId, userId), eq(m.port, currentPort)),
    });

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Port not found in your rentals." });
    }

    const portConflict = await db.query.Socks5ProxyTransactionModel.findFirst({
      where: (m, { and, eq, ne }) =>
        and(eq(m.port, newPort), ne(m.userId, userId)),
      columns: { id: true },
    });

    if (portConflict) {
      return res.status(409).json({
        success: false,
        message: "Port is already in use by another user.",
      });
    }

    await db
      .update(Socks5ProxyTransactionModel)
      .set({ port: newPort })
      .where(
        and(
          eq(Socks5ProxyTransactionModel.userId, userId),
          eq(Socks5ProxyTransactionModel.port, currentPort)
        )
      );

    return res.json({
      success: true,
      message: `Port swapped from ${currentPort} to ${newPort}.`,
    });
  } catch (err) {
    console.error("[swapPort]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/proxy/renew
// ─────────────────────────────────────────────────────────────────────────────
export async function renewProxy(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;

    const { rentalId } = z
      .object({ rentalId: z.number().int().positive() })
      .parse(req.body);

    const existing = await db.query.Socks5ProxyTransactionModel.findFirst({
      where: (m, { and, eq }) =>
        and(eq(m.id, rentalId), eq(m.userId, userId)),
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Rental not found." });
    }

    const USE_MOCK = process.env.MOCK_SERVICES === "true";

    let nsocksRenewResult: { message: string; balance: number; traffic: number } | null = null;

    if (!USE_MOCK) {
      const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
      if (!apiKey) {
        return res.status(503).json({
          success: false,
          message: "Proxy provider not configured. Contact admin.",
        });
      }

      const noteMatch = existing.note?.match(/nsocks_history_id:(\d+)/);
      if (noteMatch) {
        const historyId = parseInt(noteMatch[1], 10);
        try {
          nsocksRenewResult = await nsocksRenewTraffic(apiKey, historyId);
        } catch (nsocksErr) {
          console.error("[renewProxy] NSocks renewtraffic failed:", nsocksErr);
          return res.status(502).json({
            success: false,
            message: "Failed to renew traffic at proxy provider. Please try again.",
          });
        }
      }
    }

    const renewed = await db.transaction(async (tx) => {
      const balance = await getBalance(userId, tx);
      if (balance < existing.price) {
        await tx.rollback();
        return null;
      }

      const [row] = await tx
        .insert(Socks5ProxyTransactionModel)
        .values({
          userId,
          port: existing.port,
          note: existing.note,
          originalPrice: existing.originalPrice,
          price: existing.price,
          country: existing.country,
          ip: existing.ip,
          state: existing.state,
          city: existing.city,
          zip: existing.zip,
          type: existing.type,
          auth: existing.auth,
        })
        .returning();

      return row;
    });

    if (!renewed) {
      return res
        .status(402)
        .json({ success: false, message: "Insufficient balance." });
    }

    return res.status(201).json({
      success: true,
      message: "Proxy renewed successfully.",
      transaction: renewed,
      ...(nsocksRenewResult && { nsocksTrafficAdded: nsocksRenewResult.traffic }),
    });
  } catch (err) {
    console.error("[renewProxy]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/proxy/all
// ─────────────────────────────────────────────────────────────────────────────
export async function adminGetAllProxies(req: Request, res: Response) {
  try {
    const { page, limit, userId } = z
      .object({
        page: z.coerce.number().int().min(1).catch(1),
        limit: z.coerce.number().int().min(1).max(100).catch(20),
        userId: z.coerce.number().int().positive().optional(),
      })
      .parse(req.query);

    const offset = (page - 1) * limit;

    const where = userId
      ? (m: any, { eq }: any) => eq(m.userId, userId)
      : undefined;

    const [all, countRows] = await Promise.all([
      db.query.Socks5ProxyTransactionModel.findMany({
        where,
        orderBy: [desc(Socks5ProxyTransactionModel.createdAt)],
        limit,
        offset,
      }),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(Socks5ProxyTransactionModel)
        .where(userId ? eq(Socks5ProxyTransactionModel.userId, userId) : undefined)
        .then((r) => r.at(0)?.c ?? 0),
    ]);

    const userIds = [...new Set(all.map((t) => t.userId))];
    const users = userIds.length
      ? await db.query.UserModel.findMany({
          where: (m, { inArray }) => inArray(m.id, userIds),
          columns: { id: true, username: true, email: true },
        })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const withUser = all.map((t) => ({ ...t, user: userMap[t.userId] || null }));
    const total = countRows as number;

    return res.json({
      success: true,
      transactions: withUser,
      total,
      totalPage: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[adminGetAllProxies]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/proxy/ips
// ─────────────────────────────────────────────────────────────────────────────
export async function adminGetProxyIPs(req: Request, res: Response) {
  try {
    const {
      country, ip, zip, domain, type, state, city, isp,
      added, area, rotating, discountFilter,
      excludeUsed, excludeBlacks, highSpeed, udp, sort,
      page, limit,
    } = z
      .object({
        country:        z.string().optional(),
        ip:             z.string().optional(),
        zip:            z.string().optional(),
        domain:         z.string().optional(),
        type:           z.string().optional(),
        state:          z.string().optional(),
        city:           z.string().optional(),
        isp:            z.string().optional(),
        added:          z.coerce.number().int().optional(),
        area:           z.coerce.number().int().refine((v) => [25, 50, 100].includes(v)).optional() as unknown as z.ZodOptional<z.ZodLiteral<25 | 50 | 100>>,
        rotating:       z.coerce.number().int().min(1).max(2).optional() as unknown as z.ZodOptional<z.ZodLiteral<1 | 2>>,
        discountFilter: z.coerce.boolean().optional(),
        excludeUsed:    z.coerce.boolean().optional(),
        excludeBlacks:  z.coerce.boolean().optional(),
        highSpeed:      z.coerce.boolean().optional(),
        udp:            z.coerce.boolean().optional(),
        sort:           z.string().optional(),
        page:           z.coerce.number().int().min(1).catch(1),
        limit:          z.coerce.number().int().min(1).max(100).catch(20),
      })
      .parse(req.query);

    const USE_MOCK = process.env.MOCK_SERVICES === "true";

    if (USE_MOCK) {
      const resolvedCountry = country || "US";
      const resolvedState = state || "New York";
      const mockIPs = Array.from({ length: 100 }, (_, i) => ({
        id: `ip-${i + 1}`,
        ip: `10.0.${Math.floor(i / 10)}.${i % 10 + 1}`,
        domain: `proxy${i + 1}.mock.example.com`,
        countryCode: resolvedCountry,
        country: resolvedCountry,
        state: resolvedState,
        city: city || "New York City",
        isp: isp || "T-Mobile",
        zip: zip || "10001",
        speed: "50Mbps",
        ping: Math.floor(Math.random() * 100) + 10,
        type: type || "ISP",
        added: new Date().toISOString(),
        org: "T-Mobile USA",
        zone: "EST",
        dns: "8.8.8.8",
        blacklisted: Math.random() > 0.9,
        usage: "0/100GB",
        connectionString: `socks5://user:pass@10.0.0.${i + 1}:1080`,
        price: parseFloat((Math.random() * 5 + 1).toFixed(2)),
        originalPrice: parseFloat((Math.random() * 4 + 1).toFixed(2)),
      }));

      const offset = (page - 1) * limit;
      const filtered = mockIPs.slice(offset, offset + limit);

      return res.json({
        success: true,
        proxies: filtered,
        total: mockIPs.length,
        totalPage: Math.ceil(mockIPs.length / limit),
      });
    }

    const [apiKey, commissionPct] = await Promise.all([
      SiteOptions.socks5ProxyAPIKey.get(),
      SiteOptions.transactionCut.Socks5Proxy.get(),
    ]);

    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: "Proxy provider API key not configured.",
      });
    }

    const data = await nsocksFetchList(apiKey, {
      country, ip, zip, domain, type, state, city, isp,
      added, area, rotating, discountFilter,
      excludeUsed, excludeBlacks, highSpeed, udp, sort,
      page, limit,
    });

    const proxiesWithMarkup = data.proxies.map((p) => ({
      ...p,
      originalPrice: p.price,
      price: commissionPct > 0
        ? parseFloat((p.price * (1 + commissionPct / 100)).toFixed(4))
        : p.price,
    }));

    return res.json({
      success: true,
      proxies: proxiesWithMarkup,
      total: data.total,
      totalPage: data.totalPage,
    });
  } catch (err) {
    console.error("[adminGetProxyIPs]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/proxy/states
// ─────────────────────────────────────────────────────────────────────────────
export async function getProxyStates(req: Request, res: Response) {
  try {
    const USE_MOCK = process.env.MOCK_SERVICES === "true";

    if (USE_MOCK) {
      return res.json({
        success: true,
        states: [
          { state: "AK", count: 42 }, { state: "AL", count: 279 },
          { state: "AR", count: 309 }, { state: "AZ", count: 401 },
          { state: "CA", count: 3132 }, { state: "CO", count: 286 },
          { state: "CT", count: 254 }, { state: "DC", count: 79 },
          { state: "DE", count: 82 }, { state: "FL", count: 1716 },
          { state: "GA", count: 671 }, { state: "HI", count: 75 },
          { state: "IA", count: 183 }, { state: "ID", count: 82 },
          { state: "IL", count: 754 }, { state: "IN", count: 337 },
          { state: "KS", count: 85 }, { state: "KY", count: 317 },
          { state: "LA", count: 271 }, { state: "MA", count: 467 },
          { state: "MD", count: 449 }, { state: "ME", count: 67 },
          { state: "MI", count: 652 }, { state: "MN", count: 368 },
          { state: "MO", count: 257 }, { state: "MS", count: 213 },
          { state: "MT", count: 39 }, { state: "NC", count: 725 },
          { state: "ND", count: 47 }, { state: "NE", count: 95 },
          { state: "NH", count: 90 }, { state: "NJ", count: 740 },
          { state: "NM", count: 74 }, { state: "NV", count: 207 },
          { state: "NY", count: 1745 }, { state: "OH", count: 690 },
          { state: "OK", count: 153 }, { state: "OR", count: 218 },
          { state: "PA", count: 846 }, { state: "RI", count: 66 },
          { state: "SC", count: 821 }, { state: "SD", count: 82 },
          { state: "TN", count: 406 }, { state: "TX", count: 1896 },
          { state: "UT", count: 107 }, { state: "VA", count: 576 },
          { state: "VT", count: 14 }, { state: "WA", count: 394 },
          { state: "WI", count: 359 }, { state: "WV", count: 96 },
          { state: "WY", count: 38 },
        ],
      });
    }

    const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: "Proxy provider not configured. Contact admin.",
      });
    }

    const states = await nsocksGetStates(apiKey);
    return res.json({ success: true, states });
  } catch (err) {
    console.error("[getProxyStates]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/proxy/countries
// ─────────────────────────────────────────────────────────────────────────────
export async function getProxyCountries(req: Request, res: Response) {
  try {
    const { country } = z
      .object({ country: z.string().optional() })
      .parse(req.query);

    const USE_MOCK = process.env.MOCK_SERVICES === "true";

    if (USE_MOCK) {
      return res.json({
        success: true,
        countries: [
          { ct: "US", online: 21907 }, { ct: "GB", online: 1842 },
          { ct: "DE", online: 2103 }, { ct: "CA", online: 2758 },
          { ct: "FR", online: 1567 }, { ct: "AU", online: 1102 },
          { ct: "JP", online: 892 }, { ct: "NL", online: 891 },
        ],
      });
    }

    const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: "Proxy provider not configured. Contact admin.",
      });
    }

    const countries = await nsocksGetCountries(apiKey, country);
    return res.json({ success: true, countries });
  } catch (err) {
    console.error("[getProxyCountries]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/proxy/nsocks-history
// ─────────────────────────────────────────────────────────────────────────────
export async function getNsocksHistory(req: Request, res: Response) {
  try {
    const { ip, port, country, state, city, zip, isp, type, online, paid, comment, page, count } = z
      .object({
        ip:      z.string().optional(),
        port:    z.string().optional(),
        country: z.string().optional(),
        state:   z.string().optional(),
        city:    z.string().optional(),
        zip:     z.string().optional(),
        isp:     z.string().optional(),
        type:    z.string().optional(),
        online:  z.coerce.number().int().min(0).max(1).optional() as unknown as z.ZodOptional<z.ZodLiteral<0 | 1>>,
        paid:    z.coerce.number().int().min(0).max(1).optional() as unknown as z.ZodOptional<z.ZodLiteral<0 | 1>>,
        comment: z.string().optional(),
        page:    z.coerce.number().int().min(1).catch(1),
        count:   z.coerce.number().int().min(1).max(100).catch(20),
      })
      .parse(req.query);

    const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: "Proxy provider not configured. Contact admin.",
      });
    }

    const data = await nsocksGetHistory(apiKey, {
      ip, port, country, state, city, zip, isp, type,
      online: online as 0 | 1 | undefined,
      paid:   paid   as 0 | 1 | undefined,
      comment, page, count,
    });

    return res.json({ success: true, ...data });
  } catch (err) {
    console.error("[getNsocksHistory]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/proxy/nsocks-refund
// ─────────────────────────────────────────────────────────────────────────────
export async function nsocksRefundProxy(req: Request, res: Response) {
  try {
    const { historyId } = z
      .object({ historyId: z.number().int().positive() })
      .parse(req.body);

    const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: "Proxy provider not configured. Contact admin.",
      });
    }

    const result = await nsocksRefund(apiKey, historyId);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("[nsocksRefundProxy]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/proxy/nsocks-renew-traffic
// ─────────────────────────────────────────────────────────────────────────────
export async function nsocksRenewProxyTraffic(req: Request, res: Response) {
  try {
    const { historyId } = z
      .object({ historyId: z.number().int().positive() })
      .parse(req.body);

    const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: "Proxy provider not configured. Contact admin.",
      });
    }

    const result = await nsocksRenewTraffic(apiKey, historyId);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("[nsocksRenewProxyTraffic]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/proxy/nsocks-autorenew
// ─────────────────────────────────────────────────────────────────────────────
export async function nsocksToggleAutoRenew(req: Request, res: Response) {
  try {
    const { historyId, enable } = z
      .object({
        historyId: z.number().int().positive(),
        enable: z.boolean(),
      })
      .parse(req.body);

    const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: "Proxy provider not configured. Contact admin.",
      });
    }

    const result = await nsocksSetAutoRenew(apiKey, historyId, enable);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("[nsocksToggleAutoRenew]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/proxy/nsocks-balance
// ─────────────────────────────────────────────────────────────────────────────
export async function adminGetNsocksBalance(req: Request, res: Response) {
  try {
    const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: "Proxy provider not configured. Contact admin.",
      });
    }

    const balance = await nsocksGetBalance(apiKey);
    return res.json({ success: true, balance });
  } catch (err) {
    console.error("[adminGetNsocksBalance]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/proxy/nsocks-proxy/:id
// ─────────────────────────────────────────────────────────────────────────────
export async function adminGetNsocksProxy(req: Request, res: Response) {
  try {
    const proxyId = z.string().min(1).parse(req.params.id);

    const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: "Proxy provider not configured. Contact admin.",
      });
    }

    const proxy = await nsocksGetProxy(apiKey, proxyId);
    if (!proxy) {
      return res.status(404).json({ success: false, message: "Proxy not found." });
    }

    return res.json({ success: true, proxy });
  } catch (err) {
    console.error("[adminGetNsocksProxy]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/proxy/check-risk
// ─────────────────────────────────────────────────────────────────────────────
export async function checkProxyRiskScore(req: Request, res: Response) {
  try {
    const { service, proxyId, ip } = z
      .object({
        service:  z.enum(["scl", "ipq"]),
        proxyId:  z.string().optional(),
        ip:       z.string().optional(),
      })
      .refine((d) => d.proxyId || d.ip, {
        message: "proxyId or ip is required",
      })
      .parse(req.body);

    const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: "Proxy provider not configured. Contact admin.",
      });
    }

    const params = proxyId
      ? ({ service, proxyId } as { service: "scl" | "ipq"; proxyId: string })
      : ({ service, ip: ip! } as { service: "scl" | "ipq"; ip: string });

    const result = await nsocksCheckRiskScore(apiKey, params);
    return res.json({ success: true, result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: err.errors[0]?.message || "Invalid input." });
    }
    console.error("[checkProxyRiskScore]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/proxy/check-blacks
// ─────────────────────────────────────────────────────────────────────────────
export async function checkProxyBlacklists(req: Request, res: Response) {
  try {
    const { proxyId } = z
      .object({ proxyId: z.string().min(1) })
      .parse(req.body);

    const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: "Proxy provider not configured. Contact admin.",
      });
    }

    const result = await nsocksCheckBlacks(apiKey, proxyId);
    const entries   = Object.entries(result);
    const blacklisted = entries.filter(([, v]) => v === "Yes").map(([k]) => k);
    const clean       = entries.length - blacklisted.length;

    return res.json({
      success: true,
      result,
      summary: {
        total:      entries.length,
        clean,
        blacklisted: blacklisted.length,
        blacklistedOn: blacklisted,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: err.errors[0]?.message || "Invalid input." });
    }
    console.error("[checkProxyBlacklists]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin wrappers
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/proxy/nsocks-history
export async function adminGetNsocksHistory(req: Request, res: Response) {
  try {
    const { ip, port, country, state, city, zip, isp, type, online, paid, comment, page, count } = z
      .object({
        ip:      z.string().optional(),
        port:    z.string().optional(),
        country: z.string().optional(),
        state:   z.string().optional(),
        city:    z.string().optional(),
        zip:     z.string().optional(),
        isp:     z.string().optional(),
        type:    z.string().optional(),
        online:  z.coerce.number().int().min(0).max(1).optional() as unknown as z.ZodOptional<z.ZodLiteral<0 | 1>>,
        paid:    z.coerce.number().int().min(0).max(1).optional() as unknown as z.ZodOptional<z.ZodLiteral<0 | 1>>,
        comment: z.string().optional(),
        page:    z.coerce.number().int().min(1).catch(1),
        count:   z.coerce.number().int().min(1).max(100).catch(50),
      })
      .parse(req.query);

    const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
    if (!apiKey) {
      return res.status(503).json({ success: false, message: "Proxy provider not configured." });
    }

    const data = await nsocksGetHistory(apiKey, {
      ip, port, country, state, city, zip, isp, type,
      online: online as 0 | 1 | undefined,
      paid:   paid   as 0 | 1 | undefined,
      comment, page, count,
    });

    return res.json({ success: true, ...data });
  } catch (err) {
    console.error("[adminGetNsocksHistory]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// POST /api/admin/proxy/nsocks-refund
export async function adminNsocksRefundProxy(req: Request, res: Response) {
  try {
    const { historyId } = z
      .object({ historyId: z.number().int().positive() })
      .parse(req.body);

    const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
    if (!apiKey) {
      return res.status(503).json({ success: false, message: "Proxy provider not configured." });
    }

    const result = await nsocksRefund(apiKey, historyId);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("[adminNsocksRefundProxy]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// POST /api/admin/proxy/nsocks-renew-traffic
export async function adminNsocksRenewProxyTraffic(req: Request, res: Response) {
  try {
    const { historyId } = z
      .object({ historyId: z.number().int().positive() })
      .parse(req.body);

    const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
    if (!apiKey) {
      return res.status(503).json({ success: false, message: "Proxy provider not configured." });
    }

    const result = await nsocksRenewTraffic(apiKey, historyId);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("[adminNsocksRenewProxyTraffic]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// POST /api/admin/proxy/nsocks-autorenew
export async function adminNsocksToggleAutoRenew(req: Request, res: Response) {
  try {
    const { historyId, enable } = z
      .object({
        historyId: z.number().int().positive(),
        enable:    z.boolean(),
      })
      .parse(req.body);

    const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
    if (!apiKey) {
      return res.status(503).json({ success: false, message: "Proxy provider not configured." });
    }

    const result = await nsocksSetAutoRenew(apiKey, historyId, enable);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("[adminNsocksToggleAutoRenew]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// POST /api/admin/proxy/check-risk
export async function adminCheckProxyRiskScore(req: Request, res: Response) {
  try {
    const { service, proxyId, ip } = z
      .object({
        service:  z.enum(["scl", "ipq"]),
        proxyId:  z.string().optional(),
        ip:       z.string().optional(),
      })
      .refine((d) => d.proxyId || d.ip, { message: "proxyId or ip is required" })
      .parse(req.body);

    const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
    if (!apiKey) {
      return res.status(503).json({ success: false, message: "Proxy provider not configured." });
    }

    const params = proxyId
      ? ({ service, proxyId } as { service: "scl" | "ipq"; proxyId: string })
      : ({ service, ip: ip! } as { service: "scl" | "ipq"; ip: string });

    const result = await nsocksCheckRiskScore(apiKey, params);
    return res.json({ success: true, result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: err.errors[0]?.message || "Invalid input." });
    }
    console.error("[adminCheckProxyRiskScore]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// POST /api/admin/proxy/check-blacks
export async function adminCheckProxyBlacklists(req: Request, res: Response) {
  try {
    const { proxyId } = z.object({ proxyId: z.string().min(1) }).parse(req.body);

    const apiKey = await SiteOptions.socks5ProxyAPIKey.get();
    if (!apiKey) {
      return res.status(503).json({ success: false, message: "Proxy provider not configured." });
    }

    const result = await nsocksCheckBlacks(apiKey, proxyId);
    const entries     = Object.entries(result);
    const blacklisted = entries.filter(([, v]) => v === "Yes").map(([k]) => k);
    const clean       = entries.length - blacklisted.length;

    return res.json({
      success: true,
      result,
      summary: {
        total:       entries.length,
        clean,
        blacklisted: blacklisted.length,
        blacklistedOn: blacklisted,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: err.errors[0]?.message || "Invalid input." });
    }
    console.error("[adminCheckProxyBlacklists]", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}