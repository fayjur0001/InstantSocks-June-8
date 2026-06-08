export const paymentExpireTime = 1000 * 60 * 120;
export const suspensionCount = 5;
export const nowPaymentsApiUrl =
  process.env.NODE_ENV === "production"
    ? "https://api.nowpayments.io/v1"
    : "https://api-sandbox.nowpayments.io/v1";

export function timeFormatter(ms: number): string {
  const hour = Math.floor(ms / 1000 / 60 / 60);
  const minute = Math.floor((ms / 1000 / 60) % 60);
  const second = Math.floor((ms / 1000) % 60);
  if (hour) return `${String(hour).padStart(2,"0")}h ${String(minute).padStart(2,"0")}m ${String(second).padStart(2,"0")}s`;
  if (minute) return `${String(minute).padStart(2,"0")}m ${String(second).padStart(2,"0")}s`;
  return `${String(second).padStart(2,"0")}s`;
}