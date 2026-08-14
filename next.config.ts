import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Content-Security-Policy",
    value: isDev
      ? "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; script-src 'self' 'unsafe-inline'",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  ...(isDev ? { allowedDevOrigins: ["172.25.156.163"] } : {}),
  async rewrites() {
    return [
      { source: "/catalogue", destination: "/catalogue.html" },
      { source: "/catalogue/", destination: "/catalogue.html" },
    ];
  },
  async headers() {
    const catalogueCsp = isDev
      ? "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'sha256-Ku9qB7lYE9Fwcjz98PjBAzBGxHPi2XmMsq1fJsyeqrE='"
      : "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; script-src 'self' 'sha256-Ku9qB7lYE9Fwcjz98PjBAzBGxHPi2XmMsq1fJsyeqrE='";
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/catalogue/:path*",
        headers: [
          ...securityHeaders.filter((h) => h.key !== "Content-Security-Policy"),
          { key: "Content-Security-Policy", value: catalogueCsp },
        ],
      },
      {
        source: "/catalogue.html",
        headers: [
          ...securityHeaders.filter((h) => h.key !== "Content-Security-Policy"),
          { key: "Content-Security-Policy", value: catalogueCsp },
        ],
      },
    ];
  },
};

export default nextConfig;
