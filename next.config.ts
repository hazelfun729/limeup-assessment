import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  outputFileTracingIncludes: {
    "/api/reports/*/document": ["./src/lib/report/document.css", "./public/report-logo.png"],
    "/api/admin/reports/*/document": ["./src/lib/report/document.css", "./public/report-logo.png"],
    "/api/admin/reports/*/email-preview": ["./public/logo-banner.png"],
    "/api/admin/reports/*/send": ["./public/logo-banner.png"],
    "/api/admin/reports/batch-send": ["./public/logo-banner.png"],
  },
  turbopack: { root: process.cwd() },
};

export default nextConfig;
