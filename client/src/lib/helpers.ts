


export function safeRedirect(redirect: string | null, fallback: string): string {
  if (!redirect) return fallback;

  try {
    
    
    
    
    
    const url = new URL(redirect, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;
    if (!url.pathname.startsWith("/")) return fallback;
    
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