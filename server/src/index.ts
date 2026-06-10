import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import { attachAuth } from "@/middleware/auth.middleware";
import { errorHandler, notFound } from "@/middleware/error.middleware";

import authRoutes            from "@/routes/auth.routes";
import usersRoutes           from "@/routes/users.routes";
import supportRoutes         from "@/routes/support.routes";
import topupRoutes           from "@/routes/topup.routes";
import numbersRoutes         from "@/routes/numbers.routes";
import settingsRoutes        from "@/routes/settings.routes";
import rentalsRoutes         from "@/routes/rentals.routes";
import adminRentalsRoutes    from "@/routes/admin-rentals.routes";
import proxyRoutes           from "@/routes/proxy.routes";
import adminProxyRoutes      from "@/routes/admin-proxy.routes";
import dashboardRoutes       from "@/routes/dashboard.routes";
import adminDashboardRoutes  from "@/routes/admin-dashboard.routes";
import notificationRoutes    from "@/routes/notification.routes";
// ✅ FIX: getSiteStatus সরাসরি import — /api/site-status এ আলাদা register করার জন্য
import { getSiteStatus }     from "@/controllers/settings.controller";

// ✅ FIX: required env vars startup এ validate — missing হলে production এ silent failure হবে না
const REQUIRED_ENV = ["JWT_SECRET", "DATABASE_URL"] as const;
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(attachAuth);

// Root
app.get("/", (_req, res) => res.json({ success: true, message: "Backend server is running successfully" }));
app.get("/api/health", (_req, res) => res.json({ success: true, status: "ok" }));

// ✅ FIX: /api/site-status public route আলাদাভাবে register করা হলো।
//         settingsRoutes /api/admin এ mount — তাই সেখানে থাকলে /api/admin/site-status হয়ে যায়।
//         Client apiFetch("/api/site-status") call করে — তাই এখানে সরাসরি register করা দরকার।
app.get("/api/site-status", getSiteStatus);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",           authRoutes);
app.use("/api/admin/users",    usersRoutes);
app.use("/api/support",        supportRoutes);
app.use("/api/topup",          topupRoutes);
app.use("/api/numbers",        numbersRoutes);
app.use("/api/rentals",        rentalsRoutes);
app.use("/api/proxy",          proxyRoutes);
app.use("/api/admin/proxy",    adminProxyRoutes);
app.use("/api/admin",          adminDashboardRoutes);
app.use("/api/admin",          settingsRoutes);
app.use("/api/admin/rentals",  adminRentalsRoutes);
app.use("/api/dashboard",      dashboardRoutes);
app.use("/api/notifications",  notificationRoutes);

// ─────────────────────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

export default app;