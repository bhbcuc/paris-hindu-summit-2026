import { ConvexError, v } from "convex/values"

import { mutation, query } from "./_generated/server"
import { getAdmin, writeAudit } from "./lib/admin"

const status = v.union(v.literal("draft"), v.literal("published"))
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
])
const allowedExtensions = [".pdf", ".docx", ".jpg", ".jpeg", ".png"]

const statement = v.object({
  _id: v.id("statements"),
  slug: v.string(),
  title: v.string(),
  description: v.string(),
  releaseDate: v.string(),
  fileStorageId: v.id("_storage"),
  fileName: v.string(),
  mimeType: v.string(),
  order: v.number(),
  status,
})

export const listPublished = query({
  args: {},
  returns: v.array(
    statement.omit("fileStorageId", "status").extend({ fileUrl: v.string() })
  ),
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("statements")
      .withIndex("by_status_and_release_date_and_order", (q) =>
        q.eq("status", "published")
      )
      .order("desc")
      .take(100)

    const resolved = await Promise.all(
      rows.map(async ({ fileStorageId, status: _status, ...row }) => {
        void _status
        const fileUrl = await ctx.storage.getUrl(fileStorageId)
        return fileUrl ? { ...row, fileUrl } : null
      })
    )
    return resolved.filter((row): row is NonNullable<typeof row> => row !== null)
  },
})

export const listForAdmin = query({
  args: {},
  returns: v.array(statement),
  handler: async (ctx) => {
    await getAdmin(ctx)
    return await ctx.db.query("statements").order("desc").take(200)
  },
})

export const save = mutation({
  args: {
    id: v.optional(v.id("statements")),
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    releaseDate: v.string(),
    fileStorageId: v.id("_storage"),
    order: v.number(),
    status,
  },
  returns: v.id("statements"),
  handler: async (ctx, args) => {
    const actor = await getAdmin(ctx)
    const title = args.title.trim()
    const slug = (args.slug.trim() || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
    if (!title || !slug) throw new ConvexError("Enter a statement title.")
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.releaseDate)) {
      throw new ConvexError("Choose the statement date.")
    }

    const [asset, conflicting] = await Promise.all([
      ctx.db
        .query("assets")
        .withIndex("by_storage_id", (q) => q.eq("storageId", args.fileStorageId))
        .first(),
      ctx.db
        .query("statements")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first(),
    ])
    if (!asset) throw new ConvexError("Choose or upload a statement file.")
    const lowerFileName = asset.fileName.toLowerCase()
    if (
      !allowedMimeTypes.has(asset.mimeType) ||
      !allowedExtensions.some((extension) => lowerFileName.endsWith(extension))
    ) {
      throw new ConvexError("Statements must be PDF, DOCX, JPG, or PNG files.")
    }
    if (conflicting && conflicting._id !== args.id) {
      throw new ConvexError("That statement URL slug is already in use.")
    }

    const value = {
      slug,
      title,
      description: args.description.trim(),
      releaseDate: args.releaseDate,
      fileStorageId: args.fileStorageId,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      order: args.order,
      status: args.status,
      updatedAt: Date.now(),
    }
    const entityId = args.id
      ? (await ctx.db.replace(args.id, value), args.id)
      : await ctx.db.insert("statements", value)
    await writeAudit(ctx, actor, {
      action: args.id ? "update" : "create",
      entityType: "statement",
      entityId,
      summary: `${args.id ? "Updated" : "Created"} ${title}`,
    })
    return entityId
  },
})

export const remove = mutation({
  args: { id: v.id("statements") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getAdmin(ctx)
    const row = await ctx.db.get(args.id)
    if (row) await ctx.db.delete(args.id)
    await writeAudit(ctx, actor, {
      action: "delete",
      entityType: "statement",
      entityId: args.id,
      summary: `Deleted ${row?.title ?? "statement"}`,
    })
    return null
  },
})
