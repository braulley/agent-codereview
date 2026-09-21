import type { NextConfig } from "next";

/**
 * Proxy same-origin `/api/*` to FastAPI (C11 / D2).
 * `BACKEND_URL` is read only at Next server config time — never expose API keys
 * via `NEXT_PUBLIC_*`. Default matches local Uvicorn.
 */
const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
