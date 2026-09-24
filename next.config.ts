import type { NextConfig } from "next";

const developmentScriptSource =
  process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: `default-src 'self'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'; img-src 'self' data: blob: https://*.supabase.co; script-src 'self' 'unsafe-inline'${developmentScriptSource}; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://www.google.com; object-src 'none'; upgrade-insecure-requests` },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
