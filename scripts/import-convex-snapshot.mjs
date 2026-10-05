// Imports a Convex snapshot export (documents.jsonl + _storage files) into the
// Cloudflare development backend: D1 tables (SQL) + R2 objects.
// R2 object key == Convex storage id, so D1 *R2Key columns keep the raw id.
//
// Production is Admin-owned, so this script targets development only. It
// hard-fails on the production D1 id/name (summit-db /
// b9d39325-0be9-4e4b-a935-2d39b6f6512b) and the production bucket
// (summit-assets), mirroring scripts/refuse-production-seed.mjs. Nothing is
// written to D1 or R2 by this script: it only emits SQL and an upload script,
// and it requires an explicit --yes so an import is always a deliberate act.
//
// Usage:
//   node scripts/import-convex-snapshot.mjs <snapshotDir> <outDir> --yes \
//     [--target dev] [--db <dev-database-id>] [--bucket summit-assets-dev]
// Then, against development resources only:
//   cf d1 query <dev-db-id> --sql "$(cat outDir/<table>.sql)"   (per table file)
//   outDir/r2-upload.sh
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import {
  DEVELOPMENT,
  PRODUCTION,
  isIsolatedBucket,
  parseFlags,
  refuseProductionBucket,
  refuseProductionDatabase,
  resolveTarget,
} from "./d1-target.mjs"

const usage = () => {
  console.error(`Usage: node scripts/import-convex-snapshot.mjs <snapshotDir> <outDir> --yes [options]

  --yes                    Required. Confirms the import target is disposable.
  --target dev             Development resources (default)
  --db <uuid>              Development D1 id; default ${DEVELOPMENT.databaseId}
  --bucket <name>          R2 bucket; default ${DEVELOPMENT.bucket}, must be an isolated *-dev bucket

Production (${PRODUCTION.databaseName} D1 and the ${PRODUCTION.bucket} bucket) is refused.`)
}

const { flags, positional } = parseFlags(process.argv.slice(2))
if (flags.help) {
  usage()
  process.exit(0)
}

const [snapshotDirArg, outDirArg] = positional
if (!snapshotDirArg || !outDirArg) {
  usage()
  process.exit(1)
}

// Every guard runs before the output directory or any SQL file is created.
if (flags.yes !== true) {
  console.error(
    "Refusing to import without --yes. The generated SQL replaces development content, so confirm the target is disposable and re-run with --yes."
  )
  process.exit(1)
}

const target = resolveTarget(flags.target ?? "dev")
if (!target) {
  console.error("--target must be dev or prod.")
  process.exit(1)
}
// --target prod resolves the production id, so the shared guard refuses it.
const databaseId = flags.db === undefined ? target.databaseId : String(flags.db)
refuseProductionDatabase(databaseId)

const bucket = flags.bucket === undefined ? target.bucket : String(flags.bucket)
refuseProductionBucket(bucket)
if (!isIsolatedBucket(bucket)) {
  console.error(
    `Refusing bucket ${bucket}: this import only writes isolated development buckets, which end in -dev (for example ${DEVELOPMENT.bucket}).`
  )
  process.exit(1)
}

const snapshotDir = resolve(snapshotDirArg)
const outDir = resolve(outDirArg)

// Backup reminder, printed before anything is written: the SQL emitted below
// replaces development content, and the upload script replaces development
// objects, so both targets need a copy first.
console.warn(
  `Reminder: back up development D1 (cf d1 export ${databaseId}) and the ${bucket} bucket before applying this import. Take a content fingerprint afterwards: bun run db:fingerprint:dev`
)
mkdirSync(outDir, { recursive: true })

const docs = (table) => {
  const path = join(snapshotDir, table, "documents.jsonl")
  try {
    return readFileSync(path, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  } catch {
    return []
  }
}

const lit = (value) => {
  if (value === null || value === undefined) return "NULL"
  if (typeof value === "number") return Number.isFinite(value) ? String(Math.floor(value)) : "NULL"
  if (typeof value === "boolean") return value ? "1" : "0"
  return `'${String(value).replaceAll("'", "''")}'`
}
const real = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "NULL"
  return String(value)
}
const json = (value) => `'${JSON.stringify(value ?? []).replaceAll("'", "''")}'`
const id = (doc) => lit(doc._id)
const ts = (doc, field = "createdAt") => lit(doc[field] ?? doc._creationTime)

const sqlFiles = {}
const emit = (table, statement) => {
  sqlFiles[table] ??= []
  sqlFiles[table].push(statement)
}

// Storage-id references become R2 keys 1:1 (R2 key == Convex storage id).
const storageFiles = new Map()
for (const file of readdirSync(join(snapshotDir, "_storage"))) {
  if (file === "documents.jsonl") continue
  const dot = file.indexOf(".")
  const storageId = dot === -1 ? file : file.slice(0, dot)
  storageFiles.set(storageId, file)
}
const storageMeta = new Map(
  docs("_storage").map((row) => [row._id, row])
)
const missingStorage = new Set()
const r2Key = (storageId) => {
  if (!storageId) return null
  if (!storageFiles.has(storageId)) missingStorage.add(storageId)
  return storageId
}

const tables = {
  adminUsers: ["adminUsers", (d) => `INSERT INTO adminUsers (id, authUserId, email, name, role, status, createdAt, updatedAt) VALUES (${id(d)}, ${lit(d.authUserId)}, ${lit(d.email)}, ${lit(d.name)}, ${lit(d.role)}, ${lit(d.status)}, ${ts(d)}, ${lit(d.updatedAt)});`],
  siteSettings: ["siteSettings", (d) => {
    const cols = ["id", "key", "eventName", "shortName", "theme", "eventStartIso", "eventEndIso", "timezone", "venue", "address", "cityCountry", "format", "delegateInfo", "languages", "announcement", "announcementEnabled", "contactEmail", "registrationEmail", "pressEmail", "phone", "whatsapp", "facebookUrl", "xUrl", "instagramUrl", "youtubeUrl", "linkedinUrl", "heroEyebrow", "heroTitleLine1", "heroTitleLine2", "heroLead", "whyTitle", "whyBody", "donationEyebrow", "donationTitle", "donationBody", "bankTransferEyebrow", "bankTransferTitle", "bankTransferBody", "bankAccountLabel", "bankName", "bankAccountName", "bankIban", "bankBic", "usBankAccountLabel", "usBankName", "usBankAccountName", "usBankRoutingNumber", "usBankAccountNumber", "usBankSwift", "registrationFeeLabel", "registrationFeeTitle", "registrationFeeBody", "registrationFeeEmail", "forumPackagesMenuLabel", "accommodationPackageLabel", "accommodationPackageTitle", "accommodationPackageIntro", "sponsorshipPackageLabel", "sponsorshipPackageTitle", "sponsorshipPackageIntro", "footerTitle", "footerBody", "registrationOpen", "donationsEnabled", "logoR2Key", "faviconR2Key", "updatedAt"]
    const vals = [id(d), lit(d.key), lit(d.eventName), lit(d.shortName), lit(d.theme), lit(d.eventStartIso), lit(d.eventEndIso), lit(d.timezone), lit(d.venue), lit(d.address), lit(d.cityCountry), lit(d.format), lit(d.delegateInfo), lit(d.languages), lit(d.announcement), lit(d.announcementEnabled), lit(d.contactEmail), lit(d.registrationEmail), lit(d.pressEmail), lit(d.phone), lit(d.whatsapp), lit(d.facebookUrl), lit(d.xUrl), lit(d.instagramUrl), lit(d.youtubeUrl), lit(d.linkedinUrl), lit(d.heroEyebrow), lit(d.heroTitleLine1), lit(d.heroTitleLine2), lit(d.heroLead), lit(d.whyTitle), lit(d.whyBody), lit(d.donationEyebrow), lit(d.donationTitle), lit(d.donationBody), lit(d.bankTransferEyebrow), lit(d.bankTransferTitle), lit(d.bankTransferBody), lit(d.bankAccountLabel), lit(d.bankName), lit(d.bankAccountName), lit(d.bankIban), lit(d.bankBic), lit(d.usBankAccountLabel), lit(d.usBankName), lit(d.usBankAccountName), lit(d.usBankRoutingNumber), lit(d.usBankAccountNumber), lit(d.usBankSwift), lit(d.registrationFeeLabel), lit(d.registrationFeeTitle), lit(d.registrationFeeBody), lit(d.registrationFeeEmail), lit(d.forumPackagesMenuLabel), lit(d.accommodationPackageLabel), lit(d.accommodationPackageTitle), lit(d.accommodationPackageIntro), lit(d.sponsorshipPackageLabel), lit(d.sponsorshipPackageTitle), lit(d.sponsorshipPackageIntro), lit(d.footerTitle), lit(d.footerBody), lit(d.registrationOpen), lit(d.donationsEnabled), lit(r2Key(d.logoStorageId)), lit(r2Key(d.faviconStorageId)), lit(d.updatedAt)]
    return `INSERT INTO siteSettings (${cols.join(", ")}) VALUES (${vals.join(", ")});`
  }],
  cmsEntries: ["cmsEntries", (d) => `INSERT INTO cmsEntries (id, category, slug, title, eyebrow, summary, body, secondaryText, country, role, email, phone, linkLabel, linkUrl, dateLabel, timeLabel, parentSlug, imageR2Key, "order", status, featured, updatedAt) VALUES (${id(d)}, ${lit(d.category)}, ${lit(d.slug)}, ${lit(d.title)}, ${lit(d.eyebrow)}, ${lit(d.summary)}, ${lit(d.body)}, ${lit(d.secondaryText)}, ${lit(d.country)}, ${lit(d.role)}, ${lit(d.email)}, ${lit(d.phone)}, ${lit(d.linkLabel)}, ${lit(d.linkUrl)}, ${lit(d.dateLabel)}, ${lit(d.timeLabel)}, ${lit(d.parentSlug)}, ${lit(r2Key(d.imageStorageId))}, ${lit(d.order)}, ${lit(d.status)}, ${lit(d.featured)}, ${lit(d.updatedAt)});`],
  homeBanners: ["homeBanners", (d) => `INSERT INTO homeBanners (id, title, imageR2Key, altText, "order", status, updatedAt) VALUES (${id(d)}, ${lit(d.title)}, ${lit(r2Key(d.imageStorageId))}, ${lit(d.altText)}, ${lit(d.order)}, ${lit(d.status)}, ${lit(d.updatedAt)});`],
  programmeDays: ["programmeDays", (d) => `INSERT INTO programmeDays (id, slug, tabLabel, navigationLabel, dateLabel, summary, "order", status, updatedAt) VALUES (${id(d)}, ${lit(d.slug)}, ${lit(d.tabLabel)}, ${lit(d.navigationLabel)}, ${lit(d.dateLabel)}, ${lit(d.summary)}, ${lit(d.order)}, ${lit(d.status)}, ${lit(d.updatedAt)});`],
  programmeSessions: ["programmeSessions", (d) => `INSERT INTO programmeSessions (id, daySlug, slug, startTime, endTime, title, description, tag, speakers, location, "order", status, updatedAt) VALUES (${id(d)}, ${lit(d.daySlug)}, ${lit(d.slug)}, ${lit(d.startTime)}, ${lit(d.endTime)}, ${lit(d.title)}, ${lit(d.description)}, ${lit(d.tag)}, ${lit(d.speakers)}, ${lit(d.location)}, ${lit(d.order)}, ${lit(d.status)}, ${lit(d.updatedAt)});`],
  chartSeries: ["chartSeries", (d) => `INSERT INTO chartSeries (id, slug, title, eyebrow, description, sourceLabel, sourceUrl, unit, "order", status, updatedAt) VALUES (${id(d)}, ${lit(d.slug)}, ${lit(d.title)}, ${lit(d.eyebrow)}, ${lit(d.description)}, ${lit(d.sourceLabel)}, ${lit(d.sourceUrl)}, ${lit(d.unit)}, ${lit(d.order)}, ${lit(d.status)}, ${lit(d.updatedAt)});`],
  chartPoints: ["chartPoints", (d) => `INSERT INTO chartPoints (id, seriesSlug, label, sublabel, value, "order", updatedAt) VALUES (${id(d)}, ${lit(d.seriesSlug)}, ${lit(d.label)}, ${lit(d.sublabel)}, ${real(d.value)}, ${lit(d.order)}, ${lit(d.updatedAt)});`],
  regionalCountries: ["regionalCountries", (d) => `INSERT INTO regionalCountries (id, slug, name, code, eyebrow, headline, summary, detail, sourceUrl, imageR2Key, "order", status, updatedAt) VALUES (${id(d)}, ${lit(d.slug)}, ${lit(d.name)}, ${lit(d.code)}, ${lit(d.eyebrow)}, ${lit(d.headline)}, ${lit(d.summary)}, ${lit(d.detail)}, ${lit(d.sourceUrl)}, ${lit(r2Key(d.imageStorageId))}, ${lit(d.order)}, ${lit(d.status)}, ${lit(d.updatedAt)});`],
  organizations: ["organizations", (d) => `INSERT INTO organizations (id, slug, name, organizationRole, kind, tier, description, websiteUrl, logoR2Key, "order", status, updatedAt) VALUES (${id(d)}, ${lit(d.slug)}, ${lit(d.name)}, ${lit(d.organizationRole)}, ${lit(d.kind)}, ${lit(d.tier)}, ${lit(d.description)}, ${lit(d.websiteUrl)}, ${lit(r2Key(d.logoStorageId))}, ${lit(d.order)}, ${lit(d.status)}, ${lit(d.updatedAt)});`],
  mediaSections: ["mediaSections", (d) => `INSERT INTO mediaSections (id, slug, name, description, "order", status, updatedAt) VALUES (${id(d)}, ${lit(d.slug)}, ${lit(d.name)}, ${lit(d.description)}, ${lit(d.order)}, ${lit(d.status)}, ${lit(d.updatedAt)});`],
  mediaItems: ["mediaItems", (d) => `INSERT INTO mediaItems (id, sectionSlug, slug, title, description, mediaType, coverR2Key, fileR2Key, fileName, mimeType, youtubeUrl, "order", status, updatedAt) VALUES (${id(d)}, ${lit(d.sectionSlug)}, ${lit(d.slug)}, ${lit(d.title)}, ${lit(d.description)}, ${lit(d.mediaType)}, ${lit(r2Key(d.coverStorageId))}, ${lit(r2Key(d.fileStorageId))}, ${lit(d.fileName)}, ${lit(d.mimeType)}, ${lit(d.youtubeUrl)}, ${lit(d.order)}, ${lit(d.status)}, ${lit(d.updatedAt)});`],
  statements: ["statements", (d) => `INSERT INTO statements (id, slug, title, description, releaseDate, fileR2Key, fileName, mimeType, "order", status, updatedAt) VALUES (${id(d)}, ${lit(d.slug)}, ${lit(d.title)}, ${lit(d.description)}, ${lit(d.releaseDate)}, ${lit(r2Key(d.fileStorageId))}, ${lit(d.fileName)}, ${lit(d.mimeType)}, ${lit(d.order)}, ${lit(d.status)}, ${lit(d.updatedAt)});`],
  donationTiers: ["donationTiers", (d) => `INSERT INTO donationTiers (id, slug, label, amountCents, description, customAmount, "order", status, updatedAt) VALUES (${id(d)}, ${lit(d.slug)}, ${lit(d.label)}, ${lit(d.amountCents)}, ${lit(d.description)}, ${lit(d.customAmount)}, ${lit(d.order)}, ${lit(d.status)}, ${lit(d.updatedAt)});`],
  submissions: ["submissions", (d) => `INSERT INTO submissions (id, type, firstName, lastName, email, phone, organization, attendingAs, subject, message, consent, status, adminNote, createdAt, updatedAt) VALUES (${id(d)}, ${lit(d.type)}, ${lit(d.firstName)}, ${lit(d.lastName)}, ${lit(d.email)}, ${lit(d.phone)}, ${lit(d.organization)}, ${lit(d.attendingAs)}, ${lit(d.subject)}, ${lit(d.message)}, ${lit(d.consent)}, ${lit(d.status)}, ${lit(d.adminNote ?? "")}, ${ts(d)}, ${lit(d.updatedAt)});`],
  mailMessages: ["mailMessages", (d) => `INSERT INTO mailMessages (id, direction, messageId, inReplyTo, "references", fromAddress, fromName, toAddresses, ccAddresses, bccAddresses, deliveredAddresses, failedAddresses, deferredAddresses, subject, textBody, htmlBody, deliveryStatus, isRead, sentByEmail, providerResponse, createdAt, updatedAt) VALUES (${id(d)}, ${lit(d.direction)}, ${lit(d.messageId)}, ${lit(d.inReplyTo)}, ${lit(d.references)}, ${lit(d.fromAddress)}, ${lit(d.fromName ?? "")}, ${json(d.toAddresses)}, ${json(d.ccAddresses)}, ${json(d.bccAddresses)}, ${json(d.deliveredAddresses)}, ${json(d.failedAddresses)}, ${json(d.deferredAddresses)}, ${lit(d.subject)}, ${lit(d.textBody ?? "")}, ${lit(d.htmlBody ?? "")}, ${lit(d.deliveryStatus)}, ${lit(d.isRead)}, ${lit(d.sentByEmail)}, ${lit(d.providerResponse)}, ${ts(d)}, ${lit(d.updatedAt)});`],
  mailContacts: ["mailContacts", (d) => `INSERT INTO mailContacts (id, name, email, organization, notes, createdAt, updatedAt) VALUES (${id(d)}, ${lit(d.name)}, ${lit(d.email)}, ${lit(d.organization ?? "")}, ${lit(d.notes ?? "")}, ${ts(d)}, ${lit(d.updatedAt)});`],
  mailAttachments: ["mailAttachments", (d) => `INSERT INTO mailAttachments (id, messageId, fileName, mimeType, byteSize, contentId, createdAt) VALUES (${id(d)}, ${lit(d.messageId)}, ${lit(d.fileName)}, ${lit(d.mimeType)}, ${lit(d.byteSize)}, ${lit(d.contentId)}, ${ts(d)});`],
  mailDispatches: ["mailDispatches", (d) => `INSERT INTO mailDispatches (id, providerMessageId, recipientCount, createdAt) VALUES (${id(d)}, ${lit(d.providerMessageId)}, ${lit(d.recipientCount)}, ${ts(d)});`],
  donations: ["donations", (d) => `INSERT INTO donations (id, reference, donorName, donorEmail, amountCents, currency, status, createdAt, updatedAt) VALUES (${id(d)}, ${lit(d.reference)}, ${lit(d.donorName)}, ${lit(d.donorEmail)}, ${lit(d.amountCents)}, ${lit(d.currency ?? "eur")}, ${lit(d.status)}, ${ts(d)}, ${lit(d.updatedAt)});`],
  assets: ["assets", (d) => `INSERT INTO assets (id, r2Key, fileName, mimeType, byteSize, altText, category, status, uploadedBy, uploadedAt) VALUES (${id(d)}, ${lit(r2Key(d.storageId))}, ${lit(d.fileName)}, ${lit(d.mimeType)}, ${lit(d.byteSize)}, ${lit(d.altText)}, ${lit(d.category)}, ${lit(d.status ?? "published")}, ${lit(d.uploadedBy)}, ${lit(d.uploadedAt ?? d._creationTime)});`],
  auditEvents: ["auditEvents", (d) => `INSERT INTO auditEvents (id, actorId, actorEmail, action, entityType, entityId, summary, createdAt) VALUES (${id(d)}, ${lit(d.actorId)}, ${lit(d.actorEmail)}, ${lit(d.action)}, ${lit(d.entityType)}, ${lit(d.entityId)}, ${lit(d.summary)}, ${ts(d)});`],
  user: ["_components/betterAuth/user", (d) => `INSERT INTO user (id, name, email, emailVerified, image, createdAt, updatedAt) VALUES (${id(d)}, ${lit(d.name)}, ${lit(d.email)}, ${lit(d.emailVerified)}, ${lit(d.image)}, ${ts(d)}, ${lit(d.updatedAt)});`],
  session: ["_components/betterAuth/session", (d) => `INSERT INTO session (id, expiresAt, token, createdAt, updatedAt, ipAddress, userAgent, userId) VALUES (${id(d)}, ${lit(d.expiresAt)}, ${lit(d.token)}, ${ts(d)}, ${lit(d.updatedAt)}, ${lit(d.ipAddress)}, ${lit(d.userAgent)}, ${lit(d.userId)});`],
  account: ["_components/betterAuth/account", (d) => `INSERT INTO account (id, accountId, providerId, userId, accessToken, refreshToken, idToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, createdAt, updatedAt) VALUES (${id(d)}, ${lit(d.accountId)}, ${lit(d.providerId)}, ${lit(d.userId)}, ${lit(d.accessToken)}, ${lit(d.refreshToken)}, ${lit(d.idToken)}, ${lit(d.accessTokenExpiresAt)}, ${lit(d.refreshTokenExpiresAt)}, ${lit(d.scope)}, ${lit(d.password)}, ${ts(d)}, ${lit(d.updatedAt)});`],
  verification: ["_components/betterAuth/verification", (d) => `INSERT INTO verification (id, identifier, value, expiresAt, createdAt, updatedAt) VALUES (${id(d)}, ${lit(d.identifier)}, ${lit(d.value)}, ${lit(d.expiresAt)}, ${ts(d)}, ${lit(d.updatedAt)});`],
}

let total = 0
for (const [table, [dir, map]] of Object.entries(tables)) {
  const rows = docs(dir)
  if (rows.length === 0) continue
  for (const row of rows) emit(table, map(row))
  total += rows.length
}
for (const [table, statements] of Object.entries(sqlFiles)) {
  writeFileSync(join(outDir, `${table}.sql`), `${statements.join("\n")}\n`, "utf8")
}

// R2 upload commands: object key == Convex storage id.
const uploads = []
for (const [storageId, file] of storageFiles) {
  const meta = storageMeta.get(storageId) ?? {}
  uploads.push(
    `cf r2 objects put ${JSON.stringify(storageId)} --bucket-name ${bucket} --file ${JSON.stringify(join(snapshotDir, "_storage", file))} --content-type ${JSON.stringify(String(meta.contentType ?? "application/octet-stream"))}`
  )
}
writeFileSync(join(outDir, "r2-upload.sh"), `#!/bin/sh\nset -eu\n${uploads.join("\n")}\n`, { mode: 0o755 })

console.log(`Target: D1 ${target.databaseName} (${databaseId}), R2 bucket ${bucket} [${target.target}]`)
console.log(`Tables: ${Object.keys(sqlFiles).join(", ")}`)
console.log(`Documents: ${total}, storage files: ${uploads.length}`)
console.log(
  `Nothing was written to D1 or R2. Apply ${Object.keys(sqlFiles).length} SQL file(s) to ${target.databaseName} with cf d1 query, then run ${join(outDir, "r2-upload.sh")}.`
)
if (missingStorage.size > 0) {
  console.log(`WARNING: ${missingStorage.size} referenced storage ids missing from export: ${[...missingStorage].join(", ")}`)
}
