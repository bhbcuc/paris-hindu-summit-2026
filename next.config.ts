import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    // Keep the Convex remotePattern: live prod still serves images from Convex.
    // R2 file URLs are relative (`/api/v1/files/*`) and need no remotePattern —
    // they bypass the `/_next/image` optimizer via SmartImage
    // (`components/site/smart-image.tsx`), which renders a plain `<img>` for
    // them because the vinext images optimizer cannot resolve the dynamic
    // Hono file route on Cloudflare Workers.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.convex.cloud",
      },
    ],
  },
}

export default nextConfig
