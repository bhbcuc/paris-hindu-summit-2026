import type { Context } from "hono"

// Worker bindings (declared in cloudflare.config.ts).
export interface SummitEnv {
  DB: D1Database
  SUMMIT_ASSETS: R2Bucket
  ASSETS: Fetcher
  IMAGES: unknown
  ADMIN_API_TOKEN?: string
  MAIL_INGEST_SECRET?: string
  BETTER_AUTH_SECRET?: string
  BETTER_AUTH_URL?: string
  ALLOW_INITIAL_ADMIN_SIGNUP?: string
  RESEND_API_KEY?: string
}

export type AppContext = Context<{ Bindings: SummitEnv }>

export const now = () => Date.now()
export const newId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`

export const asBool = (value: unknown) => (value ? 1 : 0)
export const fromBool = (value: number | null) => value === 1

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : ""

export const str = (value: unknown, max: number, fallback = "") => {
  const cleaned = text(value, max)
  return cleaned || fallback
}

// Public file URL served by this Worker (no public R2 domain required).
export const fileUrl = (r2Key: string | null | undefined) =>
  r2Key ? `/api/v1/files/${encodeURIComponent(r2Key)}` : null

export function r2KeyFromUpload(
  fileName: string,
  mimeType: string
): string {
  const safe = fileName.replace(/[\\/]/g, "-").slice(0, 180) || "file"
  const ext = safe.includes(".") ? safe.slice(safe.lastIndexOf(".")) : ""
  const prefix = mimeType.startsWith("image/")
    ? "images"
    : mimeType === "application/pdf"
      ? "docs"
      : "uploads"
  return `${prefix}/${newId()}${ext}`
}

export const ALLOWED_UPLOAD_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
])

export const MAX_UPLOAD_BYTES = 20_000_000

// Admin gate. Sessions still live in Convex (better-auth) until the session
// cutover lands; mutating admin routes stay 503 until then so nothing ships
// with a weak check. admin-portal continues to use Convex meanwhile.
export function adminDisabled() {
  return Response.json(
    {
      error:
        "Admin API is pending the better-auth session cutover to D1. Use the Convex-backed admin portal for now.",
    },
    { status: 503 }
  )
}

export async function writeAudit(
  db: D1Database,
  actor: { id: string; email: string },
  entry: { action: string; entityType: string; entityId: string; summary: string }
) {
  await db
    .prepare(
      "INSERT INTO auditEvents (id, actorId, actorEmail, action, entityType, entityId, summary, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      newId(),
      actor.id,
      actor.email,
      entry.action,
      entry.entityType,
      entry.entityId,
      entry.summary.slice(0, 500),
      now()
    )
    .run()
}

export { str as cleanStr }
