import { env } from "cloudflare:workers"

import api from "@/server/app"

// Hono API (D1 + R2 backend) mounted at /api/v1/*. Bindings come from
// cloudflare.config.ts via the workerd-native `cloudflare:workers` module.
function handle(request: Request) {
  return api.fetch(request, env)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const DELETE = handle
export const PATCH = handle
