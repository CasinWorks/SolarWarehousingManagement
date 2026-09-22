import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep client-side navigations snappy — don't refetch RSC on every click
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
