import { env } from "cloudflare:workers"

import { getAuth } from "@/server/auth"

// better-auth backed by D1 (replaces the Convex better-auth handler).
async function handle(request: Request) {
  const auth = getAuth(env, new URL(request.url).origin)
  return auth.handler(request)
}

export const GET = handle
export const POST = handle
