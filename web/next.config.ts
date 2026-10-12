import type { NextConfig } from "next";

const legacyApiUrl = process.env.NEXT_PUBLIC_API_URL;
const backendApiUrl = (
  process.env.BACKEND_API_URL ??
  (legacyApiUrl && /^https?:\/\//.test(legacyApiUrl)
    ? legacyApiUrl
    : undefined) ??
  (process.env.NODE_ENV === "production"
    ? "https://worldcupapi.duckdns.org"
    : "http://localhost:4000")
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendApiUrl}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
    ],
  },
};

export default nextConfig;
