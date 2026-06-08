import { Request, Response } from "express";
import db from "@/db";
import { LongTermRentsModel, OneTimeRentModel, UserModel } from "@/db/schema";
import UnloggingError from "@/utils/unlogging-error";
import pusher from "@/utils/pusher";
import SiteOptions from "@/utils/site-options";
import getBalance from "@/utils/get-balance";
import { suspensionCount, timeFormatter } from "@/utils/constants";
import { eq } from "drizzle-orm";
import { z } from "zod";

const apiUrlBase = process.env.NUMBERS_API_URL || "";

function getApiUrl() { return apiUrlBase; }

// ─────────────────────────────────────────────
// GET /api/numbers/services
// ─────────────────────────────────────────────
export async function getServices(_req: Request, res: Response) {
  try {
    // FIX: USE_MOCK এখন env var দিয়ে control হচ্ছে।
    // .env তে MOCK_SERVICES=true রাখলে mock, না রাখলে real API।
    const USE_MOCK = process.env.MOCK_SERVICES === "true";

    if (USE_MOCK) {
      return res.json({
        success: true,
        services: [
          {
            name: "telegram",
            available: 10,
            ltrAvailable: 5,
            price: 1.5,
            ltrShortPrice: 3.0,
            ltrRegularPrice: 8.0,
            ltrUnlimitedPrice: 13.0,
          },
          {
            name: "whatsapp",
            available: 7,
            ltrAvailable: 3,
            price: 2.0,
            ltrShortPrice: 4.0,
            ltrRegularPrice: 10.0,
            ltrUnlimitedPrice: 15.0,
          },
        ],
      });
    }

    // 🔽 original code (unchanged)
    const user = await SiteOptions.apiUser.get();
    const api_key = await SiteOptions.apiKey.get();

    const url = new URL(getApiUrl());
    url.searchParams.set("cmd", "list_services");
    url.searchParams.set("user", user);
    url.searchParams.set("api_key", api_key);

    const r: any = await fetch(url.toString()).then((r) => r.json());
    if (r.status === "error") throw new UnloggingError(r.message);

    const [otrCut, ltrShortCut, ltrRegularCut, ltrUnlimitedCut] =
      await Promise.all([
        SiteOptions.transactionCut.OneTime.get(),
        SiteOptions.transactionCut.LongTerm.short.get(),
        SiteOptions.transactionCut.LongTerm.regular.get(),
        SiteOptions.transactionCut.LongTerm.unlimited.get(),
      ]);

    const services = r.message.map((s: any) => {
      const price = Number(s.price);
      const ltrShortPrice = Number(s.ltr_short_price);
      const ltrRegularPrice = Number(s.ltr_price);
      const ltrUnlimitedPrice = ltrRegularPrice + 5;

      return {
        name: s.name,
        available: Number(s.otp_available),
        ltrAvailable: Number(s.ltr_available),
        price: price + (price * otrCut) / 100,
        ltrShortPrice:
          ltrShortPrice + (ltrShortPrice * ltrShortCut) / 100,
        ltrRegularPrice:
          ltrRegularPrice + (ltrRegularPrice * ltrRegularCut) / 100,
        ltrUnlimitedPrice:
          ltrUnlimitedPrice +
          (ltrUnlimitedPrice * ltrUnlimitedCut) / 100,
      };
    });

    res.json({ success: true, services });
  } catch (e) {
    if (e instanceof UnloggingError) {
      res.status(400).json({ success: false, message: e.message });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}

// ─────────────────────────────────────────────
// POST /api/numbers/rent/otr  ← নতুন
// ─────────────────────────────────────────────
export async function rentOneTime(req: Request, res: Response) {
  try {
    const payload = req.payload!;
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);

    // FIX: USE_MOCK এখন env var দিয়ে control হচ্ছে।
    const USE_MOCK = process.env.MOCK_SERVICES === "true";

    if (USE_MOCK) {
      // fake delay (real feel er jonno optional)
      await new Promise((r) => setTimeout(r, 500));

      return res.json({
        success: true,
        mdn: "+88017" + Math.floor(10000000 + Math.random() * 90000000), // random BD number
        requestId: "mock_" + Date.now(),
      });
    }

    // 🔽 original code (unchanged)
    const result = await db.transaction(async (tx) => {
      await tx
        .select({ id: UserModel.id })
        .from(UserModel)
        .where(eq(UserModel.id, payload.id))
        .for("update");

      await checkForSuspension(payload.id, tx);

      const user = await SiteOptions.apiUser.get();
      const apiKey = await SiteOptions.apiKey.get();

      const price = await getOtrPrice({ user, apiKey, name });
      const balance = await getBalance(payload.id, tx);

      if (balance < price)
        throw new UnloggingError("Not enough balance.");

      return await doRentOtr({
        user,
        apiKey,
        name,
        price,
        userId: payload.id,
        tx,
      });
    });

    await Promise.all([
      pusher({ page: "/tools/rent/history", to: `user-${payload.id}` }),
      pusher({ page: "/header/balance", to: `user-${payload.id}` }),
      pusher({
        page: "/admin-area/dashboard/services/info/otr",
        to: "admin",
      }),
    ]);

    res.json({
      success: true,
      mdn: result.mdn,
      requestId: result.requestId,
    });
  } catch (e) {
    if (e instanceof UnloggingError) {
      res.status(400).json({ success: false, message: e.message });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}

// ─────────────────────────────────────────────
// POST /api/numbers/rent/ltr
// ─────────────────────────────────────────────
export async function rentLongTerm(req: Request, res: Response) {
  try {
    const payload = req.payload!;
    const { name, rentType } = z.object({ name: z.string().min(1), rentType: z.enum(["short", "regular", "unlimited"]) }).parse(req.body);

    const mdn = await db.transaction(async (tx) => {
      await tx.select({ id: UserModel.id }).from(UserModel).where(eq(UserModel.id, payload.id)).for("update");
      await checkForSuspension(payload.id, tx);

      const user = await SiteOptions.apiUser.get();
      const apiKey = await SiteOptions.apiKey.get();
      const price = await getLtrPrice({ user, apiKey, name, rentType });
      const balance = await getBalance(payload.id, tx);
      if (balance < price) throw new UnloggingError("Not enough balance.");

      return await doRentLtr({ user, apiKey, name, rentType, price, userId: payload.id, tx });
    });

    await Promise.all([
      pusher({ page: "/tools/rent/history", to: `user-${payload.id}` }),
      pusher({ page: "/header/balance", to: `user-${payload.id}` }),
      pusher({ page: "/admin-area/dashboard/services/info/ltr", to: "admin" }),
    ]);
    res.json({ success: true, mdn });
  } catch (e) {
    if (e instanceof UnloggingError) { res.status(400).json({ success: false, message: e.message }); return; }
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────
// Helpers — OTR
// ─────────────────────────────────────────────
async function getOtrPrice({ user, apiKey, name }: { user: string; apiKey: string; name: string }) {
  const url = new URL(getApiUrl());
  url.searchParams.set("cmd", "list_services");
  url.searchParams.set("user", user);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("service", name);
  const r: any = await fetch(url.toString()).then((r) => r.json());
  if (r.status === "error") throw new UnloggingError(r.message);
  const service = r.message.at(0);
  if (!service) throw new UnloggingError("Service not found.");
  const price = Number(service.price);
  const cut = await SiteOptions.transactionCut.OneTime.get();
  return price + price * (cut / 100);
}

async function doRentOtr({ user, apiKey, name, price, userId, tx }: any) {
  const url = new URL(getApiUrl());
  url.searchParams.set("cmd", "otr_rent");
  url.searchParams.set("user", user);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("service", name);

  const [hostUrl, callbackSecret] = await Promise.all([
    SiteOptions.hostUrl.get(),
    SiteOptions.providerCallbackSecret.get(),
  ]);
  if (hostUrl && callbackSecret) {
    url.searchParams.set("callback_url", `${hostUrl}/tools/callback?secret=${callbackSecret}`);
  }

  const r: any = await fetch(url.toString()).then((r) => r.json());
  if (r.status === "error") throw new UnloggingError(r.message);

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 20); // OTR typically 20 min window

  await tx.insert(OneTimeRentModel).values({
    mdn: r.message.mdn,
    requestId: r.message.id,
    service: name,
    status: "Awaiting MDN",
    state: r.message.state || "",
    carrier: r.message.carrier || "",
    price,
    originalPrice: price,
    tillExpiration: 20,
    userId,
  });

  return { mdn: r.message.mdn, requestId: r.message.id };
}

// ─────────────────────────────────────────────
// Helpers — LTR
// ─────────────────────────────────────────────
async function getLtrPrice({ user, apiKey, name, rentType }: any) {
  const url = new URL(getApiUrl());
  url.searchParams.set("cmd", "list_services"); url.searchParams.set("user", user);
  url.searchParams.set("api_key", apiKey); url.searchParams.set("service", name);
  const r: any = await fetch(url.toString()).then((r) => r.json());
  if (r.status === "error") throw new UnloggingError(r.message);
  const service = r.message.at(0);
  if (!service) throw new UnloggingError("Service not found.");
  let price = Number(rentType === "short" ? service.ltr_short_price : service.ltr_price);
  if (rentType === "unlimited") price += 5;
  const cut = rentType === "short" ? await SiteOptions.transactionCut.LongTerm.short.get()
    : rentType === "regular" ? await SiteOptions.transactionCut.LongTerm.regular.get()
    : await SiteOptions.transactionCut.LongTerm.unlimited.get();
  return price + price * (cut / 100);
}

async function doRentLtr({ user, apiKey, name, rentType, price, userId, tx }: any) {
  const url = new URL(getApiUrl());
  url.searchParams.set("cmd", "ltr_rent"); url.searchParams.set("user", user);
  url.searchParams.set("api_key", apiKey); url.searchParams.set("service", name);
  url.searchParams.set("autorenew", "false");
  if (rentType !== "unlimited") url.searchParams.set("duration", rentType === "short" ? "3" : "30");
  else url.searchParams.set("reserve", "true");
  const [hostUrl, callbackSecret] = await Promise.all([SiteOptions.hostUrl.get(), SiteOptions.providerCallbackSecret.get()]);
  if (hostUrl && callbackSecret) url.searchParams.set("callback_url", `${hostUrl}/tools/callback?secret=${callbackSecret}`);
  const r: any = await fetch(url.toString()).then((r) => r.json());
  if (r.status === "error") throw new UnloggingError(r.message);
  const days = rentType === "short" ? 3 : 30;
  const expirationDate = new Date(); expirationDate.setDate(expirationDate.getDate() + days);
  await tx.insert(LongTermRentsModel).values({ expirationDate, mdn: r.message.mdn, price, requestId: r.message.id, service: name, status: "Active", userId, onlineStatus: "online", rentType });
  return r.message.mdn;
}

// ─────────────────────────────────────────────
// Suspension check
// ─────────────────────────────────────────────
async function checkForSuspension(userId: number, tx: any) {
  const transactions = await tx.query.LongTermRentsModel.findMany({
    columns: { createdAt: true, status: true },
    limit: suspensionCount,
    orderBy: (m: any, { desc }: any) => desc(m.createdAt),
    where: (m: any, { eq }: any) => eq(m.userId, userId),
  });
  if (transactions.length < suspensionCount) return;
  if ((transactions.at(0)?.createdAt.getTime() || 0) + 1000 * 60 * 60 * 3 < Date.now()) return;
  if (!transactions.every((t: any) => t.status === "Rejected")) return;
  throw new UnloggingError(`You are suspended for suspicious activity. Functional in ${timeFormatter((transactions.at(0)?.createdAt.getTime() || 0) + 1000 * 60 * 60 * 3 - Date.now())}.`);
}