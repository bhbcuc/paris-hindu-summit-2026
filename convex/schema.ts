import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

const publicationStatus = v.union(v.literal("draft"), v.literal("published"))
const submissionStatus = v.union(
  v.literal("new"),
  v.literal("in_progress"),
  v.literal("resolved"),
  v.literal("archived")
)

export default defineSchema({
  adminUsers: defineTable({
    authUserId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("administrator"),
      v.literal("editor"),
      v.literal("mail_manager")
    ),
    status: v.union(v.literal("active"), v.literal("suspended")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth_user_id", ["authUserId"])
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  siteSettings: defineTable({
    key: v.string(),
    eventName: v.string(),
    shortName: v.string(),
    theme: v.string(),
    eventStartIso: v.string(),
    eventEndIso: v.string(),
    timezone: v.string(),
    venue: v.string(),
    address: v.string(),
    cityCountry: v.string(),
    format: v.string(),
    delegateInfo: v.string(),
    languages: v.string(),
    announcement: v.string(),
    announcementEnabled: v.boolean(),
    contactEmail: v.string(),
    registrationEmail: v.string(),
    pressEmail: v.string(),
    phone: v.string(),
    whatsapp: v.string(),
    facebookUrl: v.string(),
    xUrl: v.string(),
    instagramUrl: v.string(),
    youtubeUrl: v.string(),
    linkedinUrl: v.optional(v.string()),
    heroEyebrow: v.string(),
    heroTitleLine1: v.string(),
    heroTitleLine2: v.string(),
    heroLead: v.string(),
    whyTitle: v.string(),
    whyBody: v.string(),
    donationEyebrow: v.string(),
    donationTitle: v.string(),
    donationBody: v.string(),
    bankTransferEyebrow: v.optional(v.string()),
    bankTransferTitle: v.optional(v.string()),
    bankTransferBody: v.optional(v.string()),
    bankAccountLabel: v.optional(v.string()),
    bankName: v.optional(v.string()),
    bankAccountName: v.optional(v.string()),
    bankIban: v.optional(v.string()),
    bankBic: v.optional(v.string()),
    usBankAccountLabel: v.optional(v.string()),
    usBankName: v.optional(v.string()),
    usBankAccountName: v.optional(v.string()),
    usBankRoutingNumber: v.optional(v.string()),
    usBankAccountNumber: v.optional(v.string()),
    usBankSwift: v.optional(v.string()),
    registrationFeeLabel: v.optional(v.string()),
    registrationFeeTitle: v.optional(v.string()),
    registrationFeeBody: v.optional(v.string()),
    registrationFeeEmail: v.optional(v.string()),
    forumPackagesMenuLabel: v.optional(v.string()),
    accommodationPackageLabel: v.optional(v.string()),
    accommodationPackageTitle: v.optional(v.string()),
    accommodationPackageIntro: v.optional(v.string()),
    sponsorshipPackageLabel: v.optional(v.string()),
    sponsorshipPackageTitle: v.optional(v.string()),
    sponsorshipPackageIntro: v.optional(v.string()),
    footerTitle: v.string(),
    footerBody: v.string(),
    registrationOpen: v.boolean(),
    donationsEnabled: v.boolean(),
    logoStorageId: v.optional(v.id("_storage")),
    faviconStorageId: v.optional(v.id("_storage")),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_logo_storage_id", ["logoStorageId"])
    .index("by_favicon_storage_id", ["faviconStorageId"]),

  cmsEntries: defineTable({
    category: v.union(
      v.literal("overview"),
      v.literal("agenda"),
      v.literal("resolution"),
      v.literal("strategy"),
      v.literal("partnership"),
      v.literal("why"),
      v.literal("challenge"),
      v.literal("presentMoment"),
      v.literal("engage"),
      v.literal("speaker"),
      v.literal("team"),
      v.literal("advisory"),
      v.literal("programme"),
      v.literal("forumPackage"),
      v.literal("media"),
      v.literal("faq"),
      v.literal("legal"),
      v.literal("pageCopy"),
      v.literal("sectionCopy")
    ),
    slug: v.string(),
    title: v.string(),
    eyebrow: v.string(),
    summary: v.string(),
    body: v.string(),
    secondaryText: v.string(),
    country: v.string(),
    role: v.string(),
    email: v.string(),
    phone: v.string(),
    linkLabel: v.string(),
    linkUrl: v.string(),
    dateLabel: v.string(),
    timeLabel: v.string(),
    parentSlug: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    order: v.number(),
    status: publicationStatus,
    featured: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_image_storage_id", ["imageStorageId"])
    .index("by_category_and_status_and_order", ["category", "status", "order"])
    .index("by_category_and_order", ["category", "order"]),

  homeBanners: defineTable({
    title: v.string(),
    imageStorageId: v.id("_storage"),
    altText: v.string(),
    order: v.number(),
    status: publicationStatus,
    updatedAt: v.number(),
  })
    .index("by_image_storage_id", ["imageStorageId"])
    .index("by_status_and_order", ["status", "order"])
    .index("by_order", ["order"]),

  programmeDays: defineTable({
    slug: v.string(),
    tabLabel: v.string(),
    navigationLabel: v.string(),
    dateLabel: v.string(),
    summary: v.string(),
    order: v.number(),
    status: publicationStatus,
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status_and_order", ["status", "order"]),

  programmeSessions: defineTable({
    daySlug: v.string(),
    slug: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    title: v.string(),
    description: v.string(),
    tag: v.string(),
    speakers: v.string(),
    location: v.string(),
    order: v.number(),
    status: publicationStatus,
    updatedAt: v.number(),
  })
    .index("by_day_slug_and_status_and_order", ["daySlug", "status", "order"])
    .index("by_day_slug_and_order", ["daySlug", "order"]),

  chartSeries: defineTable({
    slug: v.string(),
    title: v.string(),
    eyebrow: v.string(),
    description: v.string(),
    sourceLabel: v.string(),
    sourceUrl: v.string(),
    unit: v.string(),
    order: v.number(),
    status: publicationStatus,
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status_and_order", ["status", "order"]),

  chartPoints: defineTable({
    seriesSlug: v.string(),
    label: v.string(),
    sublabel: v.string(),
    value: v.number(),
    order: v.number(),
    updatedAt: v.number(),
  }).index("by_series_slug_and_order", ["seriesSlug", "order"]),

  regionalCountries: defineTable({
    slug: v.string(),
    name: v.string(),
    code: v.string(),
    eyebrow: v.string(),
    headline: v.string(),
    summary: v.string(),
    detail: v.string(),
    sourceUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    order: v.number(),
    status: publicationStatus,
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_image_storage_id", ["imageStorageId"])
    .index("by_status_and_order", ["status", "order"]),

  organizations: defineTable({
    slug: v.string(),
    name: v.string(),
    organizationRole: v.optional(
      v.union(
        v.literal("organizing"),
        v.literal("managing"),
        v.literal("supporting")
      )
    ),
    kind: v.union(v.literal("partner"), v.literal("sponsor")),
    tier: v.union(
      v.literal("strategic"),
      v.literal("knowledge"),
      v.literal("community"),
      v.literal("supporting")
    ),
    description: v.string(),
    websiteUrl: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    order: v.number(),
    status: publicationStatus,
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_logo_storage_id", ["logoStorageId"])
    .index("by_status_and_order", ["status", "order"])
    .index("by_kind_and_status_and_order", ["kind", "status", "order"]),

  mediaSections: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    order: v.number(),
    status: publicationStatus,
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status_and_order", ["status", "order"])
    .index("by_order", ["order"]),

  mediaItems: defineTable({
    sectionSlug: v.string(),
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    mediaType: v.optional(
      v.union(
        v.literal("document"),
        v.literal("photo"),
        v.literal("video")
      )
    ),
    coverStorageId: v.optional(v.id("_storage")),
    fileStorageId: v.optional(v.id("_storage")),
    fileName: v.string(),
    mimeType: v.string(),
    youtubeUrl: v.optional(v.string()),
    order: v.number(),
    status: publicationStatus,
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_section_slug_and_status_and_order", [
      "sectionSlug",
      "status",
      "order",
    ])
    .index("by_section_slug_and_order", ["sectionSlug", "order"])
    .index("by_cover_storage_id", ["coverStorageId"])
    .index("by_file_storage_id", ["fileStorageId"]),

  statements: defineTable({
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    releaseDate: v.string(),
    fileStorageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    order: v.number(),
    status: publicationStatus,
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status_and_release_date_and_order", [
      "status",
      "releaseDate",
      "order",
    ])
    .index("by_file_storage_id", ["fileStorageId"]),

  donationTiers: defineTable({
    slug: v.string(),
    label: v.string(),
    amountCents: v.optional(v.number()),
    description: v.string(),
    stripePriceId: v.optional(v.string()),
    customAmount: v.boolean(),
    order: v.number(),
    status: publicationStatus,
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status_and_order", ["status", "order"]),

  submissions: defineTable({
    type: v.union(
      v.literal("registration"),
      v.literal("support"),
      v.literal("contact"),
      v.literal("sponsorship"),
      v.literal("volunteer"),
      v.literal("media")
    ),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    organization: v.string(),
    attendingAs: v.string(),
    subject: v.string(),
    message: v.string(),
    consent: v.boolean(),
    status: submissionStatus,
    adminNote: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type_and_status", ["type", "status"])
    .index("by_status_and_created_at", ["status", "createdAt"])
    .index("by_email_and_created_at", ["email", "createdAt"]),

  mailMessages: defineTable({
    direction: v.union(v.literal("incoming"), v.literal("outgoing")),
    messageId: v.string(),
    inReplyTo: v.optional(v.string()),
    references: v.optional(v.string()),
    fromAddress: v.string(),
    fromName: v.string(),
    toAddresses: v.array(v.string()),
    ccAddresses: v.array(v.string()),
    bccAddresses: v.optional(v.array(v.string())),
    deliveredAddresses: v.optional(v.array(v.string())),
    failedAddresses: v.optional(v.array(v.string())),
    deferredAddresses: v.optional(v.array(v.string())),
    subject: v.string(),
    textBody: v.string(),
    htmlBody: v.string(),
    deliveryStatus: v.union(
      v.literal("received"),
      v.literal("queued"),
      v.literal("sent"),
      v.literal("failed")
    ),
    isRead: v.boolean(),
    sentByEmail: v.optional(v.string()),
    providerResponse: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_message_id", ["messageId"])
    .index("by_created_at", ["createdAt"])
    .index("by_direction_and_created_at", ["direction", "createdAt"]),

  mailContacts: defineTable({
    name: v.string(),
    email: v.string(),
    organization: v.string(),
    notes: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_updated_at", ["updatedAt"]),

  mailAttachments: defineTable({
    messageId: v.id("mailMessages"),
    fileName: v.string(),
    mimeType: v.string(),
    byteSize: v.number(),
    contentId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_message_id", ["messageId"]),

  mailDispatches: defineTable({
    providerMessageId: v.string(),
    recipientCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_provider_message_id", ["providerMessageId"])
    .index("by_created_at", ["createdAt"]),

  donations: defineTable({
    reference: v.string(),
    donorName: v.string(),
    donorEmail: v.string(),
    amountCents: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal("demo"),
      v.literal("pending"),
      v.literal("paid"),
      v.literal("failed"),
      v.literal("refunded"),
      v.literal("expired")
    ),
    stripeSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_reference", ["reference"])
    .index("by_stripe_session_id", ["stripeSessionId"])
    .index("by_status_and_created_at", ["status", "createdAt"]),

  assets: defineTable({
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    byteSize: v.number(),
    altText: v.string(),
    category: v.union(
      v.literal("logo"),
      v.literal("portrait"),
      v.literal("media"),
      v.literal("document"),
      v.literal("general")
    ),
    status: publicationStatus,
    uploadedBy: v.optional(v.string()),
    uploadedAt: v.number(),
  })
    .index("by_storage_id", ["storageId"])
    .index("by_category_and_status", ["category", "status"]),

  auditEvents: defineTable({
    actorId: v.string(),
    actorEmail: v.string(),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    summary: v.string(),
    createdAt: v.number(),
  })
    .index("by_actor_id_and_created_at", ["actorId", "createdAt"])
    .index("by_created_at", ["createdAt"]),
})
