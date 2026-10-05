import { Hono, type Context } from "hono"

import { adminIdentity, getAuth, mailIdentity } from "./auth"
import {
  asBool,
  fileUrl,
  fromBool,
  newId,
  now,
  str,
  writeAudit,
  type SummitEnv,
} from "./db"

// Admin API replacing the Convex admin/*, settings.save, and *ForAdmin
// functions used by components/admin/admin-portal.tsx. Payload shapes accept
// the same arguments the portal previously sent to Convex mutations
// (storage ids are R2 keys), and saves return `{ _id }` like Convex did.
// Every route is session-guarded (mail desk additionally allows mail_manager).

type Variables = { actorId: string; actorEmail: string }

const admin = new Hono<{ Bindings: SummitEnv; Variables: Variables }>()

type AdminContext = Context<{ Bindings: SummitEnv; Variables: Variables }>

async function gate(c: AdminContext, mail: boolean): Promise<Response | null> {
  const identity = mail
    ? await mailIdentity(c.env, c.req.raw)
    : await adminIdentity(c.env, c.req.raw)
  if (identity instanceof Response) return identity
  c.set("actorId", identity.user.id)
  c.set("actorEmail", identity.user.email)
  return null
}

async function audit(
  c: { env: SummitEnv } & { get: (key: "actorId" | "actorEmail") => string },
  entry: { action: string; entityType: string; entityId: string; summary: string }
) {
  await writeAudit(
    c.env.DB,
    { id: c.get("actorId"), email: c.get("actorEmail") },
    entry
  )
}

const err = (message: string, status = 400) =>
  Response.json({ error: message }, { status })

// --- Access + team (mirror convex/admin) ---

admin.get("/access", async (c) => {
  const { getSessionUser } = await import("./auth")
  const user = await getSessionUser(c.env, c.req.raw)
  const active = await c.env.DB.prepare(
    "SELECT id FROM adminUsers WHERE status = 'active' LIMIT 1"
  ).first<{ id: string }>()
  if (!user) {
    return c.json({ signedIn: false, bootstrapAvailable: !active, admin: null })
  }
  const row = await c.env.DB.prepare("SELECT * FROM adminUsers WHERE authUserId = ?")
    .bind(user.id)
    .first<Record<string, unknown>>()
  return c.json({
    signedIn: true,
    bootstrapAvailable: !active,
    admin:
      row && row.status === "active"
        ? { name: row.name, email: row.email, role: row.role }
        : null,
  })
})

admin.post("/bootstrap", async (c) => {
  const { getSessionUser } = await import("./auth")
  const user = await getSessionUser(c.env, c.req.raw)
  if (!user) return err("Sign in is required.", 401)
  const active = await c.env.DB.prepare(
    "SELECT id FROM adminUsers WHERE status = 'active' LIMIT 1"
  ).first<{ id: string }>()
  if (active) return err("The initial administrator has already been created.", 400)
  const timestamp = now()
  await c.env.DB.prepare(
    "INSERT INTO adminUsers (id, authUserId, email, name, role, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'administrator', 'active', ?, ?)"
  )
    .bind(newId(), user.id, user.email, user.name, timestamp, timestamp)
    .run()
  return c.json(true)
})

admin.get("/team", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM adminUsers ORDER BY email ASC LIMIT 100"
  ).all<Record<string, unknown>>()
  return c.json(
    results.map((m) => ({
      _id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      status: m.status,
      createdAt: m.createdAt,
    }))
  )
})

admin.post("/team/provision", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const me = await c.env.DB.prepare("SELECT * FROM adminUsers WHERE authUserId = ?")
    .bind(c.get("actorId"))
    .first<Record<string, unknown>>()
  if (me?.role !== "administrator") {
    return err("Only administrators can create team accounts.", 403)
  }
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body) return err("Invalid request.", 400)
  const name = str(body.name, 120)
  const email = str(body.email, 240).toLowerCase()
  const password = typeof body.password === "string" ? body.password : ""
  const role = str(body.role, 20)
  if (name.length < 2 || !email.includes("@")) return err("Enter a valid name and email address.", 400)
  if (password.length < 10) return err("Temporary passwords must contain at least 10 characters.", 400)
  if (!["administrator", "editor", "mail_manager"].includes(role)) return err("Unknown role.", 400)
  const existing = await c.env.DB.prepare("SELECT id FROM adminUsers WHERE email = ?")
    .bind(email)
    .first<{ id: string }>()
  if (existing) return err("This email already has a team account.", 400)
  const auth = getAuth(c.env, new URL(c.req.url).origin)
  let authUserId: string
  try {
    const result = await auth.api.signUpEmail({
      body: { name, email, password },
      headers: c.req.raw.headers,
    })
    authUserId = result.user.id
  } catch (error) {
    return err(
      error instanceof Error ? error.message : "The authentication account could not be created.",
      400
    )
  }
  const timestamp = now()
  const id = newId()
  await c.env.DB.prepare(
    "INSERT INTO adminUsers (id, authUserId, email, name, role, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)"
  )
    .bind(id, authUserId, email, name, role, timestamp, timestamp)
    .run()
  await audit(c, {
    action: "create",
    entityType: "adminUser",
    entityId: id,
    summary: `Created ${role} account for ${email}`,
  })
  return c.json({ _id: id })
})

admin.post("/team/status", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const me = await c.env.DB.prepare("SELECT * FROM adminUsers WHERE authUserId = ?")
    .bind(c.get("actorId"))
    .first<Record<string, unknown>>()
  if (me?.role !== "administrator") {
    return err("Only administrators can change account access.", 403)
  }
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  const status = body?.status === "active" ? "active" : body?.status === "suspended" ? "suspended" : ""
  if (!status || typeof body?.id !== "string") return err("Invalid request.", 400)
  const target = await c.env.DB.prepare("SELECT * FROM adminUsers WHERE id = ?")
    .bind(body.id)
    .first<Record<string, unknown>>()
  if (!target) return err("Team account not found.", 404)
  if (target.id === me?.id && status === "suspended") {
    return err("You cannot suspend your own account.", 400)
  }
  if (target.role === "administrator" && target.status === "active" && status === "suspended") {
    const { results } = await c.env.DB.prepare(
      "SELECT role FROM adminUsers WHERE status = 'active' LIMIT 100"
    ).all<{ role: string }>()
    if (results.filter((m) => m.role === "administrator").length <= 1) {
      return err("At least one active administrator is required.", 400)
    }
  }
  await c.env.DB.prepare("UPDATE adminUsers SET status = ?, updatedAt = ? WHERE id = ?")
    .bind(status, now(), target.id)
    .run()
  await audit(c, {
    action: "update",
    entityType: "adminUser",
    entityId: target.id as string,
    summary: `${status === "active" ? "Activated" : "Suspended"} ${target.email}`,
  })
  return c.json(null)
})

admin.post("/team/role", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const me = await c.env.DB.prepare("SELECT * FROM adminUsers WHERE authUserId = ?")
    .bind(c.get("actorId"))
    .first<Record<string, unknown>>()
  if (me?.role !== "administrator") {
    return err("Only administrators can change roles.", 403)
  }
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  const role = str(body?.role, 20)
  if (!["administrator", "editor", "mail_manager"].includes(role) || typeof body?.id !== "string") {
    return err("Invalid request.", 400)
  }
  const target = await c.env.DB.prepare("SELECT * FROM adminUsers WHERE id = ?")
    .bind(body.id)
    .first<Record<string, unknown>>()
  if (!target) return err("Team account not found.", 404)
  if (target.role === "administrator" && role === "editor") {
    const { results } = await c.env.DB.prepare(
      "SELECT role FROM adminUsers WHERE status = 'active' LIMIT 100"
    ).all<{ role: string }>()
    if (results.filter((m) => m.role === "administrator").length <= 1) {
      return err("At least one active administrator is required.", 400)
    }
  }
  await c.env.DB.prepare("UPDATE adminUsers SET role = ?, updatedAt = ? WHERE id = ?")
    .bind(role, now(), target.id)
    .run()
  await audit(c, {
    action: "update",
    entityType: "adminUser",
    entityId: target.id as string,
    summary: `Changed ${target.email} to ${role}`,
  })
  return c.json(null)
})

admin.get("/dashboard", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const count = async (table: string) =>
    (await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>())?.n ?? 0
  const recent = await c.env.DB.prepare(
    "SELECT * FROM submissions ORDER BY createdAt DESC LIMIT 6"
  ).all<Record<string, unknown>>()
  const [content, submissions, donations, assets] = await Promise.all([
    count("cmsEntries"),
    count("submissions"),
    count("donations"),
    count("assets"),
  ])
  return c.json({
    content,
    submissions,
    donations,
    assets,
    recentSubmissions: recent.results.map((item) => ({
      _id: item.id,
      type: item.type,
      name: `${item.firstName} ${item.lastName}`.trim(),
      email: item.email,
      status: item.status,
      createdAt: item.createdAt,
    })),
  })
})

admin.get("/submissions", async (c) => {
  const blocked = await gate(c, true)
  if (blocked) return blocked
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM submissions ORDER BY createdAt DESC LIMIT 200"
  ).all<Record<string, unknown>>()
  return c.json(
    results.map((item) => ({
      _id: item.id,
      _creationTime: item.createdAt,
      type: item.type,
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      phone: item.phone,
      organization: item.organization,
      subject: item.subject,
      message: item.message,
      status: item.status,
      adminNote: item.adminNote,
      createdAt: item.createdAt,
    }))
  )
})

const SUBMISSION_STATUS = new Set(["new", "in_progress", "resolved", "archived"])

admin.post("/submissions/update", async (c) => {
  const blocked = await gate(c, true)
  if (blocked) return blocked
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (typeof body?.id !== "string" || !SUBMISSION_STATUS.has(str(body.status, 20))) {
    return err("Invalid request.", 400)
  }
  await c.env.DB.prepare("UPDATE submissions SET status = ?, adminNote = ?, updatedAt = ? WHERE id = ?")
    .bind(str(body.status, 20), str(body.adminNote, 2000), now(), body.id)
    .run()
  await audit(c, {
    action: "update",
    entityType: "submission",
    entityId: body.id,
    summary: `Submission marked ${body.status}`,
  })
  return c.json(null)
})

admin.get("/donations", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM donations ORDER BY createdAt DESC LIMIT 200"
  ).all<Record<string, unknown>>()
  return c.json(
    results.map((item) => ({
      _id: item.id,
      reference: item.reference,
      donorName: item.donorName,
      donorEmail: item.donorEmail,
      amountCents: item.amountCents,
      currency: item.currency,
      status: item.status,
      createdAt: item.createdAt,
    }))
  )
})

admin.get("/audit", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM auditEvents ORDER BY createdAt DESC LIMIT 100"
  ).all<Record<string, unknown>>()
  return c.json(
    results.map((item) => ({
      _id: item.id,
      actorEmail: item.actorEmail,
      action: item.action,
      entityType: item.entityType,
      summary: item.summary,
      createdAt: item.createdAt,
    }))
  )
})

// --- Banners (mirror convex/banners) ---

admin.get("/banners", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM homeBanners ORDER BY "order" ASC LIMIT 50`
  ).all<Record<string, unknown>>()
  return c.json(
    results.map((row) => ({
      _id: row.id,
      title: row.title,
      imageStorageId: row.imageR2Key,
      imageUrl: fileUrl(row.imageR2Key as string | null),
      altText: row.altText,
      order: row.order,
      status: row.status,
      updatedAt: row.updatedAt,
    }))
  )
})

admin.post("/banners/save", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body) return err("Invalid request.", 400)
  const title = str(body.title, 200)
  const altText = str(body.altText, 300)
  const order = typeof body.order === "number" ? body.order : NaN
  const status = body.status === "published" ? "published" : "draft"
  const imageStorageId = str(body.imageStorageId, 200)
  if (title.length < 2) return err("Give this banner a short internal name.", 400)
  if (altText.length < 8) return err("Add descriptive alternative text for this banner.", 400)
  if (!Number.isInteger(order) || order < 0 || order > 999) {
    return err("Display order must be a whole number from 0 to 999.", 400)
  }
  const asset = imageStorageId
    ? await c.env.DB.prepare("SELECT * FROM assets WHERE r2Key = ?")
        .bind(imageStorageId)
        .first<Record<string, unknown>>()
    : null
  if (!asset || !(asset.mimeType as string).startsWith("image/")) {
    return err("Choose a managed image from the media library.", 400)
  }
  const timestamp = now()
  const id = typeof body.id === "string" && body.id ? body.id : newId()
  const existing = await c.env.DB.prepare("SELECT id FROM homeBanners WHERE id = ?")
    .bind(id)
    .first<{ id: string }>()
  if (existing) {
    await c.env.DB.prepare(
      `UPDATE homeBanners SET title = ?, imageR2Key = ?, altText = ?, "order" = ?, status = ?, updatedAt = ? WHERE id = ?`
    )
      .bind(title, imageStorageId, altText, order, status, timestamp, id)
      .run()
  } else {
    await c.env.DB.prepare(
      `INSERT INTO homeBanners (id, title, imageR2Key, altText, "order", status, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, title, imageStorageId, altText, order, status, timestamp)
      .run()
  }
  await audit(c, {
    action: existing ? "update" : "create",
    entityType: "homeBanner",
    entityId: id,
    summary: `${status === "published" ? "Published" : "Saved"} banner ${title}`,
  })
  return c.json({ _id: id })
})

admin.delete("/banners/:id", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const row = await c.env.DB.prepare("SELECT id, title FROM homeBanners WHERE id = ?")
    .bind(c.req.param("id"))
    .first<{ id: string; title: string }>()
  if (row) await c.env.DB.prepare("DELETE FROM homeBanners WHERE id = ?").bind(row.id).run()
  await audit(c, {
    action: "delete",
    entityType: "homeBanner",
    entityId: c.req.param("id"),
    summary: `Deleted banner ${row?.title ?? c.req.param("id")}`,
  })
  return c.json(null)
})

// --- Media library (mirror convex/media) ---

admin.get("/media", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const [sections, items] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM mediaSections ORDER BY "order" ASC LIMIT 100`).all<Record<string, unknown>>(),
    c.env.DB.prepare(`SELECT * FROM mediaItems ORDER BY sectionSlug ASC, "order" ASC LIMIT 500`).all<Record<string, unknown>>(),
  ])
  return c.json({
    sections: sections.results.map((s) => ({
      _id: s.id,
      slug: s.slug,
      name: s.name,
      description: s.description,
      order: s.order,
      status: s.status,
    })),
    items: items.results.map((item) => ({
      _id: item.id,
      sectionSlug: item.sectionSlug,
      slug: item.slug,
      title: item.title,
      description: item.description,
      mediaType: item.mediaType,
      coverStorageId: item.coverR2Key,
      fileStorageId: item.fileR2Key,
      fileName: item.fileName,
      mimeType: item.mimeType,
      youtubeUrl: item.youtubeUrl,
      order: item.order,
      status: item.status,
    })),
  }
  )
})

admin.post("/media/sections/save", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body) return err("Invalid request.", 400)
  const slug = str(body.slug, 120)
  const name = str(body.name, 200)
  if (!slug || !name) return err("Section name and slug are required.", 400)
  const conflict = await c.env.DB.prepare("SELECT id FROM mediaSections WHERE slug = ?")
    .bind(slug)
    .first<{ id: string }>()
  const id = typeof body.id === "string" && body.id ? body.id : newId()
  if (conflict && conflict.id !== id) {
    return err("That publication section slug is already in use.", 400)
  }
  const timestamp = now()
  const order = Number.isFinite(Number(body.order)) ? Number(body.order) : 0
  const status = body.status === "published" ? "published" : "draft"
  if (conflict && conflict.id === id) {
    await c.env.DB.prepare(
      `UPDATE mediaSections SET slug = ?, name = ?, description = ?, "order" = ?, status = ?, updatedAt = ? WHERE id = ?`
    )
      .bind(slug, name, str(body.description, 2000), order, status, timestamp, id)
      .run()
  } else {
    await c.env.DB.prepare(
      `INSERT INTO mediaSections (id, slug, name, description, "order", status, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, slug, name, str(body.description, 2000), order, status, timestamp)
      .run()
  }
  await audit(c, {
    action: body.id ? "update" : "create",
    entityType: "mediaSection",
    entityId: id,
    summary: `${body.id ? "Updated" : "Created"} ${name}`,
  })
  return c.json({ _id: id })
})

admin.delete("/media/sections/:id", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const section = await c.env.DB.prepare("SELECT * FROM mediaSections WHERE id = ?")
    .bind(c.req.param("id"))
    .first<Record<string, unknown>>()
  if (section) {
    const attached = await c.env.DB.prepare("SELECT id FROM mediaItems WHERE sectionSlug = ? LIMIT 1")
      .bind(section.slug)
      .first<{ id: string }>()
    if (attached) {
      return err("Move or delete this section’s publications before deleting it.", 400)
    }
    await c.env.DB.prepare("DELETE FROM mediaSections WHERE id = ?").bind(section.id).run()
  }
  await audit(c, {
    action: "delete",
    entityType: "mediaSection",
    entityId: c.req.param("id"),
    summary: `Deleted ${section?.name ?? "media section"}`,
  })
  return c.json(null)
})

const MEDIA_TYPES = new Set(["document", "photo", "video"])

admin.post("/media/items/save", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body) return err("Invalid request.", 400)
  const id = typeof body.id === "string" && body.id ? body.id : newId()
  const sectionSlug = str(body.sectionSlug, 120)
  const title = str(body.title, 300)
  const mediaType = str(body.mediaType, 20)
  const slug = str(body.slug, 160) || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  if (!sectionSlug || !title) return err("Choose a section and enter a title.", 400)
  if (!slug) return err("Enter a URL slug using letters or numbers.", 400)
  if (!MEDIA_TYPES.has(mediaType)) return err("Unknown media type.", 400)
  const coverStorageId = mediaType === "document" ? str(body.coverStorageId, 200) || null : null
  const fileStorageId = mediaType === "video" ? null : str(body.fileStorageId, 200) || null
  const section = await c.env.DB.prepare("SELECT id FROM mediaSections WHERE slug = ?")
    .bind(sectionSlug)
    .first<{ id: string }>()
  if (!section) return err("Choose an existing publication section.", 400)
  const conflicting = await c.env.DB.prepare("SELECT id FROM mediaItems WHERE slug = ?")
    .bind(slug)
    .first<{ id: string }>()
  if (conflicting && conflicting.id !== id) {
    return err("That publication slug is already in use.", 400)
  }
  const fileAsset = fileStorageId
    ? await c.env.DB.prepare("SELECT * FROM assets WHERE r2Key = ?").bind(fileStorageId).first<Record<string, unknown>>()
    : null
  const coverAsset = coverStorageId
    ? await c.env.DB.prepare("SELECT * FROM assets WHERE r2Key = ?").bind(coverStorageId).first<Record<string, unknown>>()
    : null
  if (mediaType !== "video" && !fileAsset) {
    return err(
      mediaType === "photo"
        ? "Choose an image from the managed media library."
        : "Choose a file from the managed media library.",
      400
    )
  }
  if (mediaType === "photo" && !(fileAsset?.mimeType as string).startsWith("image/")) {
    return err("Photo gallery items must use an image file.", 400)
  }
  let youtubeUrl: string | null = null
  if (mediaType === "video") {
    let parsed: URL
    try {
      parsed = new URL(str(body.youtubeUrl, 500))
    } catch {
      return err("Enter a valid YouTube video URL.", 400)
    }
    if (!["youtube.com", "youtu.be", "m.youtube.com"].includes(parsed.hostname.replace(/^www\./, ""))) {
      return err("Video gallery items must use a YouTube URL.", 400)
    }
    youtubeUrl = parsed.toString()
  }
  if (coverStorageId && !coverAsset) {
    return err("Choose a cover from the managed media library.", 400)
  }
  const timestamp = now()
  const order = Number.isFinite(Number(body.order)) ? Number(body.order) : 0
  const status = body.status === "published" ? "published" : "draft"
  const row = {
    sectionSlug,
    slug,
    title,
    description: str(body.description, 5000),
    mediaType,
    coverR2Key: coverStorageId,
    fileR2Key: mediaType === "video" ? null : fileStorageId,
    fileName: mediaType === "video" ? "" : (fileAsset?.fileName as string),
    mimeType: mediaType === "video" ? "" : (fileAsset?.mimeType as string),
    youtubeUrl,
    order: order,
    status: status,
  }
  const existing = await c.env.DB.prepare("SELECT id FROM mediaItems WHERE id = ?")
    .bind(id)
    .first<{ id: string }>()
  if (existing) {
    await c.env.DB.prepare(
      `UPDATE mediaItems SET sectionSlug = ?, slug = ?, title = ?, description = ?, mediaType = ?, coverR2Key = ?, fileR2Key = ?, fileName = ?, mimeType = ?, youtubeUrl = ?, "order" = ?, status = ?, updatedAt = ? WHERE id = ?`
    )
      .bind(row.sectionSlug, row.slug, row.title, row.description, row.mediaType, row.coverR2Key, row.fileR2Key, row.fileName, row.mimeType, row.youtubeUrl, row.order, row.status, timestamp, id)
      .run()
  } else {
    await c.env.DB.prepare(
      `INSERT INTO mediaItems (id, sectionSlug, slug, title, description, mediaType, coverR2Key, fileR2Key, fileName, mimeType, youtubeUrl, "order", status, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, row.sectionSlug, row.slug, row.title, row.description, row.mediaType, row.coverR2Key, row.fileR2Key, row.fileName, row.mimeType, row.youtubeUrl, row.order, row.status, timestamp)
      .run()
  }
  await audit(c, {
    action: body.id && existing ? "update" : "create",
    entityType: "mediaItem",
    entityId: id,
    summary: `${body.id && existing ? "Updated" : "Created"} ${title}`,
  })
  return c.json({ _id: id })
})

admin.delete("/media/items/:id", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const item = await c.env.DB.prepare("SELECT id, title FROM mediaItems WHERE id = ?")
    .bind(c.req.param("id"))
    .first<{ id: string; title: string }>()
  if (item) await c.env.DB.prepare("DELETE FROM mediaItems WHERE id = ?").bind(item.id).run()
  await audit(c, {
    action: "delete",
    entityType: "mediaItem",
    entityId: c.req.param("id"),
    summary: `Deleted ${item?.title ?? "media item"}`,
  })
  return c.json(null)
})

// --- Statements (mirror convex/statements) ---

const STATEMENT_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
])
const STATEMENT_EXT = [".pdf", ".docx", ".jpg", ".jpeg", ".png"]

admin.get("/statements", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM statements ORDER BY rowid DESC LIMIT 200"
  ).all<Record<string, unknown>>()
  return c.json(
    results.map((row) => ({
      _id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      releaseDate: row.releaseDate,
      fileStorageId: row.fileR2Key,
      fileName: row.fileName,
      mimeType: row.mimeType,
      order: row.order,
      status: row.status,
    }))
  )
})

admin.post("/statements/save", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body) return err("Invalid request.", 400)
  const title = str(body.title, 300)
  const slug = (str(body.slug, 160) || title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  if (!title || !slug) return err("Enter a statement title.", 400)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str(body.releaseDate, 20))) {
    return err("Choose the statement date.", 400)
  }
  const fileStorageId = str(body.fileStorageId, 200)
  const asset = fileStorageId
    ? await c.env.DB.prepare("SELECT * FROM assets WHERE r2Key = ?").bind(fileStorageId).first<Record<string, unknown>>()
    : null
  if (!asset) return err("Choose or upload a statement file.", 400)
  const lowerName = (asset.fileName as string).toLowerCase()
  if (!STATEMENT_MIME.has(asset.mimeType as string) || !STATEMENT_EXT.some((ext) => lowerName.endsWith(ext))) {
    return err("Statements must be PDF, DOCX, JPG, or PNG files.", 400)
  }
  const id = typeof body.id === "string" && body.id ? body.id : newId()
  const conflicting = await c.env.DB.prepare("SELECT id FROM statements WHERE slug = ?")
    .bind(slug)
    .first<{ id: string }>()
  if (conflicting && conflicting.id !== id) {
    return err("That statement URL slug is already in use.", 400)
  }
  const timestamp = now()
  const order = Number.isFinite(Number(body.order)) ? Number(body.order) : 0
  const status = body.status === "published" ? "published" : "draft"
  const existing = await c.env.DB.prepare("SELECT id FROM statements WHERE id = ?")
    .bind(id)
    .first<{ id: string }>()
  // Convex replace() drops createdAt; preserve it explicitly here.
  if (existing) {
    await c.env.DB.prepare(
      `UPDATE statements SET slug = ?, title = ?, description = ?, releaseDate = ?, fileR2Key = ?, fileName = ?, mimeType = ?, "order" = ?, status = ?, updatedAt = ? WHERE id = ?`
    )
      .bind(slug, title, str(body.description, 2000), str(body.releaseDate, 20), fileStorageId, asset.fileName, asset.mimeType, order, status, timestamp, id)
      .run()
  } else {
    await c.env.DB.prepare(
      `INSERT INTO statements (id, slug, title, description, releaseDate, fileR2Key, fileName, mimeType, "order", status, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, slug, title, str(body.description, 2000), str(body.releaseDate, 20), fileStorageId, asset.fileName, asset.mimeType, order, status, timestamp)
      .run()
  }
  await audit(c, {
    action: existing ? "update" : "create",
    entityType: "statement",
    entityId: id,
    summary: `${existing ? "Updated" : "Created"} ${title}`,
  })
  return c.json({ _id: id })
})

admin.delete("/statements/:id", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const row = await c.env.DB.prepare("SELECT id, title FROM statements WHERE id = ?")
    .bind(c.req.param("id"))
    .first<{ id: string; title: string }>()
  if (row) await c.env.DB.prepare("DELETE FROM statements WHERE id = ?").bind(row.id).run()
  await audit(c, {
    action: "delete",
    entityType: "statement",
    entityId: c.req.param("id"),
    summary: `Deleted ${row?.title ?? "statement"}`,
  })
  return c.json(null)
})

// --- Programme (mirror convex/programme) ---

admin.get("/programme", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const [days, sessions] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM programmeDays ORDER BY status ASC, "order" ASC LIMIT 20`).all<Record<string, unknown>>(),
    c.env.DB.prepare(`SELECT * FROM programmeSessions ORDER BY daySlug ASC, "order" ASC LIMIT 200`).all<Record<string, unknown>>(),
  ])
  const pick = (r: Record<string, unknown>, keys: string[]) =>
    Object.fromEntries([["_id", r.id], ...keys.map((k) => [k, r[k]])])
  return c.json({
    days: days.results.map((d) => pick(d, ["slug", "tabLabel", "navigationLabel", "dateLabel", "summary", "order", "status"])),
    sessions: sessions.results.map((s) => pick(s, ["daySlug", "slug", "startTime", "endTime", "title", "description", "tag", "speakers", "location", "order", "status"])),
  })
})

admin.post("/programme/days/save", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body) return err("Invalid request.", 400)
  const id = typeof body.id === "string" && body.id ? body.id : newId()
  const timestamp = now()
  const status = body.status === "published" ? "published" : "draft"
  const fields = {
    slug: str(body.slug, 120),
    tabLabel: str(body.tabLabel, 200),
    navigationLabel: str(body.navigationLabel, 200),
    dateLabel: str(body.dateLabel, 200),
    summary: str(body.summary, 2000),
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
    status,
  }
  const existing = await c.env.DB.prepare("SELECT id FROM programmeDays WHERE id = ?").bind(id).first<{ id: string }>()
  if (existing) {
    await c.env.DB.prepare(
      `UPDATE programmeDays SET slug = ?, tabLabel = ?, navigationLabel = ?, dateLabel = ?, summary = ?, "order" = ?, status = ?, updatedAt = ? WHERE id = ?`
    ).bind(fields.slug, fields.tabLabel, fields.navigationLabel, fields.dateLabel, fields.summary, fields.order, fields.status, timestamp, id).run()
  } else {
    await c.env.DB.prepare(
      `INSERT INTO programmeDays (id, slug, tabLabel, navigationLabel, dateLabel, summary, "order", status, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, fields.slug, fields.tabLabel, fields.navigationLabel, fields.dateLabel, fields.summary, fields.order, fields.status, timestamp).run()
  }
  await audit(c, { action: existing ? "update" : "create", entityType: "programmeDay", entityId: id, summary: `Saved ${fields.tabLabel}` })
  return c.json({ _id: id })
})

admin.post("/programme/sessions/save", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body) return err("Invalid request.", 400)
  const id = typeof body.id === "string" && body.id ? body.id : newId()
  const timestamp = now()
  const status = body.status === "published" ? "published" : "draft"
  const fields = {
    daySlug: str(body.daySlug, 120),
    slug: str(body.slug, 160),
    startTime: str(body.startTime, 40),
    endTime: str(body.endTime, 40),
    title: str(body.title, 300),
    description: str(body.description, 5000),
    tag: str(body.tag, 120),
    speakers: str(body.speakers, 1000),
    location: str(body.location, 300),
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
    status,
  }
  const existing = await c.env.DB.prepare("SELECT id FROM programmeSessions WHERE id = ?").bind(id).first<{ id: string }>()
  if (existing) {
    await c.env.DB.prepare(
      `UPDATE programmeSessions SET daySlug = ?, slug = ?, startTime = ?, endTime = ?, title = ?, description = ?, tag = ?, speakers = ?, location = ?, "order" = ?, status = ?, updatedAt = ? WHERE id = ?`
    ).bind(fields.daySlug, fields.slug, fields.startTime, fields.endTime, fields.title, fields.description, fields.tag, fields.speakers, fields.location, fields.order, fields.status, timestamp, id).run()
  } else {
    await c.env.DB.prepare(
      `INSERT INTO programmeSessions (id, daySlug, slug, startTime, endTime, title, description, tag, speakers, location, "order", status, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, fields.daySlug, fields.slug, fields.startTime, fields.endTime, fields.title, fields.description, fields.tag, fields.speakers, fields.location, fields.order, fields.status, timestamp).run()
  }
  await audit(c, { action: existing ? "update" : "create", entityType: "programmeSession", entityId: id, summary: `Saved ${fields.title}` })
  return c.json({ _id: id })
})

admin.post("/programme/publish-all", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const timestamp = now()
  const days = await c.env.DB.prepare("SELECT id FROM programmeDays WHERE status = 'draft' LIMIT 50").all<{ id: string }>()
  const sessions = await c.env.DB.prepare("SELECT id, status FROM programmeSessions LIMIT 500").all<{ id: string; status: string }>()
  const draftSessions = sessions.results.filter((s) => s.status === "draft")
  const batch = [
    ...days.results.map((d) => c.env.DB.prepare("UPDATE programmeDays SET status = 'published', updatedAt = ? WHERE id = ?").bind(timestamp, d.id)),
    ...draftSessions.map((s) => c.env.DB.prepare("UPDATE programmeSessions SET status = 'published', updatedAt = ? WHERE id = ?").bind(timestamp, s.id)),
  ]
  if (batch.length > 0) await c.env.DB.batch(batch)
  await audit(c, { action: "publish", entityType: "programme", entityId: "all-drafts", summary: `Published ${days.results.length} programme days and ${draftSessions.length} sessions` })
  return c.json({ daysPublished: days.results.length, sessionsPublished: draftSessions.length })
})

admin.delete("/programme/days/:id", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const row = await c.env.DB.prepare("SELECT id, tabLabel FROM programmeDays WHERE id = ?").bind(c.req.param("id")).first<{ id: string; tabLabel: string }>()
  if (row) await c.env.DB.prepare("DELETE FROM programmeDays WHERE id = ?").bind(row.id).run()
  await audit(c, { action: "delete", entityType: "programmeDay", entityId: c.req.param("id"), summary: `Deleted ${row?.tabLabel ?? "day"}` })
  return c.json(null)
})

admin.delete("/programme/sessions/:id", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const row = await c.env.DB.prepare("SELECT id, title FROM programmeSessions WHERE id = ?").bind(c.req.param("id")).first<{ id: string; title: string }>()
  if (row) await c.env.DB.prepare("DELETE FROM programmeSessions WHERE id = ?").bind(row.id).run()
  await audit(c, { action: "delete", entityType: "programmeSession", entityId: c.req.param("id"), summary: `Deleted ${row?.title ?? "session"}` })
  return c.json(null)
})

// --- Charts (mirror convex/charts) ---

admin.get("/charts", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const [series, points] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM chartSeries ORDER BY status ASC, "order" ASC LIMIT 20`).all<Record<string, unknown>>(),
    c.env.DB.prepare(`SELECT * FROM chartPoints ORDER BY seriesSlug ASC, "order" ASC LIMIT 300`).all<Record<string, unknown>>(),
  ])
  const pick = (r: Record<string, unknown>, keys: string[]) =>
    Object.fromEntries([["_id", r.id], ...keys.map((k) => [k, r[k]])])
  return c.json({
    series: series.results.map((s) => pick(s, ["slug", "title", "eyebrow", "description", "sourceLabel", "sourceUrl", "unit", "order", "status"])),
    points: points.results.map((p) => pick(p, ["seriesSlug", "label", "sublabel", "value", "order"])),
  })
})

admin.post("/charts/series/save", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body) return err("Invalid request.", 400)
  const id = typeof body.id === "string" && body.id ? body.id : newId()
  const timestamp = now()
  const fields = {
    slug: str(body.slug, 120), title: str(body.title, 300), eyebrow: str(body.eyebrow, 300),
    description: str(body.description, 2000), sourceLabel: str(body.sourceLabel, 300),
    sourceUrl: str(body.sourceUrl, 500), unit: str(body.unit, 60),
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
    status: body.status === "published" ? "published" : "draft",
  }
  const existing = await c.env.DB.prepare("SELECT id FROM chartSeries WHERE id = ?").bind(id).first<{ id: string }>()
  if (existing) {
    await c.env.DB.prepare(`UPDATE chartSeries SET slug = ?, title = ?, eyebrow = ?, description = ?, sourceLabel = ?, sourceUrl = ?, unit = ?, "order" = ?, status = ?, updatedAt = ? WHERE id = ?`)
      .bind(fields.slug, fields.title, fields.eyebrow, fields.description, fields.sourceLabel, fields.sourceUrl, fields.unit, fields.order, fields.status, timestamp, id).run()
  } else {
    await c.env.DB.prepare(`INSERT INTO chartSeries (id, slug, title, eyebrow, description, sourceLabel, sourceUrl, unit, "order", status, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, fields.slug, fields.title, fields.eyebrow, fields.description, fields.sourceLabel, fields.sourceUrl, fields.unit, fields.order, fields.status, timestamp).run()
  }
  await audit(c, { action: existing ? "update" : "create", entityType: "chartSeries", entityId: id, summary: `Saved ${fields.title}` })
  return c.json({ _id: id })
})

admin.post("/charts/points/save", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body) return err("Invalid request.", 400)
  const value = typeof body.value === "number" ? body.value : NaN
  if (!Number.isFinite(value) || value < 0) return err("Chart values must be positive numbers.", 400)
  const id = typeof body.id === "string" && body.id ? body.id : newId()
  const timestamp = now()
  const fields = {
    seriesSlug: str(body.seriesSlug, 120), label: str(body.label, 300), sublabel: str(body.sublabel, 300),
    value, order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
  }
  const existing = await c.env.DB.prepare("SELECT id FROM chartPoints WHERE id = ?").bind(id).first<{ id: string }>()
  if (existing) {
    await c.env.DB.prepare(`UPDATE chartPoints SET seriesSlug = ?, label = ?, sublabel = ?, value = ?, "order" = ?, updatedAt = ? WHERE id = ?`)
      .bind(fields.seriesSlug, fields.label, fields.sublabel, fields.value, fields.order, timestamp, id).run()
  } else {
    await c.env.DB.prepare(`INSERT INTO chartPoints (id, seriesSlug, label, sublabel, value, "order", updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, fields.seriesSlug, fields.label, fields.sublabel, fields.value, fields.order, timestamp).run()
  }
  await audit(c, { action: existing ? "update" : "create", entityType: "chartPoint", entityId: id, summary: `Saved ${fields.label}` })
  return c.json({ _id: id })
})

admin.delete("/charts/series/:id", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const row = await c.env.DB.prepare("SELECT id, title FROM chartSeries WHERE id = ?").bind(c.req.param("id")).first<{ id: string; title: string }>()
  if (row) await c.env.DB.prepare("DELETE FROM chartSeries WHERE id = ?").bind(row.id).run()
  await audit(c, { action: "delete", entityType: "chartSeries", entityId: c.req.param("id"), summary: `Deleted ${row?.title ?? "series"}` })
  return c.json(null)
})

admin.delete("/charts/points/:id", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const row = await c.env.DB.prepare("SELECT id, label FROM chartPoints WHERE id = ?").bind(c.req.param("id")).first<{ id: string; label: string }>()
  if (row) await c.env.DB.prepare("DELETE FROM chartPoints WHERE id = ?").bind(row.id).run()
  await audit(c, { action: "delete", entityType: "chartPoint", entityId: c.req.param("id"), summary: `Deleted ${row?.label ?? "point"}` })
  return c.json(null)
})

// --- Regional + organizations (mirror convex/content) ---

admin.get("/regional", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const { results } = await c.env.DB.prepare(`SELECT * FROM regionalCountries ORDER BY status ASC, "order" ASC LIMIT 100`).all<Record<string, unknown>>()
  return c.json(results.map((item) => ({
    _id: item.id, slug: item.slug, name: item.name, code: item.code, eyebrow: item.eyebrow,
    headline: item.headline, summary: item.summary, detail: item.detail,
    sourceUrl: item.sourceUrl ?? "", order: item.order, status: item.status,
  })))
})

admin.post("/regional/save", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body) return err("Invalid request.", 400)
  const id = typeof body.id === "string" && body.id ? body.id : newId()
  const timestamp = now()
  const fields = {
    slug: str(body.slug, 120), name: str(body.name, 200), code: str(body.code, 20),
    eyebrow: str(body.eyebrow, 300), headline: str(body.headline, 300),
    summary: str(body.summary, 2000), detail: str(body.detail, 8000),
    sourceUrl: str(body.sourceUrl, 500) || null,
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
    status: body.status === "published" ? "published" : "draft",
  }
  const existing = await c.env.DB.prepare("SELECT id FROM regionalCountries WHERE id = ?").bind(id).first<{ id: string }>()
  if (existing) {
    await c.env.DB.prepare(`UPDATE regionalCountries SET slug = ?, name = ?, code = ?, eyebrow = ?, headline = ?, summary = ?, detail = ?, sourceUrl = ?, "order" = ?, status = ?, updatedAt = ? WHERE id = ?`)
      .bind(fields.slug, fields.name, fields.code, fields.eyebrow, fields.headline, fields.summary, fields.detail, fields.sourceUrl, fields.order, fields.status, timestamp, id).run()
  } else {
    await c.env.DB.prepare(`INSERT INTO regionalCountries (id, slug, name, code, eyebrow, headline, summary, detail, sourceUrl, "order", status, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, fields.slug, fields.name, fields.code, fields.eyebrow, fields.headline, fields.summary, fields.detail, fields.sourceUrl, fields.order, fields.status, timestamp).run()
  }
  await audit(c, { action: existing ? "update" : "create", entityType: "regionalCountry", entityId: id, summary: `Saved ${fields.name}` })
  return c.json({ _id: id })
})

admin.delete("/regional/:id", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const row = await c.env.DB.prepare("SELECT id, name FROM regionalCountries WHERE id = ?").bind(c.req.param("id")).first<{ id: string; name: string }>()
  if (row) await c.env.DB.prepare("DELETE FROM regionalCountries WHERE id = ?").bind(row.id).run()
  await audit(c, { action: "delete", entityType: "regionalCountry", entityId: c.req.param("id"), summary: `Deleted ${row?.name ?? "regional country"}` })
  return c.json(null)
})

const ORG_ROLES = new Set(["organizing", "managing", "supporting"])
const ORG_KINDS = new Set(["partner", "sponsor"])
const ORG_TIERS = new Set(["strategic", "knowledge", "community", "supporting"])

admin.get("/organizations", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const { results } = await c.env.DB.prepare(`SELECT * FROM organizations ORDER BY status ASC, "order" ASC LIMIT 200`).all<Record<string, unknown>>()
  return c.json(results.map((item) => ({
    _id: item.id, slug: item.slug, name: item.name,
    organizationRole: item.organizationRole ?? "supporting",
    kind: item.kind, tier: item.tier, description: item.description,
    websiteUrl: item.websiteUrl ?? "", logoStorageId: item.logoR2Key,
    order: item.order, status: item.status,
  })))
})

admin.post("/organizations/save", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body) return err("Invalid request.", 400)
  const role = str(body.organizationRole, 20)
  const kind = str(body.kind, 20)
  const tier = str(body.tier, 20)
  if (!ORG_ROLES.has(role) || !ORG_KINDS.has(kind) || !ORG_TIERS.has(tier)) {
    return err("Unknown organization role, kind, or tier.", 400)
  }
  const id = typeof body.id === "string" && body.id ? body.id : newId()
  const timestamp = now()
  const websiteUrl = str(body.websiteUrl, 500) || null
  const logoStorageId = str(body.logoStorageId, 200) || null
  const order = Number.isFinite(Number(body.order)) ? Number(body.order) : 0
  const status = body.status === "published" ? "published" : "draft"
  const existing = await c.env.DB.prepare("SELECT id FROM organizations WHERE id = ?").bind(id).first<{ id: string }>()
  if (existing) {
    await c.env.DB.prepare(`UPDATE organizations SET slug = ?, name = ?, organizationRole = ?, kind = ?, tier = ?, description = ?, websiteUrl = ?, logoR2Key = ?, "order" = ?, status = ?, updatedAt = ? WHERE id = ?`)
      .bind(str(body.slug, 120), str(body.name, 300), role, kind, tier, str(body.description, 5000), websiteUrl, logoStorageId, order, status, timestamp, id).run()
  } else {
    await c.env.DB.prepare(`INSERT INTO organizations (id, slug, name, organizationRole, kind, tier, description, websiteUrl, logoR2Key, "order", status, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, str(body.slug, 120), str(body.name, 300), role, kind, tier, str(body.description, 5000), websiteUrl, logoStorageId, order, status, timestamp).run()
  }
  await audit(c, { action: existing ? "update" : "create", entityType: "organization", entityId: id, summary: `Saved ${str(body.name, 200)}` })
  return c.json({ _id: id })
})

admin.delete("/organizations/:id", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const row = await c.env.DB.prepare("SELECT id, name FROM organizations WHERE id = ?").bind(c.req.param("id")).first<{ id: string; name: string }>()
  if (row) await c.env.DB.prepare("DELETE FROM organizations WHERE id = ?").bind(row.id).run()
  await audit(c, { action: "delete", entityType: "organization", entityId: c.req.param("id"), summary: `Deleted ${row?.name ?? "organization"}` })
  return c.json(null)
})

// --- Donation tiers + settings (mirror convex/donations + settings) ---

admin.get("/donation-tiers", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const { results } = await c.env.DB.prepare(`SELECT * FROM donationTiers ORDER BY status ASC, "order" ASC LIMIT 50`).all<Record<string, unknown>>()
  return c.json(results.map((item) => ({
    _id: item.id, slug: item.slug, label: item.label, amountCents: item.amountCents,
    description: item.description,
    customAmount: fromBool(item.customAmount as number), order: item.order, status: item.status,
  })))
})

admin.post("/donation-tiers/save", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body) return err("Invalid request.", 400)
  const id = typeof body.id === "string" && body.id ? body.id : newId()
  const timestamp = now()
  const amountCents = body.amountCents === null || body.amountCents === undefined ? null : Math.floor(Number(body.amountCents))
  const existing = await c.env.DB.prepare("SELECT id FROM donationTiers WHERE id = ?").bind(id).first<{ id: string }>()
  const values = [str(body.slug, 120), str(body.label, 200), Number.isFinite(amountCents) ? amountCents : null, str(body.description, 2000), asBool(body.customAmount), Number.isFinite(Number(body.order)) ? Number(body.order) : 0, body.status === "published" ? "published" : "draft", timestamp]
  if (existing) {
    await c.env.DB.prepare(`UPDATE donationTiers SET slug = ?, label = ?, amountCents = ?, description = ?, customAmount = ?, "order" = ?, status = ?, updatedAt = ? WHERE id = ?`)
      .bind(...values, id).run()
  } else {
    await c.env.DB.prepare(`INSERT INTO donationTiers (id, slug, label, amountCents, description, customAmount, "order", status, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, ...values).run()
  }
  await audit(c, { action: existing ? "update" : "create", entityType: "donationTier", entityId: id, summary: `Saved ${str(body.label, 200)}` })
  return c.json({ _id: id })
})

const SETTINGS_COLUMNS = [
  "eventName", "shortName", "theme", "eventStartIso", "eventEndIso", "timezone",
  "venue", "address", "cityCountry", "format", "delegateInfo", "languages",
  "announcement", "announcementEnabled", "contactEmail", "registrationEmail",
  "pressEmail", "phone", "whatsapp", "facebookUrl", "xUrl", "instagramUrl",
  "youtubeUrl", "linkedinUrl", "heroEyebrow", "heroTitleLine1", "heroTitleLine2",
  "heroLead", "whyTitle", "whyBody", "donationEyebrow", "donationTitle",
  "donationBody", "bankTransferEyebrow", "bankTransferTitle", "bankTransferBody",
  "bankAccountLabel", "bankName", "bankAccountName", "bankIban", "bankBic",
  "usBankAccountLabel", "usBankName", "usBankAccountName", "usBankRoutingNumber",
  "usBankAccountNumber", "usBankSwift", "registrationFeeLabel", "registrationFeeTitle",
  "registrationFeeBody", "registrationFeeEmail", "forumPackagesMenuLabel",
  "accommodationPackageLabel", "accommodationPackageTitle", "accommodationPackageIntro",
  "sponsorshipPackageLabel", "sponsorshipPackageTitle", "sponsorshipPackageIntro",
  "footerTitle", "footerBody", "registrationOpen", "donationsEnabled",
] as const
const SETTINGS_BOOL = new Set(["announcementEnabled", "registrationOpen", "donationsEnabled"])

admin.post("/settings/save", async (c) => {
  const blocked = await gate(c, false)
  if (blocked) return blocked
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body) return err("Invalid request.", 400)
  const timestamp = now()
  const logoR2Key = str(body.logoStorageId, 200) || null
  const faviconR2Key = str(body.faviconStorageId, 200) || null
  const values = SETTINGS_COLUMNS.map((col) =>
    SETTINGS_BOOL.has(col) ? asBool(body[col]) : str(body[col], 8000)
  )
  const existing = await c.env.DB.prepare("SELECT id FROM siteSettings WHERE key = 'primary'").first<{ id: string }>()
  if (existing) {
    const sets = [...SETTINGS_COLUMNS.map((col) => `${col} = ?`), "logoR2Key = ?", "faviconR2Key = ?", "updatedAt = ?"].join(", ")
    await c.env.DB.prepare(`UPDATE siteSettings SET ${sets} WHERE id = ?`)
      .bind(...values, logoR2Key, faviconR2Key, timestamp, existing.id).run()
  } else {
    const cols = ["id", "key", ...SETTINGS_COLUMNS, "logoR2Key", "faviconR2Key", "updatedAt"].join(", ")
    const placeholders = [...SETTINGS_COLUMNS.map(() => "?"), "?", "?", "?"].join(", ")
    await c.env.DB.prepare(`INSERT INTO siteSettings (${cols}) VALUES (?, 'primary', ${placeholders})`)
      .bind(newId(), ...values, logoR2Key, faviconR2Key, timestamp).run()
  }
  await audit(c, { action: "save", entityType: "siteSettings", entityId: "primary", summary: "Updated global site settings" })
  return c.json(null)
})

// --- Mail desk (mirror convex/mail; sending via Resend HTTP, not SMTP) ---

admin.get("/mail/access", async (c) => {
  const blocked = await gate(c, true)
  if (blocked) return blocked
  return c.json(null)
})

admin.get("/mail/messages", async (c) => {
  const blocked = await gate(c, true)
  if (blocked) return blocked
  const limit = Math.min(Math.max(Number(c.req.query("limit") ?? 100), 1), 200)
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM mailMessages ORDER BY createdAt DESC LIMIT ?"
  )
    .bind(limit)
    .all<Record<string, unknown>>()
  const withAttachments = await Promise.all(
    results.map(async (item) => {
      const attachments = await c.env.DB.prepare("SELECT * FROM mailAttachments WHERE messageId = ?")
        .bind(item.id)
        .all<Record<string, unknown>>()
      return {
        _id: item.id,
        _creationTime: item.createdAt,
        direction: item.direction,
        messageId: item.messageId,
        inReplyTo: item.inReplyTo,
        references: item.references,
        fromAddress: item.fromAddress,
        fromName: item.fromName,
        toAddresses: JSON.parse((item.toAddresses as string) || "[]"),
        ccAddresses: JSON.parse((item.ccAddresses as string) || "[]"),
        bccAddresses: JSON.parse((item.bccAddresses as string) || "[]"),
        deliveredAddresses: JSON.parse((item.deliveredAddresses as string) || "[]"),
        failedAddresses: JSON.parse((item.failedAddresses as string) || "[]"),
        deferredAddresses: JSON.parse((item.deferredAddresses as string) || "[]"),
        subject: item.subject,
        textBody: item.textBody,
        htmlBody: item.htmlBody,
        deliveryStatus: item.deliveryStatus,
        isRead: fromBool(item.isRead as number),
        sentByEmail: item.sentByEmail,
        providerResponse: item.providerResponse,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        attachments: attachments.results.map((a) => ({
          _id: a.id,
          fileName: a.fileName,
          mimeType: a.mimeType,
          byteSize: a.byteSize,
          contentId: a.contentId,
        })),
      }
    })
  )
  return c.json(withAttachments)
})

const DAILY_SEND_LIMIT = 300

admin.get("/mail/allowance", async (c) => {
  const blocked = await gate(c, true)
  if (blocked) return blocked
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const sent = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM mailDispatches WHERE createdAt >= ?"
  )
    .bind(startOfDay.getTime())
    .first<{ n: number }>()
  const used = sent?.n ?? 0
  const reset = new Date()
  reset.setUTCHours(24, 0, 0, 0)
  return c.json({
    limit: DAILY_SEND_LIMIT,
    used,
    remaining: Math.max(0, DAILY_SEND_LIMIT - used),
    resetsAt: reset.getTime(),
    providerRemaining: null,
    source: "local",
  })
})

admin.post("/mail/read", async (c) => {
  const blocked = await gate(c, true)
  if (blocked) return blocked
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (typeof body?.id !== "string") return err("Invalid request.", 400)
  await c.env.DB.prepare("UPDATE mailMessages SET isRead = ?, updatedAt = ? WHERE id = ?")
    .bind(asBool(body.read), now(), body.id)
    .run()
  return c.json(null)
})

admin.delete("/mail/messages/:id", async (c) => {
  const blocked = await gate(c, true)
  if (blocked) return blocked
  const row = await c.env.DB.prepare("SELECT id, subject FROM mailMessages WHERE id = ?")
    .bind(c.req.param("id"))
    .first<{ id: string; subject: string }>()
  if (row) {
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM mailAttachments WHERE messageId = ?").bind(row.id),
      c.env.DB.prepare("DELETE FROM mailMessages WHERE id = ?").bind(row.id),
    ])
  }
  await audit(c, {
    action: "delete",
    entityType: "mailMessage",
    entityId: c.req.param("id"),
    summary: `Deleted ${row?.subject ?? "message"}`,
  })
  return c.json(null)
})

admin.get("/mail/contacts", async (c) => {
  const blocked = await gate(c, true)
  if (blocked) return blocked
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM mailContacts ORDER BY updatedAt DESC LIMIT 2000"
  ).all<Record<string, unknown>>()
  return c.json(
    results.map((item) => ({
      _id: item.id,
      name: item.name,
      email: item.email,
      organization: item.organization,
      notes: item.notes,
      createdAt: item.createdAt,
    }))
  )
})

admin.post("/mail/contacts/save", async (c) => {
  const blocked = await gate(c, true)
  if (blocked) return blocked
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (typeof body?.name !== "string" || body.name.trim().length < 2) {
    return err("Enter a contact name with at least 2 characters.", 400)
  }
  const id = typeof body.id === "string" && body.id ? body.id : newId()
  const timestamp = now()
  const existing = await c.env.DB.prepare("SELECT id FROM mailContacts WHERE id = ?")
    .bind(id)
    .first<{ id: string }>()
  if (existing) {
    await c.env.DB.prepare("UPDATE mailContacts SET name = ?, email = ?, organization = ?, notes = ?, updatedAt = ? WHERE id = ?")
      .bind(str(body.name, 200), str(body.email, 320), str(body.organization, 300), str(body.notes, 2000), timestamp, id)
      .run()
  } else {
    await c.env.DB.prepare("INSERT INTO mailContacts (id, name, email, organization, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(id, str(body.name, 200), str(body.email, 320), str(body.organization, 300), str(body.notes, 2000), timestamp, timestamp)
      .run()
  }
  await audit(c, {
    action: existing ? "update" : "create",
    entityType: "mailContact",
    entityId: id,
    summary: `${existing ? "Updated" : "Created"} ${str(body.name, 200)}`,
  })
  return c.json({ _id: id })
})

admin.post("/mail/contacts/delete", async (c) => {
  const blocked = await gate(c, true)
  if (blocked) return blocked
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (typeof body?.id !== "string") return err("Invalid request.", 400)
  const row = await c.env.DB.prepare("SELECT id, name FROM mailContacts WHERE id = ?")
    .bind(body.id)
    .first<{ id: string; name: string }>()
  if (row) await c.env.DB.prepare("DELETE FROM mailContacts WHERE id = ?").bind(row.id).run()
  await audit(c, {
    action: "delete",
    entityType: "mailContact",
    entityId: body.id,
    summary: `Deleted ${row?.name ?? "contact"}`,
  })
  return c.json(null)
})

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SENDER_NAME = "Paris Hindu Summit"

admin.post("/mail/send", async (c) => {
  const blocked = await gate(c, true)
  if (blocked) return blocked
  const actorEmail = c.get("actorEmail")
  const resendKey = c.env.RESEND_API_KEY
  if (!resendKey) {
    return err("Outbound mail is not configured. Set RESEND_API_KEY to enable sending.", 503)
  }
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body) return err("Invalid request.", 400)
  const parseList = (value: unknown, cap: number) =>
    (Array.isArray(value)
      ? value.filter((a): a is string => typeof a === "string").join(",")
      : typeof value === "string"
        ? value
        : ""
    )
      .split(/[;,\n]/)
      .map((a) => a.trim())
      .filter((a) => EMAIL_PATTERN.test(a))
      .slice(0, cap)
  const to = parseList(body.to, 300)
  const cc = parseList(body.cc, 50)
  const subject = str(body.subject, 500)
  const text = str(body.text, 100_000)
  const mode = body.mode === "bulk" ? "bulk" : "single"
  if (to.length === 0) return err("Add at least one valid recipient.", 400)
  if (!subject) return err("Add a subject.", 400)
  if (!text) return err("Add a message body.", 400)
  if (mode === "bulk" && !body.consentConfirmed) {
    return err("Confirm the recipient list before sending a bulk message.", 400)
  }
  const attachmentInputs = (Array.isArray(body.attachments) ? body.attachments : []).slice(0, 10)
  const attachments: Array<{ filename: string; content: string }> = []
  let attachmentBytes = 0
  for (const item of attachmentInputs) {
    if (!item || typeof item !== "object") continue
    const candidate = item as Record<string, unknown>
    if (typeof candidate.contentBase64 === "string" && candidate.contentBase64) {
      const filename = str(candidate.fileName, 200) || "attachment"
      const bytes = Uint8Array.from(atob(candidate.contentBase64), (ch) => ch.charCodeAt(0))
      attachmentBytes += bytes.length
      if (bytes.length > 20_000_000 || attachmentBytes > 10_000_000) {
        return err(`Attachment ${filename.slice(0, 80)} is too large.`, 400)
      }
      let binary = ""
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      // eslint-disable-next-line no-undef
      attachments.push({ filename, content: btoa(binary) })
      continue
    }
    const row = typeof candidate.storageId === "string"
      ? await c.env.DB.prepare("SELECT * FROM assets WHERE r2Key = ?").bind(candidate.storageId).first<Record<string, unknown>>()
      : null
    if (!row) continue
    if ((row.byteSize as number) > 20_000_000) {
      return err(`Attachment ${(row.fileName as string).slice(0, 80)} is larger than 20 MB.`, 400)
    }
    const object = await c.env.SUMMIT_ASSETS.get(row.r2Key as string)
    if (!object) continue
    const buffer = await object.arrayBuffer()
    let binary = ""
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    // eslint-disable-next-line no-undef
    attachments.push({ filename: row.fileName as string, content: btoa(binary) })
  }
  const fromAddress = str(body.fromAddress, 320) || "info@parishindusummit.org"
  const timestamp = now()
  const messageId = `<${newId().replaceAll("-", "")}.${timestamp}@parishindusummit.org>`
  const toAddresses = mode === "bulk" ? [] : to
  const bccAddresses = mode === "bulk" ? to : []
  const inReplyTo = str(body.inReplyTo, 1000) || null
  const references = str(body.references, 4000) || null
  const payload = {
    from: `${SENDER_NAME} <${fromAddress}>`,
    to: mode === "bulk" ? [fromAddress] : to,
    cc: cc.length > 0 ? cc : undefined,
    bcc: mode === "bulk" ? to : undefined,
    subject,
    text,
    attachments: attachments.map((a) => ({ content: a.content, filename: a.filename })),
  }
  let providerMessageId = ""
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`Resend rejected the message (${response.status}): ${detail.slice(0, 200)}`)
    }
    const result = (await response.json()) as { id?: string }
    providerMessageId = result.id ?? ""
  } catch (error) {
    await c.env.DB.prepare(
      `INSERT INTO mailMessages (id, direction, messageId, inReplyTo, "references", fromAddress, fromName, toAddresses, ccAddresses, bccAddresses, subject, textBody, deliveryStatus, isRead, sentByEmail, providerResponse, createdAt, updatedAt)
       VALUES (?, 'outgoing', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'failed', 1, ?, ?, ?, ?)`
    )
      .bind(newId(), messageId, inReplyTo, references, fromAddress, SENDER_NAME, JSON.stringify(toAddresses), JSON.stringify(cc), JSON.stringify(bccAddresses), subject, text, actorEmail, error instanceof Error ? error.message.slice(0, 500) : "send failed", timestamp, timestamp)
      .run()
    return err(error instanceof Error ? error.message : "The message could not be sent.", 502)
  }
  await c.env.DB.prepare(
    `INSERT INTO mailMessages (id, direction, messageId, inReplyTo, "references", fromAddress, fromName, toAddresses, ccAddresses, bccAddresses, subject, textBody, deliveryStatus, isRead, sentByEmail, providerResponse, createdAt, updatedAt)
     VALUES (?, 'outgoing', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', 1, ?, ?, ?, ?)`
  )
    .bind(newId(), messageId, inReplyTo, references, fromAddress, SENDER_NAME, JSON.stringify(toAddresses), JSON.stringify(cc), JSON.stringify(bccAddresses), subject, text, actorEmail, `resend:${providerMessageId}`, timestamp, timestamp)
    .run()
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const dayCount = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM mailDispatches WHERE createdAt >= ?")
    .bind(startOfDay.getTime())
    .first<{ n: number }>()
  if ((dayCount?.n ?? 0) + to.length > DAILY_SEND_LIMIT) {
    return err("Daily sending limit reached. Contact the platform administrator to raise it.", 429)
  }
  await c.env.DB.prepare("INSERT INTO mailDispatches (id, providerMessageId, recipientCount, createdAt) VALUES (?, ?, ?, ?)")
    .bind(newId(), providerMessageId, to.length, timestamp)
    .run()
  for (const address of to) {
    const contact = await c.env.DB.prepare("SELECT id FROM mailContacts WHERE email = ?").bind(address).first<{ id: string }>()
    if (contact) continue
    await c.env.DB.prepare("INSERT INTO mailContacts (id, name, email, organization, notes, createdAt, updatedAt) VALUES (?, ?, ?, '', '', ?, ?)")
      .bind(newId(), address.split("@")[0] ?? address, address, timestamp, timestamp)
      .run()
  }
  await audit(c, {
    action: "send",
    entityType: "mailMessage",
    entityId: messageId,
    summary: `Sent “${subject.slice(0, 120)}” to ${to.length} recipient(s)`,
  })
  return c.json({ messageId, providerMessageId, recipientCount: to.length, status: "queued" })
})

export default admin
