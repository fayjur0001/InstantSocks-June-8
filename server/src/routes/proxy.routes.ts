import { Router } from "express";
import { requireAuth } from "@/middleware/auth.middleware";
import {
  getProxyDetails,
  getProxyList,
  getCart,
  addToCart,
  removeFromCart,
  rentProxy,
  getMyRentals,
  getProxyAuth,
  updateProxyAuth,
  swapPort,
  renewProxy,
  getProxyStates,
  getProxyCountries,
  getNsocksHistory,
  nsocksRefundProxy,
  nsocksRenewProxyTraffic,
  nsocksToggleAutoRenew,
  checkProxyRiskScore,
  checkProxyBlacklists,
} from "@/controllers/proxy.controller";

const router = Router();

// সব proxy routes এ login লাগবে
router.use(requireAuth());

// I1 — Proxy List & Cart & Rent
router.get("/details/:id", getProxyDetails);
router.get("/list", getProxyList);
router.get("/cart", getCart);
router.post("/cart", addToCart);
router.delete("/cart/:id", removeFromCart);
router.post("/rent", rentProxy);

// I2 — My Rentals & Auth & Swap Port & Renew
router.get("/my-rentals", getMyRentals);
router.get("/auth", getProxyAuth);
router.put("/auth", updateProxyAuth);
router.post("/swap-port", swapPort);
router.post("/renew", renewProxy);

// I3 — NSocks meta (states, countries)
router.get("/states", getProxyStates);
router.get("/countries", getProxyCountries);

// I4 — NSocks history, refund, renew-traffic, autorenew
router.get("/nsocks-history", getNsocksHistory);
router.post("/nsocks-refund", nsocksRefundProxy);
router.post("/nsocks-renew-traffic", nsocksRenewProxyTraffic);
router.post("/nsocks-autorenew", nsocksToggleAutoRenew);

// I5 — Proxy quality checks (risk score + blacklists)
router.post("/check-risk", checkProxyRiskScore);
router.post("/check-blacks", checkProxyBlacklists);

export default router;