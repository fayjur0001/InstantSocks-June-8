"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nowPaymentsApiUrl = exports.suspensionCount = exports.paymentExpireTime = void 0;
exports.timeFormatter = timeFormatter;
exports.paymentExpireTime = 1000 * 60 * 120;
exports.suspensionCount = 5;
exports.nowPaymentsApiUrl = process.env.NODE_ENV === "production"
    ? "https://api.nowpayments.io/v1"
    : "https://api-sandbox.nowpayments.io/v1";
function timeFormatter(ms) {
    const hour = Math.floor(ms / 1000 / 60 / 60);
    const minute = Math.floor((ms / 1000 / 60) % 60);
    const second = Math.floor((ms / 1000) % 60);
    if (hour)
        return `${String(hour).padStart(2, "0")}h ${String(minute).padStart(2, "0")}m ${String(second).padStart(2, "0")}s`;
    if (minute)
        return `${String(minute).padStart(2, "0")}m ${String(second).padStart(2, "0")}s`;
    return `${String(second).padStart(2, "0")}s`;
}
