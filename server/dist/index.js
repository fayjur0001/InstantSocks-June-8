"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const morgan_1 = __importDefault(require("morgan"));
const auth_middleware_1 = require("@/middleware/auth.middleware");
const error_middleware_1 = require("@/middleware/error.middleware");
const auth_routes_1 = __importDefault(require("@/routes/auth.routes"));
const users_routes_1 = __importDefault(require("@/routes/users.routes"));
const support_routes_1 = __importDefault(require("@/routes/support.routes"));
const topup_routes_1 = __importDefault(require("@/routes/topup.routes"));
const numbers_routes_1 = __importDefault(require("@/routes/numbers.routes"));
const settings_routes_1 = __importDefault(require("@/routes/settings.routes"));
const rentals_routes_1 = __importDefault(require("@/routes/rentals.routes"));
const admin_rentals_routes_1 = __importDefault(require("@/routes/admin-rentals.routes"));
const proxy_routes_1 = __importDefault(require("@/routes/proxy.routes"));
const admin_proxy_routes_1 = __importDefault(require("@/routes/admin-proxy.routes"));
const dashboard_routes_1 = __importDefault(require("@/routes/dashboard.routes"));
const admin_dashboard_routes_1 = __importDefault(require("@/routes/admin-dashboard.routes"));
const notification_routes_1 = __importDefault(require("@/routes/notification.routes"));
// ✅ FIX: required env vars startup এ validate — missing হলে production এ silent failure হবে না
const REQUIRED_ENV = ["JWT_SECRET", "DATABASE_URL"];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingEnv.join(", ")}`);
    process.exit(1);
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(auth_middleware_1.attachAuth);
// Root
app.get("/", (_req, res) => res.json({ success: true, message: "Backend server is running successfully" }));
app.get("/api/health", (_req, res) => res.json({ success: true, status: "ok" }));
// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", auth_routes_1.default);
app.use("/api/admin/users", users_routes_1.default);
app.use("/api/support", support_routes_1.default);
app.use("/api/topup", topup_routes_1.default);
app.use("/api/numbers", numbers_routes_1.default);
app.use("/api/rentals", rentals_routes_1.default);
app.use("/api/proxy", proxy_routes_1.default);
app.use("/api/admin/proxy", admin_proxy_routes_1.default);
app.use("/api/admin", admin_dashboard_routes_1.default); // ← settingsRoutes এর আগে
app.use("/api/admin", settings_routes_1.default);
app.use("/api/admin/rentals", admin_rentals_routes_1.default);
app.use("/api/dashboard", dashboard_routes_1.default);
app.use("/api/notifications", notification_routes_1.default);
// ─────────────────────────────────────────────────────────────────────────────
app.use(error_middleware_1.notFound);
app.use(error_middleware_1.errorHandler);
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
exports.default = app;
