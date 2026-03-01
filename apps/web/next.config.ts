import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/match",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
