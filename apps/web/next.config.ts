import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  images: {
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 31536000,
  },
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
