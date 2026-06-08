/**
 * ✅ FIX: Open Redirect protection
 * redirect param শুধু internal path হলেই accept করে।
 * External URL (https://evil.com), protocol-relative (//evil.com),
 * বা "javascript:..." হলে fallback এ চলে যাবে।
 */
export function safeRedirect(redirect: string | null, fallback: string): string {
  if (!redirect) return fallback;

  try {
    // new URL(redirect, base) দিয়ে parse করলে:
    // - "/user/dashboard"  → origin = "http://localhost" ✅
    // - "https://evil.com" → origin = "https://evil.com" ❌
    // - "//evil.com"       → origin = "http://evil.com"  ❌
    // - "javascript:alert" → throws বা origin mismatch     ❌
    const url = new URL(redirect, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;
    if (!url.pathname.startsWith("/")) return fallback;
    // host কখনো return করব না — শুধু path + query + hash
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

export function toFlagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export function randomStr(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}