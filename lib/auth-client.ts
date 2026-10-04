import { createAuthClient } from "better-auth/react"

// Same-origin client for /api/auth/* (D1-backed better-auth on Workers).
export const authClient = createAuthClient()
