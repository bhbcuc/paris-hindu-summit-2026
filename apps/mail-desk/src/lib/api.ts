import { useCallback, useEffect, useState } from "react"

import { authClient } from "@/lib/auth-client"
import { API_URL } from "@/lib/config"

// REST client for the Hono admin mail API on the Cloudflare Worker
// ({API_URL}/api/v1/admin/mail/*), replacing the Convex mail queries. Response
// shapes mirror the old Convex documents 1:1, so screens keep their logic.

export interface MailAttachment {
  _id: string
  fileName: string
  mimeType: string
  byteSize: number
  contentId: string | null
}

export interface MailMessage {
  _id: string
  _creationTime: number
  direction: string
  messageId: string
  inReplyTo: string | null
  references: string | null
  fromAddress: string
  fromName: string
  toAddresses: string[]
  ccAddresses: string[]
  bccAddresses: string[]
  subject: string
  textBody: string
  htmlBody: string
  deliveryStatus: string
  isRead: boolean
  sentByEmail: string | null
  providerResponse: string | null
  createdAt: number
  updatedAt: number
  attachments: MailAttachment[]
}

export interface MailAllowance {
  limit: number
  used: number
  remaining: number
  resetsAt: number
  providerRemaining: number | null
  source: string
}

export interface MailContact {
  _id: string
  name: string
  email: string
  organization: string
  notes: string
  createdAt: number
}

function sessionCookie(): string {
  return (authClient as typeof authClient & { getCookie(): string }).getCookie()
}

export async function apiFetch<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1/admin${path}`, {
    method: init?.method ?? "GET",
    headers: { "Content-Type": "application/json", Cookie: sessionCookie() },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  })
  if (response.status === 401) {
    // Session expired or revoked: drop local auth state so the app returns to
    // the sign-in screen instead of hanging on stale loading states.
    await authClient.signOut().catch(() => undefined)
    throw new Error("Your session expired. Sign in again.")
  }
  const payload = (await response.json().catch(() => null)) as { error?: string } | null
  if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status}).`)
  return payload as T
}

export function useMailApi<T>(path: string) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    let cancelled = false
    apiFetch<T>(path).then(
      (payload) => {
        if (!cancelled) setData(payload)
      },
      (error: unknown) => {
        if (!cancelled) console.warn(`Mail API ${path} failed:`, error instanceof Error ? error.message : error)
      }
    )
    return () => {
      cancelled = true
    }
  }, [path, nonce])
  const refresh = useCallback(() => setNonce((current) => current + 1), [])
  return { data, refresh }
}
