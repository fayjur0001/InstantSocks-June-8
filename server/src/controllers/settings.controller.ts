import { Request, Response } from "express";
import SiteOptions from "@/utils/site-options";

// PUBLIC — GET /api/site-status  (no auth required)
export async function getSiteStatus(req: Request, res: Response) {
  try {
    const [siteMode, maintenanceText, maintenanceEnd] = await Promise.all([
      SiteOptions.siteMode.get(),
      SiteOptions.maintenanceText.get(),
      SiteOptions.maintenanceEnd.get(),
    ]);
    res.json({
      success: true,
      maintenance: siteMode === "maintenance",
      message: maintenanceText || "The site is currently under maintenance. Please check back shortly.",
      maintenanceEnd: maintenanceEnd || null,
    });
  } catch (e) {
    // DB down হলে lock-out করবো না
    res.json({ success: true, maintenance: false, message: "", maintenanceEnd: null });
  }
}

// D1 — GET /api/admin/settings
export async function getSettings(req: Request, res: Response) {
  try {
    const [hostUrl, siteMode, notice, maintenanceText, siteLogo, maintenanceEnd, rules, termsAndConditions, privacyPolicy] = await Promise.all([
      SiteOptions.hostUrl.get(),
      SiteOptions.siteMode.get(),
      SiteOptions.notice.get(),
      SiteOptions.maintenanceText.get(),
      SiteOptions.siteLogo.get(),
      SiteOptions.maintenanceEnd.get(),
      SiteOptions.rules.get(),
      SiteOptions.termsAndConditions.get(),
      SiteOptions.privacyPolicy.get(),
    ]);
    res.json({ success: true, data: { hostUrl, siteMode, notice, maintenanceText, siteLogo, maintenanceEnd, rules, termsAndConditions, privacyPolicy } });
  } catch (e) {
    console.error("GET SETTINGS ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// D1 — PUT /api/admin/settings
export async function updateSettings(req: Request, res: Response) {
  try {
    const { hostUrl, siteMode, notice, maintenanceText, siteLogo, maintenanceEnd, rules, termsAndConditions, privacyPolicy } = req.body;

    // siteLogo validation — base64 data URL অথবা null/empty
    if (siteLogo !== undefined && siteLogo !== null && siteLogo !== "") {
      if (!/^data:image\/(jpeg|png|webp|gif|svg\+xml);base64,/.test(siteLogo)) {
        return res.status(400).json({ success: false, message: "Invalid logo format. Must be a base64 image." });
      }
      // ~2MB limit (base64 ~1.37x overhead)
      if (siteLogo.length > 3_000_000) {
        return res.status(400).json({ success: false, message: "Logo too large. Maximum size is ~2MB." });
      }
    }

    // maintenanceEnd validation — ISO timestamp অথবা empty
    if (maintenanceEnd !== undefined && maintenanceEnd !== null && maintenanceEnd !== "") {
      if (isNaN(Date.parse(maintenanceEnd))) {
        return res.status(400).json({ success: false, message: "Invalid maintenanceEnd format. Must be ISO timestamp." });
      }
    }

    await Promise.all([
      hostUrl !== undefined && SiteOptions.hostUrl.set(hostUrl),
      siteMode !== undefined && SiteOptions.siteMode.set(siteMode),
      notice !== undefined && SiteOptions.notice.set(notice),
      maintenanceText !== undefined && SiteOptions.maintenanceText.set(maintenanceText),
      siteLogo !== undefined && SiteOptions.siteLogo.set(siteLogo || ""),
      maintenanceEnd !== undefined && SiteOptions.maintenanceEnd.set(maintenanceEnd || ""),
      rules !== undefined && SiteOptions.rules.set(rules),
      termsAndConditions !== undefined && SiteOptions.termsAndConditions.set(termsAndConditions),
      privacyPolicy !== undefined && SiteOptions.privacyPolicy.set(privacyPolicy),
    ]);
    res.json({ success: true, message: "Settings updated" });
  } catch (e) {
    console.error("UPDATE SETTINGS ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// D2 — GET /api/admin/payment-api
export async function getPaymentApi(req: Request, res: Response) {
  try {
    const [
      nowApiKey, nowSecret,
      yaanApiKey, yaanSecret,
      blockApiKey, blockSecret,
      currentMethod,
    ] = await Promise.all([
      SiteOptions.payment.nowPayments.apiKey.get(),
      SiteOptions.payment.nowPayments.callbackSecret.get(),
      SiteOptions.payment.yaanPay.apiKey.get(),
      SiteOptions.payment.yaanPay.callbackSecret.get(),
      SiteOptions.payment.blockonomics.apiKey.get(),
      SiteOptions.payment.blockonomics.callbackSecret.get(),
      SiteOptions.payment.currentMethod.get(),
    ]);
    res.json({
      success: true,
      data: {
        nowPayments: { apiKey: nowApiKey, callbackSecret: nowSecret },
        yaanPay: { apiKey: yaanApiKey, callbackSecret: yaanSecret },
        blockonomics: { apiKey: blockApiKey, callbackSecret: blockSecret },
        currentMethod,
      },
    });
  } catch (e) {
    console.error("GET PAYMENT API ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// D2 — PUT /api/admin/payment-api
export async function updatePaymentApi(req: Request, res: Response) {
  try {
    const { nowPayments, yaanPay, blockonomics, currentMethod } = req.body;
    await Promise.all([
      nowPayments?.apiKey !== undefined && SiteOptions.payment.nowPayments.apiKey.set(nowPayments.apiKey),
      nowPayments?.callbackSecret !== undefined && SiteOptions.payment.nowPayments.callbackSecret.set(nowPayments.callbackSecret),
      yaanPay?.apiKey !== undefined && SiteOptions.payment.yaanPay.apiKey.set(yaanPay.apiKey),
      yaanPay?.callbackSecret !== undefined && SiteOptions.payment.yaanPay.callbackSecret.set(yaanPay.callbackSecret),
      blockonomics?.apiKey !== undefined && SiteOptions.payment.blockonomics.apiKey.set(blockonomics.apiKey),
      blockonomics?.callbackSecret !== undefined && SiteOptions.payment.blockonomics.callbackSecret.set(blockonomics.callbackSecret),
      currentMethod !== undefined && SiteOptions.payment.currentMethod.set(currentMethod),
    ]);
    res.json({ success: true, message: "Payment API config updated" });
  } catch (e) {
    console.error("UPDATE PAYMENT API ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// D3 — GET /api/admin/products-api
export async function getProductsApi(req: Request, res: Response) {
  try {
    const [apiUser, apiKey, socks5ApiKey] = await Promise.all([
      SiteOptions.apiUser.get(),
      SiteOptions.apiKey.get(),
      SiteOptions.socks5ProxyAPIKey.get(),
    ]);
    res.json({ success: true, data: { numbersApi: { user: apiUser, key: apiKey }, socks5Api: { apiKey: socks5ApiKey } } });
  } catch (e) {
    console.error("GET PRODUCTS API ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// D3 — PUT /api/admin/products-api
export async function updateProductsApi(req: Request, res: Response) {
  try {
    const { numbersApi, socks5Api } = req.body;
    await Promise.all([
      numbersApi?.user !== undefined && SiteOptions.apiUser.set(numbersApi.user),
      numbersApi?.key !== undefined && SiteOptions.apiKey.set(numbersApi.key),
      socks5Api?.apiKey !== undefined && SiteOptions.socks5ProxyAPIKey.set(socks5Api.apiKey),
    ]);
    res.json({ success: true, message: "Products API config updated" });
  } catch (e) {
    console.error("UPDATE PRODUCTS API ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// D4 — GET /api/admin/pricing
export async function getPricing(req: Request, res: Response) {
  try {
    const tc = SiteOptions.transactionCut;
    const [otr, ltShort, ltRegular, ltUnlimited, proxySharedDay, socks5] = await Promise.all([
      tc.OneTime.get(), tc.LongTerm.short.get(), tc.LongTerm.regular.get(),
      tc.LongTerm.unlimited.get(), tc.Proxy.shared.day.get(), tc.Socks5Proxy.get(),
    ]);
    res.json({ success: true, data: { oneTime: otr, longTerm: { short: ltShort, regular: ltRegular, unlimited: ltUnlimited }, proxyShared: { day: proxySharedDay }, socks5Proxy: socks5 } });
  } catch (e) {
    console.error("GET PRICING ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// D4 — PUT /api/admin/pricing
export async function updatePricing(req: Request, res: Response) {
  try {
    const { oneTime, longTerm, socks5Proxy } = req.body;
    await Promise.all([
      oneTime !== undefined && SiteOptions.transactionCut.OneTime.set(oneTime),
      longTerm?.short !== undefined && SiteOptions.transactionCut.LongTerm.short.set(longTerm.short),
      longTerm?.regular !== undefined && SiteOptions.transactionCut.LongTerm.regular.set(longTerm.regular),
      longTerm?.unlimited !== undefined && SiteOptions.transactionCut.LongTerm.unlimited.set(longTerm.unlimited),
      socks5Proxy !== undefined && SiteOptions.transactionCut.Socks5Proxy.set(socks5Proxy),
    ]);
    res.json({ success: true, message: "Pricing updated" });
  } catch (e) {
    console.error("UPDATE PRICING ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}
// D5 — GET /api/admin/callback
export async function getCallback(req: Request, res: Response) {
  try {
    const [secret, hostUrl] = await Promise.all([
      SiteOptions.providerCallbackSecret.get(),
      SiteOptions.hostUrl.get(),
    ]);
    res.json({
      success: true,
      data: {
        secret: secret || "",
        url: hostUrl && secret ? `${hostUrl}/tools/callback?secret=${secret}` : "",
      },
    });
  } catch (e) {
    console.error("GET CALLBACK ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

// D5 — PUT /api/admin/callback
export async function updateCallback(req: Request, res: Response) {
  try {
    const { secret } = req.body;
    if (secret !== undefined) {
      await SiteOptions.providerCallbackSecret.set(secret);
    }
    res.json({ success: true, message: "Callback config updated" });
  } catch (e) {
    console.error("UPDATE CALLBACK ERROR:", e);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}