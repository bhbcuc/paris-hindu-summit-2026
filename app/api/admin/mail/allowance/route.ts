import { env } from "cloudflare:workers"

import api from "@/server/app"

// Mail allowance for the admin mail desk (session-guarded in Hono).
async function handle(request: Request) {
  const url = new URL("/api/v1/admin/mail/allowance", request.url)
  return api.fetch(new Request(url, request), env)
}

export const GET = handle
