import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // This app lives in a subdirectory alongside the root bab-tasker app and
  // its own lockfile, which otherwise makes Next.js/Turbopack misdetect the
  // monorepo root and pull in the root app's files.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
