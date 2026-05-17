/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Dev-only proxy so the frontend can call /api/* without CORS issues.
    // In production, the frontend talks directly to the backend via NEXT_PUBLIC_API_URL,
    // so this rewrite is effectively unused on Vercel.
    const target = process.env.API_PROXY_TARGET || "http://localhost:5002";
    return [
      {
        source: "/api/:path*",
        destination: `${target}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        // Service worker must not be cached by the browser
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        // Manifest should be fresh but can be cached briefly
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600" },
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
