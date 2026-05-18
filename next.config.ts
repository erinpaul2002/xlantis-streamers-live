import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins:
    process.env.NODE_ENV === "development"
      ? ["*.local", "192.168.*.*", "10.*.*.*", "172.*.*.*"]
      : undefined,
};

export default nextConfig;
