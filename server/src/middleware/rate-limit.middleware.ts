import { Request, Response, NextFunction } from "express";

interface WindowEntry {
  count: number;
  resetAt: number;
}

// In-memory store — production এ Redis দিয়ে replace করুন
const store = new Map<string, WindowEntry>();

// পুরানো entries পরিষ্কার করো (memory leak বন্ধ করতে)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 60_000);

interface RateLimitOptions {
  windowMs: number;   // time window in ms
  max: number;        // max requests per window
  message?: string;
}

export function rateLimit({ windowMs, max, message }: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    // IP + path কে key হিসেবে ব্যবহার করো
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      // নতুন window শুরু
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfterSecs = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSecs));
      return res.status(429).json({
        success: false,
        message: message || "Too many requests. Please try again later.",
      });
    }

    return next();
  };
}