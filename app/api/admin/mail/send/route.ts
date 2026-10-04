import { env } from "cloudflare:workers"

import api from "@/server/app"

// Mail send for the admin mail desk (session-guarded + sent via Resend in Hono).
async function handle(request: Request) {
  const url = new URL("/api/v1/admin/mail/send", request.url)
  return api.fetch(new Request(url, request), env)
}

export const POST = handle
