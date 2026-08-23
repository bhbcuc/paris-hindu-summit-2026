import { ConvexError, v } from "convex/values"

import { mutation, query } from "./_generated/server"
import { getAdmin, writeAudit } from "./lib/admin"

const category = v.union(
  v.literal("logo"),
  v.literal("portrait"),
  v.literal("media"),
  v.literal("document"),
  v.literal("general")
)

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await getAdmin(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const register = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    byteSize: v.number(),
    altText: v.string(),
    category,
  },
  returns: v.id("assets"),
  handler: async (ctx, args) => {
    const actor = await getAdmin(ctx)
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ]
    if (!allowed.includes(args.mimeType) || args.byteSize > 20_000_000 || args.altText.trim().length < 3) {
      await ctx.storage.delete(args.storageId)
      throw new ConvexError("File type or size is not allowed.")
    }
    const id = await ctx.db.insert("assets", {
      ...args,
      altText: args.altText.trim(),
      status: "published",
      uploadedBy: actor?.user._id,
      uploadedAt: Date.now(),
    })
    await writeAudit(ctx, actor, {
      action: "upload",
      entityType: "asset",
      entityId: id,
      summary: `Uploaded ${args.fileName}`,
    })
    return id
  },
})

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("assets"),
      storageId: v.id("_storage"),
      fileName: v.string(),
      mimeType: v.string(),
      byteSize: v.number(),
      altText: v.string(),
      category,
      url: v.union(v.string(), v.null()),
      uploadedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    await getAdmin(ctx)
    const rows = await ctx.db
      .query("assets")
      .withIndex("by_category_and_status")
      .order("desc")
      .take(200)
    return Promise.all(
      rows.map(async (item) => ({
        _id: item._id,
        storageId: item.storageId,
        fileName: item.fileName,
        mimeType: item.mimeType,
        byteSize: item.byteSize,
        altText: item.altText,
        category: item.category,
        url: await ctx.storage.getUrl(item.storageId),
        uploadedAt: item.uploadedAt,
      }))
    )
  },
})

export const remove = mutation({
  args: { id: v.id("assets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getAdmin(ctx)
    const asset = await ctx.db.get(args.id)
    if (asset) {
      const [
        cmsReference,
        bannerReference,
        regionalReference,
        organizationReference,
        mediaCoverReference,
        mediaFileReference,
        statementReference,
      ] = await Promise.all([
        ctx.db.query("cmsEntries").withIndex("by_image_storage_id", (q) => q.eq("imageStorageId", asset.storageId)).first(),
        ctx.db.query("homeBanners").withIndex("by_image_storage_id", (q) => q.eq("imageStorageId", asset.storageId)).first(),
        ctx.db.query("regionalCountries").withIndex("by_image_storage_id", (q) => q.eq("imageStorageId", asset.storageId)).first(),
        ctx.db.query("organizations").withIndex("by_logo_storage_id", (q) => q.eq("logoStorageId", asset.storageId)).first(),
        ctx.db.query("mediaItems").withIndex("by_cover_storage_id", (q) => q.eq("coverStorageId", asset.storageId)).first(),
        ctx.db.query("mediaItems").withIndex("by_file_storage_id", (q) => q.eq("fileStorageId", asset.storageId)).first(),
        ctx.db.query("statements").withIndex("by_file_storage_id", (q) => q.eq("fileStorageId", asset.storageId)).first(),
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
        throw new ConvexError("This file is attached to published content. Detach it before deleting.")
      }
      await ctx.storage.delete(asset.storageId)
      await ctx.db.delete(args.id)
    }
    await writeAudit(ctx, actor, {
      action: "delete",
      entityType: "asset",
      entityId: args.id,
      summary: `Deleted ${asset?.fileName ?? "asset"}`,
    })
    return null
  },
})
