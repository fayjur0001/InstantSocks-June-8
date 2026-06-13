import db from "@/db";
import { SiteOptionModel } from "@/db/schema";
import { eq } from "drizzle-orm";

async function get(name: string): Promise<string | null> {
  return db.query.SiteOptionModel.findFirst({ where: (m, { eq }) => eq(m.name, name) }).then((r) => r?.value ?? null);
}
async function set(name: string, value: string | null) {
  const existing = await db.query.SiteOptionModel.findFirst({ where: (m, { eq }) => eq(m.name, name) });
  if (existing) {
    await db.update(SiteOptionModel).set({ value }).where(eq(SiteOptionModel.name, name));
  } else {
    await db.insert(SiteOptionModel).values({ value, name });
  }
}

const mk = (name: string, def: number = 0) => ({
  name,
  get: async function() { return Number(await get(this.name)) || def; },
  set: async function(v: number) { await set(this.name, String(v)); },
});
const mks = (name: string, def: string = "") => ({
  name,
  get: async function() { return (await get(this.name)) || def; },
  set: async function(v: string) { await set(this.name, v); },
});

export default class SiteOptions {
  static hostUrl = mks("host-url");
  static apiUser = mks("api-user");
  static apiKey = mks("api-key");
  static siteMode = mks("site-mode", "production");
  static siteLogo = mks("site-logo");
  static notice = mks("notice");
  static maintenanceText = mks("maintenance-text", "Site is undergoing maintenance");
  static maintenanceEnd = mks("maintenance-end", ""); // ISO timestamp — e.g. "2026-06-10T15:00:00.000Z"
  static rules = mks("rules", "");
  static termsAndConditions = mks("terms-and-conditions", "");
  static privacyPolicy = mks("privacy-policy", "");
  static providerCallbackSecret = mks("provider-callback-secret");
  // Auth page text
  static authInfo = {
    copyrightText: mks("auth-copyright-text", "© 2014-${year} RepeatSMS. All Rights Reserved"),
    signInText: mks("auth-sign-in-text", "Access your account with your secure login"),
    signUpText: mks("auth-sign-up-text", "We're excited to have you onboard, let's get started!"),
    passwordResetText: mks("auth-password-reset-text", "Lost your password? No problem. Just enter your email below."),
    homeUrl: mks("auth-home-url", "https://repeatsms.com/"),
  };
  // Top Up page text
  static topUp = {
    cryptoText: mks("topup-crypto-text", "Insert your deposit amount and click on Get wallet button"),
    blankCurrencyText: mks("topup-blank-currency-text", "Your generated address will be shown here."),
    generatedCurrencyText: mks("topup-generated-currency-text", "Send exactly ${amount} ${currency} to this address."),
    cautionText: mks("topup-caution-text", "If you have any issues with payment, open a support ticket."),
    popUpText: mks("topup-popup-text", "## Claim Your Deposit Bonus Today.\nBoost your balance instantly."),
  };
  static socks5ProxyAPIKey = mks("socks5-proxy-api-key");
  static smsPvaSecret = mks("sms-pva-secret");
  static transactionCut = {
    OneTime: mk("transaction-cut-one-time"),
    LongTerm: { short: mk("transaction-cut-long-term-short"), regular: mk("transaction-cut-long-term-regular"), unlimited: mk("transaction-cut-long-term-unlimited") },
    Proxy: {
      shared: { day: mk("transaction-cut-proxy-shared-day"), week: mk("transaction-cut-proxy-shared-week"), month: mk("transaction-cut-proxy-shared-month") },
      exclusive: { day: mk("transaction-cut-proxy-exclusive-day"), week: mk("transaction-cut-proxy-exclusive-week"), month: mk("transaction-cut-proxy-exclusive-month") },
    },
    Device: { day: mk("transaction-cut-device-day"), week: mk("transaction-cut-device-week"), month: mk("transaction-cut-device-month") },
    Socks5Proxy: mk("transaction-cut-socks5-proxy"),
    SMSPVA: { otr: mk("transaction-cut-smspva-one-time"), ltr: { week: mk("transaction-cut-smspva-week"), month: mk("transaction-cut-smspva-month") } },
  };
  static payment = {
    nowPayments: { apiKey: mks("nowpayments-api-key"), callbackSecret: mks("nowpayments-callback-secret") },
    yaanPay: { apiKey: mks("yaanpay-api-key"), callbackSecret: mks("yaanpay-callback-secret") },
    blockonomics: { apiKey: mks("blockonomics-api-key"), callbackSecret: mks("blockonomics-callback-secret") },
    currentMethod: mks("payment-current-method", "now-payments"),
  };
  static devices = { login: mks("devices-login"), password: mks("devices-password") };
  static smsMethod = {
    name: "sms-method",
    enumArray: ["mobile-varify-bro", "sms-pva"] as const,
    get: async function() {
      const raw = await get(this.name);
      if (!raw) return [this.enumArray[0]];
      try { const p = JSON.parse(raw); if (Array.isArray(p) && p.length > 0) return p; } catch {}
      return [this.enumArray[0]];
    },
    set: async function(v: string[]) { await set(this.name, JSON.stringify(v)); },
  };
}