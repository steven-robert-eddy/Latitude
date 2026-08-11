import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These ship native bindings / shell out to a vendored binary — they must
  // run as real Node modules, never get bundled for the edge or a client chunk.
  serverExternalPackages: ["better-sqlite3", "exiftool-vendored", "sharp", "exifr"],
};

export default nextConfig;
