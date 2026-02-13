import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone build for App Service deployment
  // For Static Web Apps, the default output works fine
  output: process.env.NEXT_OUTPUT_MODE === "standalone" ? "standalone" : undefined,
};

export default nextConfig;
