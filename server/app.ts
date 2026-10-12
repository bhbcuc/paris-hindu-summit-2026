import { Hono } from "hono"

import admin from "./admin"
import { adminIdentity } from "./auth"
import {
  ALLOWED_UPLOAD_MIME,
  MAX_UPLOAD_BYTES,
  asBool,
  fileUrl,
  fromBool,
  newId,
  now,
  r2KeyFromUpload,
  str,
  writeAudit,
  type SummitEnv,
} from "./db"

// Hono API replacing Convex queries/mutations/actions for the summit website.
// Response shapes mirror the Convex functions 1:1 (same field names,
// `_id` strings, `*Url` file fields served via /api/v1/files/:key) so the
// frontend cutover is mechanical. Mounted at /api/v1/* (see
// app/api/v1/[...route]/route.ts, which re-exports one handler per HTTP
// method delegating to api.fetch per the Next Route Handler convention in
// node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md).
// Auth runs on better-auth backed by D1 (server/auth.ts): browser admin
// callers authenticate via the session cookie, while service callers
// (Expo, scripts) may use ADMIN_API_TOKEN. See requireAdmin below for the
// token scope/rotation decision.

type Variables = {
  adminEmail: string
  // Session user id on the session path, "api-token" on the token path.
  actorId: string
  // Which credential authenticated this request; recorded in audit summaries.
  principal: "session" | "api-token"
}

const api = new Hono<{ Bindings: SummitEnv; Variables: Variables }>().basePath("/api/v1")

function log(request: { url: string }, event: string, detail: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ service: "summit-website", event, ...detail, at: new Date().toISOString() }))
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = new TextEncoder().encode(a)
  const bb = new TextEncoder().encode(b)
  if (ab.length !== bb.length) return false
  let diff = 0
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i]
  return diff === 0
}

async function requireAdmin(c: {
  req: Request
  env: SummitEnv
  set: (key: "adminEmail" | "actorId" | "principal", value: string) => void
}) {
  // Service path: shared token (Expo/mobile service callers, scripts).
  // DECISION (kept, not removed): the bypass stays because headless Expo and
  // deploy scripts cannot hold a better-auth session cookie. The token is a
  // single full-admin credential — rotate it on operator offboarding (rotate
  // in Cloudflare dashboard, update Expo/scripts, redeploy), and prefer
  // session auth for all browser/portal traffic. Every audit entry below
  // records which principal authenticated (session email vs api-token) so
  // token-path writes are distinguishable in the audit log.
  const configured = c.env.ADMIN_API_TOKEN
  const header =
    c.req.headers.get("authorization") ?? c.req.headers.get("x-admin-token") ?? ""
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : header
  if (configured && supplied && timingSafeEqual(supplied, configured)) {
    c.set("adminEmail", "api-token-admin")
    c.set("actorId", "api-token")
    c.set("principal", "api-token")
    return null
  }
  // Browser path: better-auth session cookie.
  const identity = await adminIdentity(c.env, c.req)
  if (identity instanceof Response) return identity
  c.set("adminEmail", identity.user.email)
  c.set("actorId", identity.user.id)
  c.set("principal", "session")
  return null
}

function clientIp(request: Request): string {
  const direct = request.headers.get("cf-connecting-ip")?.trim()
  if (direct) return direct
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || "unknown"
}

// Fixed-window per-key counter persisted in D1 (rateLimits table). Returns
// true when the request is within budget and consumes one unit, false when
// the window is exhausted. Best-effort: any D1 error fails open so a
// database hiccup never turns public writes into 500s.
async function checkRateLimit(
  db: D1Database,
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const timestamp = now()
  try {
    const row = await db
      .prepare("SELECT count, windowStart FROM rateLimits WHERE key = ?")
      .bind(key)
      .first<{ count: number; windowStart: number }>()
    if (!row || timestamp - row.windowStart >= windowMs) {
      await db
        .prepare(
          "INSERT INTO rateLimits (key, count, windowStart) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, windowStart = excluded.windowStart"
        )
        .bind(key, timestamp)
        .run()
      return true
    }
    if (row.count >= limit) return false
    await db
      .prepare("UPDATE rateLimits SET count = count + 1 WHERE key = ?")
      .bind(key)
      .run()
    return true
  } catch {
    return true
  }
}

function requireMailSecret(env: SummitEnv, request: Request) {
  const expected = env.MAIL_INGEST_SECRET
  const supplied = request.headers.get("x-mail-ingest-secret")
  return Boolean(expected) && Boolean(supplied) && timingSafeEqual(supplied ?? "", expected ?? "")
}

const bankTransferDefaults = {
  bankTransferEyebrow: "Direct bank transfer",
  bankTransferTitle: "Give directly, securely.",
  bankTransferBody:
    "Your generosity helps bring our community together in Paris for inspiration, dialogue, and justice. Donations can be sent directly to either summit bank account.",
  bankAccountLabel: "France account",
  bankName: "Credit Industriel et Commercial (CIC Bank)",
  bankAccountName: "Bureau of Human Rights and Justice",
  bankIban: "FR76 3006 6104 5100 0207 8600 151",
  bankBic: "CMCIFRPP",
}
const usBankDefaults = {
  usBankAccountLabel: "United States account",
  usBankName: "Fifth Third Bank",
  usBankAccountName: "Forcefield",
  usBankRoutingNumber: "071923909",
  usBankAccountNumber: "10233828",
  usBankSwift: "FTBCUS3CXXX (FTBCUS3C for the 8-character base code)",
}
const registrationFeeDefaults = {
  registrationFeeLabel: "US$250",
  registrationFeeTitle: "Registration processing fee",
  registrationFeeBody:
    "Deposit the registration processing fee into either summit bank account. After sending the payment, email the payment slip for confirmation.",
  registrationFeeEmail: "info@parishindusummit.org",
}
const forumPackageDefaults = {
  forumPackagesMenuLabel: "Forum Packages",
  accommodationPackageLabel: "Four nights in Paris",
  accommodationPackageTitle: "Stay close to the Forum.",
  accommodationPackageIntro:
    "Compare five accommodation levels for the Paris Hindu Summit. Every package includes four hotel nights and the local tourist tax.",
  sponsorshipPackageLabel: "Partnership & Sponsorship",
  sponsorshipPackageTitle: "Put your institution behind meaningful action.",
  sponsorshipPackageIntro:
    "Choose a level that matches your organisation's goals—from visible Forum partnership to a focused programme, hospitality, scholarship or archive contribution.",
}

// --- Public reads (mirror convex/* listPublished / get) ---

api.get("/settings", async (c) => {
  const row = await c.env.DB.prepare(
    "SELECT * FROM siteSettings WHERE key = 'primary'"
  ).first<Record<string, unknown>>()
  if (!row) return c.json(null)
  const { id, key, updatedAt, logoR2Key, faviconR2Key, ...settings } = row
  void id
  void key
  void updatedAt
  return c.json({
    ...settings,
    announcementEnabled: fromBool(settings.announcementEnabled as number),
    registrationOpen: fromBool(settings.registrationOpen as number),
    donationsEnabled: fromBool(settings.donationsEnabled as number),
    bankTransferEyebrow: settings.bankTransferEyebrow ?? bankTransferDefaults.bankTransferEyebrow,
    bankTransferTitle: settings.bankTransferTitle ?? bankTransferDefaults.bankTransferTitle,
    bankTransferBody: settings.bankTransferBody ?? bankTransferDefaults.bankTransferBody,
    bankAccountLabel: settings.bankAccountLabel ?? bankTransferDefaults.bankAccountLabel,
    bankName: settings.bankName ?? bankTransferDefaults.bankName,
    bankAccountName: settings.bankAccountName ?? bankTransferDefaults.bankAccountName,
    bankIban: settings.bankIban ?? bankTransferDefaults.bankIban,
    bankBic: settings.bankBic ?? bankTransferDefaults.bankBic,
    usBankAccountLabel: settings.usBankAccountLabel ?? usBankDefaults.usBankAccountLabel,
    usBankName: settings.usBankName ?? usBankDefaults.usBankName,
    usBankAccountName: settings.usBankAccountName ?? usBankDefaults.usBankAccountName,
    usBankRoutingNumber: settings.usBankRoutingNumber ?? usBankDefaults.usBankRoutingNumber,
    usBankAccountNumber: settings.usBankAccountNumber ?? usBankDefaults.usBankAccountNumber,
    usBankSwift: settings.usBankSwift ?? usBankDefaults.usBankSwift,
    registrationFeeLabel: settings.registrationFeeLabel ?? registrationFeeDefaults.registrationFeeLabel,
    registrationFeeTitle: settings.registrationFeeTitle ?? registrationFeeDefaults.registrationFeeTitle,
    registrationFeeBody: settings.registrationFeeBody ?? registrationFeeDefaults.registrationFeeBody,
    registrationFeeEmail: settings.registrationFeeEmail ?? registrationFeeDefaults.registrationFeeEmail,
    forumPackagesMenuLabel: settings.forumPackagesMenuLabel ?? forumPackageDefaults.forumPackagesMenuLabel,
    accommodationPackageLabel: settings.accommodationPackageLabel ?? forumPackageDefaults.accommodationPackageLabel,
    accommodationPackageTitle: settings.accommodationPackageTitle ?? forumPackageDefaults.accommodationPackageTitle,
    accommodationPackageIntro: settings.accommodationPackageIntro ?? forumPackageDefaults.accommodationPackageIntro,
    sponsorshipPackageLabel: settings.sponsorshipPackageLabel ?? forumPackageDefaults.sponsorshipPackageLabel,
    sponsorshipPackageTitle: settings.sponsorshipPackageTitle ?? forumPackageDefaults.sponsorshipPackageTitle,
    sponsorshipPackageIntro: settings.sponsorshipPackageIntro ?? forumPackageDefaults.sponsorshipPackageIntro,
    logoUrl: fileUrl(logoR2Key as string | null),
    faviconUrl: fileUrl(faviconR2Key as string | null),
    logoStorageId: (logoR2Key as string | null) ?? null,
    faviconStorageId: (faviconR2Key as string | null) ?? null,
  })
})

const CMS_CATEGORIES = new Set([
  "overview", "agenda", "resolution", "strategy", "partnership", "why",
  "challenge", "presentMoment", "engage", "speaker", "team", "advisory",
  "programme", "forumPackage", "media", "faq", "legal", "pageCopy", "sectionCopy",
])

api.get("/cms/published", async (c) => {
  const category = c.req.query("category") ?? ""
  if (!CMS_CATEGORIES.has(category)) {
    return c.json({ error: "Unknown category." }, 400)
  }
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM cmsEntries WHERE category = ? AND status = 'published' ORDER BY "order" ASC LIMIT 100`
  )
    .bind(category)
    .all<Record<string, unknown>>()
  return c.json(
    results.map((item) => ({
      _id: item.id,
      category: item.category,
      slug: item.slug,
      title: item.title,
      eyebrow: item.eyebrow,
      summary: item.summary,
      body: item.body,
      secondaryText: item.secondaryText,
      country: item.country,
      role: item.role,
      email: item.email,
      phone: item.phone,
      linkLabel: item.linkLabel,
      linkUrl: item.linkUrl,
      dateLabel: item.dateLabel,
      timeLabel: item.timeLabel,
      parentSlug: item.parentSlug,
      imageStorageId: item.imageR2Key,
      order: item.order,
      status: item.status,
      featured: fromBool(item.featured as number),
      imageUrl: fileUrl(item.imageR2Key as string | null),
    }))
  )
})

api.get("/banners", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM homeBanners WHERE status = 'published' ORDER BY "order" ASC LIMIT 12`
  ).all<Record<string, unknown>>()
  return c.json(
    results
      .filter((row) => row.imageR2Key)
      .map((row) => ({
        _id: row.id,
        title: row.title,
        imageStorageId: row.imageR2Key,
        imageUrl: fileUrl(row.imageR2Key as string),
        altText: row.altText,
        order: row.order,
        status: row.status,
        updatedAt: row.updatedAt,
      }))
  )
})

api.get("/programme", async (c) => {
  const days = await c.env.DB.prepare(
    `SELECT * FROM programmeDays WHERE status = 'published' ORDER BY "order" ASC LIMIT 10`
  ).all<Record<string, unknown>>()
  return c.json(
    await Promise.all(
      days.results.map(async (day) => {
        const sessions = await c.env.DB.prepare(
          `SELECT * FROM programmeSessions WHERE daySlug = ? AND status = 'published' ORDER BY "order" ASC LIMIT 50`
        )
          .bind(day.slug)
          .all<Record<string, unknown>>()
        return {
          _id: day.id,
          slug: day.slug,
          tabLabel: day.tabLabel,
          navigationLabel: day.navigationLabel,
          dateLabel: day.dateLabel,
          summary: day.summary,
          order: day.order,
          status: day.status,
          sessions: sessions.results.map((item) => ({
            _id: item.id,
            daySlug: item.daySlug,
            slug: item.slug,
            startTime: item.startTime,
            endTime: item.endTime,
            title: item.title,
            description: item.description,
            tag: item.tag,
            speakers: item.speakers,
            location: item.location,
            order: item.order,
            status: item.status,
          })),
        }
      })
    )
  )
})

api.get("/charts", async (c) => {
  const series = await c.env.DB.prepare(
    `SELECT * FROM chartSeries WHERE status = 'published' ORDER BY "order" ASC LIMIT 10`
  ).all<Record<string, unknown>>()
  return c.json(
    await Promise.all(
      series.results.map(async (item) => {
        const points = await c.env.DB.prepare(
          `SELECT * FROM chartPoints WHERE seriesSlug = ? ORDER BY "order" ASC LIMIT 100`
        )
          .bind(item.slug)
          .all<Record<string, unknown>>()
        return {
          _id: item.id,
          slug: item.slug,
          title: item.title,
          eyebrow: item.eyebrow,
          description: item.description,
          sourceLabel: item.sourceLabel,
          sourceUrl: item.sourceUrl,
          unit: item.unit,
          order: item.order,
          status: item.status,
          points: points.results.map((p) => ({
            _id: p.id,
            seriesSlug: p.seriesSlug,
            label: p.label,
            sublabel: p.sublabel,
            value: p.value,
            order: p.order,
          })),
        }
      })
    )
  )
})

api.get("/media", async (c) => {
  const sections = await c.env.DB.prepare(
    `SELECT * FROM mediaSections WHERE status = 'published' ORDER BY "order" ASC LIMIT 50`
  ).all<Record<string, unknown>>()
  return c.json(
    await Promise.all(
      sections.results.map(async (section) => {
        const items = await c.env.DB.prepare(
          `SELECT * FROM mediaItems WHERE sectionSlug = ? AND status = 'published' ORDER BY "order" ASC LIMIT 100`
        )
          .bind(section.slug)
          .all<Record<string, unknown>>()
        return {
          _id: section.id,
          slug: section.slug,
          name: section.name,
          description: section.description,
          order: section.order,
          items: items.results.map((item) => ({
            _id: item.id,
            sectionSlug: item.sectionSlug,
            slug: item.slug,
            title: item.title,
            description: item.description,
            mediaType:
              (item.mediaType as string | null) ??
              ((item.mimeType as string).startsWith("image/") ? "photo" : "document"),
            coverUrl: fileUrl(item.coverR2Key as string | null),
            fileUrl: fileUrl(item.fileR2Key as string | null),
            fileName: item.fileName,
            mimeType: item.mimeType,
            youtubeUrl: item.youtubeUrl ?? null,
            order: item.order,
          })),
        }
      })
    )
  )
})

api.get("/statements", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM statements WHERE status = 'published' ORDER BY releaseDate DESC, "order" ASC LIMIT 100`
  ).all<Record<string, unknown>>()
  return c.json(
    results
      .filter((row) => row.fileR2Key)
      .map((row) => ({
        _id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        releaseDate: row.releaseDate,
        fileName: row.fileName,
        mimeType: row.mimeType,
        order: row.order,
        fileUrl: fileUrl(row.fileR2Key as string),
      }))
  )
})

// --- Public writes (mirror convex/forms) ---

const SUBMISSION_TYPES = new Set([
  "registration", "support", "contact", "sponsorship", "volunteer", "media",
])

api.post("/submissions", async (c) => {
  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ accepted: false, reference: "" }, 400)
  }
  const reference = `PHS-${Date.now().toString(36).toUpperCase()}`
  if (typeof body.website === "string" && body.website) {
    return c.json({ accepted: true, reference })
  }
  const type = str(body.type, 40)
  const email = str(body.email, 240).toLowerCase()
  if (!SUBMISSION_TYPES.has(type) || !email.includes("@") || str(body.firstName, 120).length < 2) {
    return c.json({ accepted: false, reference })
  }
  if (!body.consent) return c.json({ accepted: false, reference })
  // Per-IP backstop alongside the per-email window below: one IP gets 10
  // submissions/hour, so a single actor cannot rotate emails to spam the desk.
  const ipAllowed = await checkRateLimit(
    c.env.DB,
    `submissions:ip:${clientIp(c.req.raw)}`,
    10,
    3_600_000
  )
  if (!ipAllowed) {
    return c.json({ accepted: false, reference }, 429)
  }
  const timestamp = now()
  const recent = await c.env.DB.prepare(
    "SELECT createdAt FROM submissions WHERE email = ? ORDER BY createdAt DESC LIMIT 1"
  )
    .bind(email)
    .first<{ createdAt: number }>()
  if (recent && timestamp - recent.createdAt < 60_000) {
    return c.json({ accepted: false, reference })
  }
  await c.env.DB.prepare(
    `INSERT INTO submissions (id, type, firstName, lastName, email, phone, organization, attendingAs, subject, message, consent, status, adminNote, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', '', ?, ?)`
  )
    .bind(
      newId(),
      type,
      str(body.firstName, 120),
      str(body.lastName, 120),
      email,
      str(body.phone, 80),
      str(body.organization, 200),
      str(body.attendingAs, 120),
      str(body.subject, 200),
      str(body.message, 5000),
      asBool(body.consent),
      timestamp,
      timestamp
    )
    .run()
  log(c.req, "submission.accepted", { type, reference })
  return c.json({ accepted: true, reference })
})

// --- R2 file serving + upload chain (replaces Convex ctx.storage) ---

api.get("/files/:key", async (c) => {
  // ACCEPTED DECISION (constrain-or-document resolution = document): draft
  // assets are publicly fetchable by anyone holding the unguessable R2 key
  // (`images/<uuid>…`, `docs/<uuid>…`). No per-status auth check is applied
  // here because published pages must hotlink these URLs without a session,
  // and the random UUID segment is the capability. Do not put sensitive
  // material in the asset library; sensitivity belongs behind an admin-only
  // route, not in R2 keys served here.
  const key = decodeURIComponent(c.req.param("key"))
  if (!key || key.includes("..")) return c.json({ error: "Not found." }, 404)
  const object = await c.env.SUMMIT_ASSETS.get(key)
  if (!object) return c.json({ error: "Not found." }, 404)
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set("etag", object.httpEtag)
  headers.set("Cache-Control", "public, max-age=31536000, immutable")
  return new Response(object.body, { headers })
})

const ASSET_CATEGORIES = new Set(["logo", "portrait", "media", "document", "general"])

api.post("/assets/upload", async (c) => {
  const gate = await requireAdmin({
    req: c.req.raw,
    env: c.env,
    set: (k, v) => c.set(k as "adminEmail" | "actorId" | "principal", v),
  })
  if (gate) return gate
  let form: FormData
  try {
    form = await c.req.formData()
  } catch {
    return c.json({ error: "Expected multipart form data." }, 400)
  }
  const file = form.get("file")
  const altText = str(form.get("altText"), 300)
  const category = str(form.get("category"), 20)
  if (!(file instanceof File) || altText.length < 3 || !ASSET_CATEGORIES.has(category)) {
    return c.json({ error: "File, alt text (3+ chars), and a valid category are required." }, 400)
  }
  if (!ALLOWED_UPLOAD_MIME.has(file.type) || file.size > MAX_UPLOAD_BYTES || file.size < 1) {
    return c.json({ error: "File type or size is not allowed." }, 400)
  }
  const key = r2KeyFromUpload(file.name || "file", file.type)
  await c.env.SUMMIT_ASSETS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  })
  const timestamp = now()
  const id = newId()
  await c.env.DB.prepare(
    `INSERT INTO assets (id, r2Key, fileName, mimeType, byteSize, altText, category, status, uploadedBy, uploadedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`
  )
    .bind(id, key, (file.name || "file").slice(0, 180), file.type, file.size, altText, category, c.get("adminEmail"), timestamp)
    .run()
  await writeAudit(c.env.DB, { id: c.get("actorId"), email: c.get("adminEmail") }, {
    action: "upload",
    entityType: "asset",
    entityId: id,
    summary: `[${c.get("principal")}] Uploaded ${file.name || "file"}`,
  })
  return c.json({
    _id: id,
    storageId: key,
    fileName: file.name,
    mimeType: file.type,
    byteSize: file.size,
    altText,
    category,
    url: fileUrl(key),
    uploadedAt: timestamp,
  })
})

api.get("/assets", async (c) => {
  const gate = await requireAdmin({
    req: c.req.raw,
    env: c.env,
    set: (k, v) => c.set(k as "adminEmail" | "actorId" | "principal", v),
  })
  if (gate) return gate
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM assets ORDER BY uploadedAt DESC LIMIT 200`
  ).all<Record<string, unknown>>()
  return c.json(
    results.map((item) => ({
      _id: item.id,
      storageId: item.r2Key,
      fileName: item.fileName,
      mimeType: item.mimeType,
      byteSize: item.byteSize,
      altText: item.altText,
      category: item.category,
      url: fileUrl(item.r2Key as string),
      uploadedAt: item.uploadedAt,
    }))
  )
})

api.delete("/assets/:id", async (c) => {
  const gate = await requireAdmin({
    req: c.req.raw,
    env: c.env,
    set: (k, v) => c.set(k as "adminEmail" | "actorId" | "principal", v),
  })
  if (gate) return gate
  const row = await c.env.DB.prepare("SELECT * FROM assets WHERE id = ?")
    .bind(c.req.param("id"))
    .first<Record<string, unknown>>()
  if (!row) return c.json({ error: "Not found." }, 404)
  const r2Key = row.r2Key as string
  // Mirror convex/assets.ts remove(): refuse to orphan content that still
  // references this key. Checks run before the R2 delete so a 409 leaves
  // both R2 and D1 untouched.
  const [
    cmsReference,
    bannerReference,
    regionalReference,
    organizationReference,
    mediaCoverReference,
    mediaFileReference,
    statementReference,
  ] = await Promise.all([
    c.env.DB.prepare("SELECT id FROM cmsEntries WHERE imageR2Key = ? LIMIT 1").bind(r2Key).first<{ id: string }>(),
    c.env.DB.prepare("SELECT id FROM homeBanners WHERE imageR2Key = ? LIMIT 1").bind(r2Key).first<{ id: string }>(),
    c.env.DB.prepare("SELECT id FROM regionalCountries WHERE imageR2Key = ? LIMIT 1").bind(r2Key).first<{ id: string }>(),
    c.env.DB.prepare("SELECT id FROM organizations WHERE logoR2Key = ? LIMIT 1").bind(r2Key).first<{ id: string }>(),
    c.env.DB.prepare("SELECT id FROM mediaItems WHERE coverR2Key = ? LIMIT 1").bind(r2Key).first<{ id: string }>(),
    c.env.DB.prepare("SELECT id FROM mediaItems WHERE fileR2Key = ? LIMIT 1").bind(r2Key).first<{ id: string }>(),
    c.env.DB.prepare("SELECT id FROM statements WHERE fileR2Key = ? LIMIT 1").bind(r2Key).first<{ id: string }>(),
  ])
  if (
    cmsReference ||
    bannerReference ||
    regionalReference ||
    organizationReference ||
    mediaCoverReference ||
    mediaFileReference ||
    statementReference
  ) {
    return c.json(
      { error: "This file is attached to published content. Detach it before deleting." },
      409
    )
  }
  await c.env.SUMMIT_ASSETS.delete(r2Key)
  await c.env.DB.prepare("DELETE FROM assets WHERE id = ?").bind(row.id).run()
  await writeAudit(c.env.DB, { id: c.get("actorId"), email: c.get("adminEmail") }, {
    action: "delete",
    entityType: "asset",
    entityId: row.id as string,
    summary: `[${c.get("principal")}] Deleted ${row.fileName}`,
  })
  return c.json({ deleted: true })
})

function inferOrganizationRole(name: string, slug = "") {
  const normalized = name.toLowerCase()
  const normalizedSlug = slug.toLowerCase()
  if (
    normalized.includes("bureau of human rights and justice") ||
    normalizedSlug.includes("bureau-human-rights-justice")
  ) {
    return "organizing" as const
  }
  if (normalized.includes("forcefield") || normalizedSlug.includes("interfaith-forcefield"))
    return "managing" as const
  return "supporting" as const
}

api.get("/regional", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM regionalCountries WHERE status = 'published' ORDER BY "order" ASC LIMIT 50`
  ).all<Record<string, unknown>>()
  return c.json(
    results.map((item) => ({
      _id: item.id,
      slug: item.slug,
      name: item.name,
      code: item.code,
      eyebrow: item.eyebrow,
      headline: item.headline,
      summary: item.summary,
      detail: item.detail,
      sourceUrl: item.sourceUrl,
      imageUrl: fileUrl(item.imageR2Key as string | null),
      order: item.order,
    }))
  )
})

api.get("/organizations", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM organizations WHERE status = 'published' ORDER BY "order" ASC LIMIT 100`
  ).all<Record<string, unknown>>()
  return c.json(
    results.map((item) => ({
      _id: item.id,
      slug: item.slug,
      name: item.name,
      organizationRole:
        (item.organizationRole as string | null) ??
        inferOrganizationRole(item.name as string, item.slug as string),
      kind: item.kind,
      tier: item.tier,
      description: item.description,
      websiteUrl: item.websiteUrl,
      logoUrl: fileUrl(item.logoR2Key as string | null),
      order: item.order,
    }))
  )
})

// --- Mail ingress (mirror convex/http + mail ingest/delivery) ---

api.post("/mail/inbound", async (c) => {
  if (!requireMailSecret(c.env, c.req.raw)) {
    return c.json({ error: "Unauthorized." }, 401)
  }
  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: "Invalid JSON." }, 400)
  }
  const messageId = str(body.messageId, 1000)
  const fromAddress = str(body.fromAddress, 500)
  if (!messageId || !fromAddress) {
    return c.json({ error: "messageId and fromAddress are required." }, 400)
  }
  const existing = await c.env.DB.prepare("SELECT id FROM mailMessages WHERE messageId = ?")
    .bind(messageId)
    .first<{ id: string }>()
  if (existing) return c.json({ id: existing.id, duplicate: true })
  const timestamp = now()
  const id = newId()
  const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 50) : []
  await c.env.DB.prepare(
    `INSERT INTO mailMessages (id, direction, messageId, inReplyTo, "references", fromAddress, fromName, toAddresses, ccAddresses, subject, textBody, htmlBody, deliveryStatus, isRead, createdAt, updatedAt)
     VALUES (?, 'incoming', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', 0, ?, ?)`
  )
    .bind(
      id,
      messageId,
      str(body.inReplyTo, 1000) || null,
      str(body.references, 4000) || null,
      fromAddress,
      str(body.fromName, 500),
      JSON.stringify((Array.isArray(body.toAddresses) ? body.toAddresses : []).filter((a): a is string => typeof a === "string").slice(0, 50)),
      JSON.stringify((Array.isArray(body.ccAddresses) ? body.ccAddresses : []).filter((a): a is string => typeof a === "string").slice(0, 50)),
      str(body.subject, 2000) || "(no subject)",
      str(body.textBody, 300_000),
      str(body.htmlBody, 300_000),
      typeof body.receivedAt === "number" && Number.isFinite(body.receivedAt) ? body.receivedAt : timestamp,
      timestamp
    )
    .run()
  for (const item of attachments) {
    if (!item || typeof item !== "object") continue
    const candidate = item as Record<string, unknown>
    await c.env.DB.prepare(
      "INSERT INTO mailAttachments (id, messageId, fileName, mimeType, byteSize, contentId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        newId(),
        id,
        str(candidate.fileName, 500) || "attachment",
        str(candidate.mimeType, 200) || "application/octet-stream",
        typeof candidate.byteSize === "number" && Number.isFinite(candidate.byteSize) ? Math.max(0, candidate.byteSize) : 0,
        str(candidate.contentId, 500) || null,
        timestamp
      )
      .run()
  }
  return c.json({ id, duplicate: false })
})

const FAILURE_EVENTS = new Set([
  "hard_bounce", "hardbounce", "soft_bounce", "softbounce", "blocked", "invalid", "error", "spam",
])

api.post("/mail/delivery", async (c) => {
  if (!requireMailSecret(c.env, c.req.raw)) {
    return c.json({ error: "Unauthorized." }, 401)
  }
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: "Invalid JSON." }, 400)
  }
  const events = (Array.isArray(body) ? body : [body]).slice(0, 500)
  const results: Array<{ matched: boolean; status?: string }> = []
  for (const item of events) {
    if (!item || typeof item !== "object") continue
    const record = item as Record<string, unknown>
    const rawId = str(record["message-id"], 1000)
    const email = str(record.email, 500).toLowerCase()
    const event = str(record.event, 100).toLowerCase()
    const variants = rawId.startsWith("<") && rawId.endsWith(">")
      ? [rawId, rawId.slice(1, -1)]
      : [rawId, `<${rawId}>`]
    let message: Record<string, unknown> | null = null
    for (const candidate of variants) {
      message = await c.env.DB.prepare("SELECT * FROM mailMessages WHERE messageId = ?")
        .bind(candidate)
        .first<Record<string, unknown>>()
      if (message) break
    }
    if (!message || message.direction !== "outgoing") {
      results.push({ matched: false })
      continue
    }
    const delivered = new Set<string>(JSON.parse((message.deliveredAddresses as string) || "[]"))
    const failed = new Set<string>(JSON.parse((message.failedAddresses as string) || "[]"))
    const deferred = new Set<string>(JSON.parse((message.deferredAddresses as string) || "[]"))
    if (event === "delivered") {
      delivered.add(email)
      failed.delete(email)
      deferred.delete(email)
    } else if (event === "deferred") {
      deferred.add(email)
    } else if (FAILURE_EVENTS.has(event)) {
      failed.add(email)
      deferred.delete(email)
    }
    const recipients = new Set<string>([
      ...JSON.parse((message.toAddresses as string) || "[]"),
      ...JSON.parse((message.ccAddresses as string) || "[]"),
      ...JSON.parse((message.bccAddresses as string) || "[]"),
    ])
    const resolved = [...delivered, ...failed].filter((address) => recipients.has(address)).length
    const deliveryStatus =
      failed.size > 0 ? "failed" : delivered.size >= recipients.size && recipients.size > 0 ? "sent" : "queued"
    await c.env.DB.prepare(
      "UPDATE mailMessages SET deliveredAddresses = ?, failedAddresses = ?, deferredAddresses = ?, deliveryStatus = ?, providerResponse = ?, updatedAt = ? WHERE id = ?"
    )
      .bind(
        JSON.stringify([...delivered]),
        JSON.stringify([...failed]),
        JSON.stringify([...deferred]),
        deliveryStatus,
        str(record.detail, 2000) || `${event} for ${email}`,
        now(),
        message.id
      )
      .run()
    results.push({
      matched: true,
      status: deliveryStatus + (resolved < recipients.size ? "_partial" : ""),
    })
  }
  return c.json(results)
})

// --- Admin mutations (gated by ADMIN_API_TOKEN) ---

const CMS_TEXT_FIELDS = [
  "category", "slug", "title", "eyebrow", "summary", "body", "secondaryText",
  "country", "role", "email", "phone", "linkLabel", "linkUrl", "dateLabel",
  "timeLabel", "parentSlug",
] as const

api.get("/admin/cms", async (c) => {
  const gate = await requireAdmin({
    req: c.req.raw,
    env: c.env,
    set: (k, v) => c.set(k as "adminEmail" | "actorId" | "principal", v),
  })
  if (gate) return gate
  const category = c.req.query("category") ?? ""
  if (!CMS_CATEGORIES.has(category)) return c.json({ error: "Unknown category." }, 400)
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM cmsEntries WHERE category = ? ORDER BY "order" ASC LIMIT 200`
  )
    .bind(category)
    .all<Record<string, unknown>>()
  return c.json(
    results.map((item) => ({
      _id: item.id,
      ...Object.fromEntries(CMS_TEXT_FIELDS.map((f) => [f, item[f]])),
      imageStorageId: item.imageR2Key,
      order: item.order,
      status: item.status,
      featured: fromBool(item.featured as number),
      imageUrl: fileUrl(item.imageR2Key as string | null),
    }))
  )
})

api.post("/admin/cms/save", async (c) => {
  const gate = await requireAdmin({
    req: c.req.raw,
    env: c.env,
    set: (k, v) => c.set(k as "adminEmail" | "actorId" | "principal", v),
  })
  if (gate) return gate
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body || !CMS_CATEGORIES.has(str(body.category, 40))) {
    return c.json({ error: "Invalid entry." }, 400)
  }
  const timestamp = now()
  const values = CMS_TEXT_FIELDS.map((f) => str(body[f], 5000))
  const order = Number.isFinite(Number(body.order)) ? Number(body.order) : 0
  const status = body.status === "published" ? "published" : "draft"
  const id = typeof body.id === "string" && body.id ? body.id : newId()
  if (status === "published" && body.category === "speaker" && body.featured) {
    const featured = await c.env.DB.prepare(
      "SELECT id FROM cmsEntries WHERE category = 'speaker' AND status = 'published' AND featured = 1 AND id != ? LIMIT 3"
    )
      .bind(id)
      .all()
    if (featured.results.length >= 3) {
      return c.json({ error: "Only three published speakers can be featured on the homepage." }, 400)
    }
  }
  const existing = await c.env.DB.prepare("SELECT id FROM cmsEntries WHERE id = ?")
    .bind(id)
    .first<{ id: string }>()
  if (existing) {
    await c.env.DB.prepare(
      `UPDATE cmsEntries SET category = ?, slug = ?, title = ?, eyebrow = ?, summary = ?, body = ?, secondaryText = ?, country = ?, role = ?, email = ?, phone = ?, linkLabel = ?, linkUrl = ?, dateLabel = ?, timeLabel = ?, parentSlug = ?, "order" = ?, status = ?, featured = ?, updatedAt = ? WHERE id = ?`
    )
      .bind(...values, order, status, asBool(body.featured), timestamp, id)
      .run()
  } else {
    await c.env.DB.prepare(
      `INSERT INTO cmsEntries (id, category, slug, title, eyebrow, summary, body, secondaryText, country, role, email, phone, linkLabel, linkUrl, dateLabel, timeLabel, parentSlug, "order", status, featured, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, ...values, order, status, asBool(body.featured), timestamp)
      .run()
  }
  await writeAudit(c.env.DB, { id: c.get("actorId"), email: c.get("adminEmail") }, {
    action: existing ? "update" : "create",
    entityType: "cmsEntry",
    entityId: id,
    summary: `[${c.get("principal")}] ${existing ? "Updated" : "Created"} ${str(body.title, 200)}`,
  })
  return c.json({ _id: id })
})

api.delete("/admin/cms/:id", async (c) => {
  const gate = await requireAdmin({
    req: c.req.raw,
    env: c.env,
    set: (k, v) => c.set(k as "adminEmail" | "actorId" | "principal", v),
  })
  if (gate) return gate
  const row = await c.env.DB.prepare("SELECT id, title FROM cmsEntries WHERE id = ?")
    .bind(c.req.param("id"))
    .first<{ id: string; title: string }>()
  if (row) await c.env.DB.prepare("DELETE FROM cmsEntries WHERE id = ?").bind(row.id).run()
  await writeAudit(c.env.DB, { id: c.get("actorId"), email: c.get("adminEmail") }, {
    action: "delete",
    entityType: "cmsEntry",
    entityId: c.req.param("id"),
    summary: `[${c.get("principal")}] Deleted ${row?.title ?? "content entry"}`,
  })
  return c.json({ deleted: true })
})

api.route("/admin", admin)

export default api
