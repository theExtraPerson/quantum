import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/plants", destination: "/products", permanent: false }];
  },
};

export default nextConfig;
