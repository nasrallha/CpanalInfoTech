import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    serverActions: {
      // الحد الافتراضي 1MB، والصور مسموح لحد 2MB
      bodySizeLimit: "3mb",
    },
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
