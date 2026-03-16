import path from "node:path";

/** @type {import("next").NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.resolve("./"),
  serverExternalPackages: ["pg"],
  turbopack: {
    root: path.resolve("./"),
  },
};

export default nextConfig;
