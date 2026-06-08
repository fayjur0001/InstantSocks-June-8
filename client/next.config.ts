import type { NextConfig } from "next";
import path from "path";

// Production এ API কোথায় — CSP connect-src এ লাগবে
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Pusher cluster — mt1, ap2, eu, us2 ইত্যাদি
// cluster থেকে Pusher এর WebSocket + HTTP domain বানানো হয়
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1";
const pusherDomain = `${PUSHER_CLUSTER}.pusher.com`;
const pusherSocksDomain = `ws-${PUSHER_CLUSTER}.pusher.com`;

const securityHeaders = [
  // ── Clickjacking protection ──────────────────────────────────────────────
  // iframe এ এই site load করা যাবে না
  {
    key: "X-Frame-Options",
    value: "DENY",
  },

  // ── MIME sniffing protection ─────────────────────────────────────────────
  // Browser declared Content-Type ই follow করবে, guess করবে না
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },

  // ── Referrer Policy ──────────────────────────────────────────────────────
  // reset token বা অন্য sensitive URL অন্য site এ leak হবে না
  // same-origin request এ full URL পাঠাবে, cross-origin এ কিছু না
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },

  // ── Permissions Policy ───────────────────────────────────────────────────
  // এই app এর camera/mic/location দরকার নেই — browser কে জানাও
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },

  // ── Content Security Policy ──────────────────────────────────────────────
  // প্রতিটা directive আলাদাভাবে explain করা আছে
  {
    key: "Content-Security-Policy",
    value: [
      // default: যা explicitly allow না তা block
      "default-src 'self'",

      // Script: শুধু same-origin
      // 'unsafe-inline' নেই — Next.js inline script এর জন্য nonce দরকার হয়
      // কিন্তু Next.js standalone mode এ nonce ছাড়াও কাজ করে
      // তাই 'unsafe-inline' দিতে হচ্ছে (Next.js এর hydration এর জন্য)
      // production এ strict-dynamic + nonce দিয়ে upgrade করা যাবে পরে
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",

      // Style: Google Fonts + same-origin inline style
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,

      // Font: Google Fonts CDN
      `font-src 'self' https://fonts.gstatic.com`,

      // Image: same-origin + data URI (avatar placeholder ইত্যাদি)
      "img-src 'self' data: blob: https://flagcdn.com",

      // Connect (fetch/XHR/WebSocket):
      // - API server
      // - Pusher HTTP endpoint
      // - Pusher WebSocket
      `connect-src 'self' ${API_URL} https://${pusherDomain} wss://${pusherSocksDomain} https://stats.pusher.com`,

      // Frame: কাউকে embed করা যাবে না
      "frame-src 'none'",

      // Object: Flash ইত্যাদি পুরনো plugin বন্ধ
      "object-src 'none'",

      // Base tag hijacking বন্ধ
      "base-uri 'self'",

      // Form শুধু same-origin এ submit হবে
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",

  turbopack: {
    root: path.join(__dirname),
  },

  // ✅ FIX: JWT_SECRET কে middleware Edge runtime-এ expose করো।
  // Edge runtime শুধু NEXT_PUBLIC_ prefix-এর env vars পড়তে পারে।
  // next.config.ts-এর env block দিয়ে non-public secret কে
  // build-time এ bundle করা হয় — middleware-এ process.env.JWT_SECRET কাজ করবে।
  // সাবধান: এটা server-side bundle-এ যায়, client bundle-এ না।
  env: {
    JWT_SECRET: process.env.JWT_SECRET,
  },

  // ✅ FIX: Security headers সব route এ apply হবে
  async headers() {
    return [
      {
        // সব route match করো
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;