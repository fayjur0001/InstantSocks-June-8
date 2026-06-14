import type { NextConfig } from "next";
import path from "path";


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";


const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1";
const pusherDomain = `${PUSHER_CLUSTER}.pusher.com`;
const pusherSocksDomain = `ws-${PUSHER_CLUSTER}.pusher.com`;

const securityHeaders = [
  
  
  {
    key: "X-Frame-Options",
    value: "DENY",
  },

  
  
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },

  
  
  
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },

  
  
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },

  
  
  {
    key: "Content-Security-Policy",
    value: [
      
      "default-src 'self'",

      
      
      
      
      
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",

      
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,

      
      `font-src 'self' https://fonts.gstatic.com`,

      
      "img-src 'self' data: blob: https://flagcdn.com",

      
      
      
      
      `connect-src 'self' ${API_URL} https://${pusherDomain} wss://${pusherSocksDomain} https://stats.pusher.com`,

      
      "frame-src 'none'",

      
      "object-src 'none'",

      
      "base-uri 'self'",

      
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",

  turbopack: {
    root: path.join(__dirname),
  },

  
  
  
  
  
  env: {
    JWT_SECRET: process.env.JWT_SECRET,
  },

  
  async headers() {
    return [
      {
        
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;