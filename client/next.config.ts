import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const analyze = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  ...(process.env.STANDALONE === "1" && { output: "standalone" }),
  turbopack: {
    resolveAlias: {
      '@noble/hashes/hmac': '@noble/hashes/hmac.js',
      '@noble/hashes/sha256': '@noble/hashes/sha2.js',
      '@noble/hashes/hkdf': '@noble/hashes/hkdf.js',
    },
  },

  // Suppress React DevTools warning in production
  reactStrictMode: true,

  // Disable x-powered-by header
  poweredByHeader: false,

  // Security headers
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' blob: data:",
            "connect-src 'self' ws: wss: http://localhost:* https://*",
            "font-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "worker-src 'self' blob:",
          ].join("; "),
        },
      ],
    },
  ],
};

export default analyze(nextConfig);
