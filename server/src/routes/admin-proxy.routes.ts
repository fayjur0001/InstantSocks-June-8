
import { Router } from "express";
import { requireAuth } from "@/middleware/auth.middleware";
import {
  adminGetAllProxies,
  adminGetProxyIPs,
  adminGetNsocksBalance,
  adminGetNsocksProxy,
  adminGetNsocksHistory,
  adminNsocksRefundProxy,
  adminNsocksRenewProxyTraffic,
  adminNsocksToggleAutoRenew,
  adminCheckProxyRiskScore,
  adminCheckProxyBlacklists,
  getProxyCountries,
  getProxyStates,
} from "@/controllers/proxy.controller";

const router = Router();
router.use(requireAuth(["admin", "super admin"]));


router.get("/all",                   adminGetAllProxies);
router.get("/ips",                   adminGetProxyIPs);


router.get("/nsocks-balance",        adminGetNsocksBalance);
router.get("/nsocks-proxy/:id",      adminGetNsocksProxy);
router.get("/nsocks-history",        adminGetNsocksHistory);
router.post("/nsocks-refund",        adminNsocksRefundProxy);
router.post("/nsocks-renew-traffic", adminNsocksRenewProxyTraffic);
router.post("/nsocks-autorenew",     adminNsocksToggleAutoRenew);
router.post("/check-risk",           adminCheckProxyRiskScore);
router.post("/check-blacks",         adminCheckProxyBlacklists);


router.get("/countries",             getProxyCountries);
router.get("/states",                getProxyStates);

export default router;