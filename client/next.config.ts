import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Подавляем React DevTools warning в production
  reactStrictMode: true,

  // Отключаем x-powered-by заголовок
  poweredByHeader: false,

  // Безопасные заголовки
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
  ],
};

export default nextConfig;
