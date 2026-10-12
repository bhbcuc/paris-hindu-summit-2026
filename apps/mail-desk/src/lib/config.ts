// Cloudflare Worker origin serving the Hono API (/api/v1/*) and better-auth
// (/api/auth/*). Development uses the summit-website-dev Worker, production
// the summit-website Worker.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? ""

export function assertConfiguration() {
  if (!API_URL) {
    throw new Error("Set EXPO_PUBLIC_API_URL to the Cloudflare Worker origin before starting the app.")
  }
}
