import { Request, Response } from "express";
import db from "@/db";
import { AddedFundModel, UserModel } from "@/db/schema";
import UnloggingError from "@/utils/unlogging-error";
import pusher from "@/utils/pusher";
import { timingSafeEqual } from "crypto";
import SiteOptions from "@/utils/site-options";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { paymentExpireTime, nowPaymentsApiUrl } from "@/utils/constants";
import { createNotification } from "@/controllers/notification.controller";

// GET /api/topup/last-funds
export async function getLastFunds(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;

    const lastFunds = await db.query.AddedFundModel.findMany({
      where: (m, { eq, and, sql }) =>
        and(
          eq(m.userId, userId),
          eq(m.status, "pending"),
          sql`${m.createdAt} + ${paymentExpireTime + " ms"}::interval > now()`
        ),

      orderBy: (m, { desc }) => desc(m.createdAt),

      columns: {
        amount: true,
        currency: true,
        walletAddress: true,
      },
    });

    res.json({
      success: true,
      lastFunds,
    });
  } catch (e) {
    console.error("GET LAST FUNDS ERROR:", e);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}

// GET /api/topup/transactions  (user — নিজের history)
export async function getTopupTransactions(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;

    const transactions = await db
      .select({
        id: AddedFundModel.id,
        date: AddedFundModel.createdAt,
        wallet: AddedFundModel.currency,
        walletAddress: AddedFundModel.walletAddress,
        txnId: AddedFundModel.txid,
        amount: AddedFundModel.amount,

        status: sql<string>`case
          when ${AddedFundModel.status} != 'pending' then ${AddedFundModel.status}
          when ${AddedFundModel.createdAt} + ${paymentExpireTime + " ms"}::interval > now() then 'pending'
          else 'rejected'
        end`,
      })
      .from(AddedFundModel)
      .where(eq(AddedFundModel.userId, userId))
      .orderBy(desc(AddedFundModel.createdAt));

    res.json({
      success: true,
      transactions,
    });
  } catch (e) {
    console.error("GET TRANSACTIONS ERROR:", e);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}

// ── GET /api/topup/admin/transactions  (admin — সব users এর transactions) ──
export async function getAdminTransactions(req: Request, res: Response) {
  try {
    const { page, limit, status, userId } = z.object({
      page:   z.coerce.number().int().min(1).catch(1),
      limit:  z.coerce.number().int().min(1).max(100).catch(20),
      status: z.enum(["pending", "approved", "rejected", "all"]).catch("all"),
      userId: z.coerce.number().int().positive().optional(),
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
          userId: AddedFundModel.userId,
          username: UserModel.username,
          wallet: AddedFundModel.currency,
          walletAddress: AddedFundModel.walletAddress,
          txnId: AddedFundModel.txid,
          amount: AddedFundModel.amount,
          status: AddedFundModel.status,
          method: AddedFundModel.method,
          manuallyUploaded: AddedFundModel.manualyUploaded,
        })
        .from(AddedFundModel)
        .leftJoin(UserModel, eq(AddedFundModel.userId, UserModel.id))
        .where(where)
        .orderBy(desc(AddedFundModel.createdAt))
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
      total: totalRows,
      totalPage: Math.ceil(totalRows / limit),
    });
  } catch (e) {
    console.error("GET ADMIN TRANSACTIONS ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ── POST /api/topup/admin/transactions  (manual transaction create) ────────
export async function createAdminTransaction(req: Request, res: Response) {
  try {
    const { userId, amount, currency, walletAddress, txid, status } = z
      .object({
        userId: z.number().int().positive(),
        amount: z.number().positive(),
        currency: z.string().min(1),
        walletAddress: z.string().min(1),
        txid: z.string().optional(),
        status: z.enum(["pending", "approved", "rejected"]).default("approved"),
      })
      .parse(req.body);

    const [newTx] = await db
      .insert(AddedFundModel)
      .values({
        userId,
        amount,
        currency,
        walletAddress,
        txid: txid ?? null,
        status,
        method: "now_payments",
        manualyUploaded: true,
      })
      .returning();

    await Promise.all([
      pusher({ page: "/admin-panel/transactions", to: "admin" }),
      pusher({ page: "/admin-area/dashboard/fund/info/pending", to: "admin" }),
      pusher({ page: "/top-up/transactions", to: `user-${userId}` }),
    ]);

    res.json({ success: true, transaction: newTx });
  } catch (e) {
    console.error("CREATE ADMIN TRANSACTION ERROR:", e);

    if (e instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: e.errors[0].message });
    }

    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ── PUT /api/topup/admin/transactions/:id  (transaction edit) ──────────────
export async function updateAdminTransaction(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid transaction ID." });
    }

    const { amount, currency, walletAddress, txid, status } = z
      .object({
        amount: z.number().positive().optional(),
        currency: z.string().min(1).optional(),
        walletAddress: z.string().min(1).optional(),
        txid: z.string().nullable().optional(),
        status: z.enum(["pending", "approved", "rejected"]).optional(),
      })
      .parse(req.body);

    const updateData: Partial<typeof AddedFundModel.$inferInsert> = {};
    if (amount !== undefined) updateData.amount = amount;
    if (currency !== undefined) updateData.currency = currency;
    if (walletAddress !== undefined) updateData.walletAddress = walletAddress;
    if (txid !== undefined) updateData.txid = txid;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update." });
    }

    const [updated] = await db
      .update(AddedFundModel)
      .set(updateData)
      .where(eq(AddedFundModel.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }

    if (status === "approved") {
      const notifTitle   = "Top-Up Approved";
      const notifMessage = `Your deposit of $${updated.amount.toFixed(2)} has been approved.`;
      await createNotification({
        userId:  updated.userId,
        type:    "topup_approved",
        title:   notifTitle,
        message: notifMessage,
      });
      // Bell badge real-time update — user channel এ notification action fire করো
      await pusher({
        page:    "/notifications",
        to:      `user-${updated.userId}`,
        payload: { action: "notification", title: notifTitle, message: notifMessage },
      });
    }

    res.json({ success: true, transaction: updated });
  } catch (e) {
    console.error("UPDATE TRANSACTION ERROR:", e);

    if (e instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: e.errors[0].message });
    }

    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ── DELETE /api/topup/admin/transactions/:id  (transaction delete) ─────────
export async function deleteAdminTransaction(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid transaction ID." });
    }

    const [deleted] = await db
      .delete(AddedFundModel)
      .where(eq(AddedFundModel.id, id))
      .returning({ id: AddedFundModel.id });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }

    res.json({ success: true, deletedId: deleted.id });
  } catch (e) {
    console.error("DELETE TRANSACTION ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// POST /api/topup/now-payments
export async function generateNowPayments(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;

    const { crypto: cryptoCurrency, amount } = z
      .object({
        crypto: z.string().min(1),
        amount: z.number().positive(),
      })
      .parse(req.body);

    const [apiKey, hostUrl, secret] = await Promise.all([
      SiteOptions.payment.nowPayments.apiKey.get(),
      SiteOptions.hostUrl.get(),
      SiteOptions.payment.nowPayments.callbackSecret.get(),
    ]);

    if (!apiKey) {
      return res.status(400).json({ success: false, message: "NowPayments API key not configured" });
    }

    if (!hostUrl) {
      return res.status(400).json({ success: false, message: "Host URL not configured" });
    }

    const callback = new URL(`${hostUrl}/api/topup/callback`);
    callback.searchParams.append("secret", secret);
    callback.searchParams.append("method", "now-payments");

    const res2: any = await fetch(`${nowPaymentsApiUrl}/payment`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: amount,
        price_currency: "usd",
        pay_currency: cryptoCurrency,
        ipn_callback_url: callback.toString(),
        payout_currency: cryptoCurrency,
        ...(process.env.NODE_ENV === "development" ? { case: "partially_paid" } : {}),
      }),
    }).then((r) => r.json());

    console.log("NowPayments API response:", JSON.stringify(res2));

    if (res2.statusCode && res2.statusCode !== 200) {
      return res.status(400).json({ success: false, message: res2.message ?? "NowPayments API returned an error." });
    }

    if (!res2.pay_address) {
      return res.status(400).json({ success: false, message: "NowPayments did not return a wallet address. Check your API key." });
    }

    await db.insert(AddedFundModel).values({
      amount,
      userId,
      walletAddress: res2.pay_address,
      currency: cryptoCurrency,
      method: "now_payments",
    });

    await Promise.all([
      pusher({ page: "/admin-panel/transactions", to: "admin" }),
      pusher({ page: "/top-up/generate/options", to: `user-${userId}` }),
      pusher({ page: "/top-up/last-fund", to: `user-${userId}` }),
      pusher({ page: "/top-up/transactions", to: `user-${userId}` }),
      pusher({ page: "/admin-area/dashboard/fund/info/pending", to: "admin" }),
      pusher({ page: "/top-up", to: `user-${userId}` }),
    ]);

    res.json({ success: true, payment: res2 });
  } catch (e) {
    console.error("NOW PAYMENTS ERROR:", e);

    if (e instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: e.errors[0].message, field: e.errors[0].path?.[0] });
    }

    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// POST /api/topup/yaan-pay
export async function generateYaanPay(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;

    const { crypto: cryptoCurrency, amount } = z
      .object({
        crypto: z.string().min(1),
        amount: z.number().positive(),
      })
      .parse(req.body);

    if (!process.env.YAANPAY_URL) {
      return res.status(400).json({ success: false, message: "Yaan Pay URL not configured" });
    }

    const [apiKey, yaanSecret, hostUrl] = await Promise.all([
      SiteOptions.payment.yaanPay.apiKey.get(),
      SiteOptions.payment.yaanPay.callbackSecret.get(),
      SiteOptions.hostUrl.get(),
    ]);

    if (!apiKey) {
      return res.status(400).json({ success: false, message: "Yaan Pay API key not configured" });
    }

    if (!hostUrl) {
      return res.status(400).json({ success: false, message: "Host URL not configured" });
    }

    let walletAddress = "";

    await db.transaction(async (tx) => {
      const fundId = await tx
        .insert(AddedFundModel)
        .values({
          amount,
          userId,
          walletAddress: "",
          method: "yaan_pay",
          status: "pending",
          currency: cryptoCurrency,
        })
        .returning({ id: AddedFundModel.id })
        .then((r) => r.at(0)?.id);

      if (!fundId) {
        throw new UnloggingError("Failed to create fund record.");
      }

      const callbackURL = new URL(`${hostUrl}/api/topup/callback`);
      callbackURL.searchParams.set("method", "yaan-pay");
      callbackURL.searchParams.set("secret", yaanSecret);

      const r: any = await fetch(
        `${process.env.YAANPAY_URL}/api/v1/${cryptoCurrency}/payment_request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-YaanPay-Api-Key": apiKey,
          },
          body: JSON.stringify({
            external_id: fundId,
            fiat: "USD",
            amount: amount.toString(),
            callback_url: callbackURL.toString(),
          }),
        }
      ).then((r) => r.json());

      console.log("Yaan Pay API response:", JSON.stringify(r));

      if (r.status !== "success") {
        await tx.rollback();
        throw new UnloggingError(r.message ?? "Yaan Pay API returned an error.");
      }

      walletAddress = r.wallet;

      await tx
        .update(AddedFundModel)
        .set({ walletAddress: r.wallet })
        .where(eq(AddedFundModel.id, fundId));
    });

    await Promise.all([
      pusher({ page: "/top-up/last-fund", to: `user-${userId}` }),
      pusher({ page: "/top-up/transactions", to: `user-${userId}` }),
      pusher({ page: "/admin-area/dashboard/fund/info/pending", to: "admin" }),
    ]);

    res.json({ success: true, walletAddress });
  } catch (e) {
    console.error("YAAN PAY ERROR:", e);

    if (e instanceof UnloggingError) {
      return res.status(400).json({ success: false, message: e.message });
    }

    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// POST /api/topup/blockonomics
export async function generateBlockonomics(req: Request, res: Response) {
  try {
    const userId = req.payload!.id;

    const { crypto: cryptoCurrency, amount } = z
      .object({
        crypto: z.string().min(1),
        amount: z.number().positive(),
      })
      .parse(req.body);

    const [apiKey, blockSecret, hostUrl] = await Promise.all([
      SiteOptions.payment.blockonomics.apiKey.get(),
      SiteOptions.payment.blockonomics.callbackSecret.get(),
      SiteOptions.hostUrl.get(),
    ]);

    if (!apiKey) {
      return res.status(400).json({ success: false, message: "Blockonomics API key not configured" });
    }

    if (!hostUrl) {
      return res.status(400).json({ success: false, message: "Host URL not configured" });
    }

    let walletAddress = "";

    await db.transaction(async (tx) => {
      const fundId = await tx
        .insert(AddedFundModel)
        .values({
          amount,
          userId,
          walletAddress: "",
          method: "blockonomics",
          status: "pending",
          currency: cryptoCurrency,
        })
        .returning({ id: AddedFundModel.id })
        .then((r) => r.at(0)?.id);

      if (!fundId) {
        throw new UnloggingError("Failed to create fund record.");
      }

      const callbackURL = new URL(`${hostUrl}/api/topup/callback`);
      callbackURL.searchParams.set("method", "blockonomics");
      callbackURL.searchParams.set("secret", blockSecret);

      const r: any = await fetch("https://www.blockonomics.co/api/new_address", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callback: callbackURL.toString(),
        }),
      }).then((r) => r.json());

      console.log("Blockonomics API response:", JSON.stringify(r));

      if (!r.address) {
        await tx.rollback();
        throw new UnloggingError(r.message ?? "Blockonomics did not return a wallet address.");
      }

      walletAddress = r.address;

      await tx
        .update(AddedFundModel)
        .set({ walletAddress: r.address })
        .where(eq(AddedFundModel.id, fundId));
    });

    await Promise.all([
      pusher({ page: "/top-up/last-fund", to: `user-${userId}` }),
      pusher({ page: "/top-up/transactions", to: `user-${userId}` }),
      pusher({ page: "/admin-area/dashboard/fund/info/pending", to: "admin" }),
    ]);

    res.json({ success: true, walletAddress });
  } catch (e) {
    console.error("BLOCKONOMICS ERROR:", e);

    if (e instanceof UnloggingError) {
      return res.status(400).json({ success: false, message: e.message });
    }

    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// POST /api/topup/callback
export async function topUpCallback(req: Request, res: Response) {
  try {
    const method = req.query.method as string;
    const incomingSecret = req.query.secret as string;

    function safeCompare(a: string, b: string): boolean {
      try {
        const aBuf = Buffer.from(a);
        const bBuf = Buffer.from(b);
        if (aBuf.length !== bBuf.length) return false;
        return timingSafeEqual(aBuf, bBuf);
      } catch { return false; }
    }

    if (method === "now-payments") {
      const expectedSecret = await SiteOptions.payment.nowPayments.callbackSecret.get();
      if (!expectedSecret || !incomingSecret || !safeCompare(incomingSecret, expectedSecret)) {
        console.warn("CALLBACK: invalid NowPayments secret");
        return res.status(401).json({ success: false, message: "Invalid secret." });
      }

      const ipnSig = req.headers["x-nowpayments-sig"] as string | undefined;
      if (ipnSig) {
        const sortedBody = JSON.stringify(
          Object.keys(req.body).sort().reduce((acc: any, k) => { acc[k] = req.body[k]; return acc; }, {})
        );
        const { createHmac } = await import("crypto");
        const expectedSig = createHmac("sha512", expectedSecret).update(sortedBody).digest("hex");
        if (!safeCompare(ipnSig, expectedSig)) {
          console.warn("CALLBACK: invalid NowPayments IPN signature");
          return res.status(401).json({ success: false, message: "Invalid IPN signature." });
        }
      }
    } else if (method === "yaan-pay") {
      const expectedSecret = await SiteOptions.payment.yaanPay.callbackSecret.get();
      if (!expectedSecret || !incomingSecret || !safeCompare(incomingSecret, expectedSecret)) {
        console.warn("CALLBACK: invalid Yaan Pay secret");
        return res.status(401).json({ success: false, message: "Invalid secret." });
      }
    } else if (method === "blockonomics") {
      const expectedSecret = await SiteOptions.payment.blockonomics.callbackSecret.get();
      if (!expectedSecret || !incomingSecret || !safeCompare(incomingSecret, expectedSecret)) {
        console.warn("CALLBACK: invalid Blockonomics secret");
        return res.status(401).json({ success: false, message: "Invalid secret." });
      }
    } else {
      console.warn("CALLBACK: unknown method:", method);
      return res.status(400).json({ success: false, message: "Unknown payment method." });
    }

    if (method === "now-payments") {
      const { pay_address, payment_status, outcome } = req.body;
      const txid = outcome?.txid ?? req.body.txid ?? null;
      const isConfirmed = ["confirmed", "finished"].includes(payment_status);

      if (pay_address) {
        const updated = await db
          .update(AddedFundModel)
          .set({ txid, status: isConfirmed ? "approved" : "pending" })
          .where(eq(AddedFundModel.walletAddress, pay_address))
          .returning();

        if (isConfirmed && updated.length > 0) {
          const fund = updated[0];
          const notifTitle   = "Top-Up Approved";
          const notifMessage = `Your deposit of $${fund.amount.toFixed(2)} has been approved.`;
          await createNotification({
            userId:  fund.userId,
            type:    "topup_approved",
            title:   notifTitle,
            message: notifMessage,
          });
          await pusher({
            page:    "/notifications",
            to:      `user-${fund.userId}`,
            payload: { action: "notification", title: notifTitle, message: notifMessage },
          });
        }

        console.log(`CALLBACK [now-payments]: ${pay_address} → ${isConfirmed ? "approved" : "pending"}`);
      }
    }

    if (method === "yaan-pay") {
      const { external_id, txid, status } = req.body;
      const fundId = Number(external_id);
      const isConfirmed = status === "success";

      if (!isNaN(fundId) && fundId > 0) {
        const updated = await db
          .update(AddedFundModel)
          .set({ txid: txid ?? null, status: isConfirmed ? "approved" : "pending" })
          .where(eq(AddedFundModel.id, fundId))
          .returning();

        if (isConfirmed && updated.length > 0) {
          const fund = updated[0];
          const notifTitle   = "Top-Up Approved";
          const notifMessage = `Your deposit of $${fund.amount.toFixed(2)} has been approved.`;
          await createNotification({
            userId:  fund.userId,
            type:    "topup_approved",
            title:   notifTitle,
            message: notifMessage,
          });
          await pusher({
            page:    "/notifications",
            to:      `user-${fund.userId}`,
            payload: { action: "notification", title: notifTitle, message: notifMessage },
          });
        }

        console.log(`CALLBACK [yaan-pay]: fund#${fundId} → ${isConfirmed ? "approved" : "pending"}`);
      }
    }

    if (method === "blockonomics") {
      const { addr, txid, status } = req.body;
      const isConfirmed = status === 2 || status === "2";

      if (addr) {
        const updated = await db
          .update(AddedFundModel)
          .set({ txid: txid ?? null, status: isConfirmed ? "approved" : "pending" })
          .where(eq(AddedFundModel.walletAddress, addr))
          .returning();

        if (isConfirmed && updated.length > 0) {
          const fund = updated[0];
          const notifTitle   = "Top-Up Approved";
          const notifMessage = `Your deposit of $${fund.amount.toFixed(2)} has been approved.`;
          await createNotification({
            userId:  fund.userId,
            type:    "topup_approved",
            title:   notifTitle,
            message: notifMessage,
          });
          await pusher({
            page:    "/notifications",
            to:      `user-${fund.userId}`,
            payload: { action: "notification", title: notifTitle, message: notifMessage },
          });
        }

        console.log(`CALLBACK [blockonomics]: ${addr} → ${isConfirmed ? "approved" : "pending"}`);
      }
    }

    res.json({ success: true });
  } catch (e) {
    console.error("CALLBACK ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// POST /api/topup/convert
export async function convertCurrency(req: Request, res: Response) {
  try {
    const { amount, currency } = z
      .object({
        amount: z.coerce.number().min(1),
        currency: z.string().min(1),
      })
      .parse(req.body);

    const currentMethod = await SiteOptions.payment.currentMethod.get();

    if (currentMethod === "yaan-pay" || currentMethod === "blockonomics") {
      return res.json({ success: true, convertedAmount: null });
    }

    const apiKey = await SiteOptions.payment.nowPayments.apiKey.get();

    if (!apiKey) {
      return res.status(400).json({ success: false, message: "NowPayments API key not configured" });
    }

    const r: any = await fetch(
      `${nowPaymentsApiUrl}/estimate?amount=${amount}&currency_from=USD&currency_to=${currency}&is_fixed_rate=False&is_fee_paid_by_user=False`,
      { headers: { "x-api-key": apiKey } }
    ).then((r) => r.json());

    console.log("Convert API response:", JSON.stringify(r));

    res.json({ success: true, convertedAmount: r.estimated_amount ?? null });
  } catch (e) {
    console.error("CONVERT ERROR:", e);

    if (e instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: e.errors[0].message });
    }

    res.status(500).json({ success: false, message: "Internal server error." });
  }
}