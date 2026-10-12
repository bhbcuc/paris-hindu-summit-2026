"use client"

// Typed client for the Hono API at /api/v1/* (D1 + R2 backend).
// Mirrors the convex/react `useQuery` contract: returns `undefined` while
// loading, then the JSON payload (or `null` when the backend returns null).
// Components migrate by swapping `useQuery(api.x.y, args)` for
// `useApi<T>("/x/y", params)` with identical render logic.

import { useEffect, useState } from "react"

function toQuery(params?: Record<string, string | number | boolean>) {
  if (!params) return ""
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

// Response shapes mirror server/app.ts (ported 1:1 from the Convex queries).
export interface CmsEntry {
  _id: string
  category: string
  slug: string
  title: string
  eyebrow: string
  summary: string
  body: string
  secondaryText: string
  country: string
  role: string
  email: string
  phone: string
  linkLabel: string
  linkUrl: string
  dateLabel: string
  timeLabel: string
  parentSlug: string
  imageStorageId: string | null
  order: number
  status: "draft" | "published"
  featured: boolean
  imageUrl: string | null
}

// The `siteSettings` row (db/migrations/0001_init.sql) is a wide single-row
// table: every column is TEXT except the three INTEGER toggles, which the API
// converts to booleans. The index signature covers the admin settings editor,
// which renders field keys dynamically, so unknown keys must stay typed.
// Nullable asset columns are declared optional; D1 hands back `null` for them
// and every consumer guards with a falsy check or `?? ""`.
export interface SummitSettings extends Record<string, string | boolean | undefined> {
  eventName: string
  shortName: string
  theme: string
  timezone: string
  venue: string
  address: string
  cityCountry: string
  format: string
  delegateInfo: string
  languages: string
  linkedinUrl: string
  heroEyebrow: string
  heroTitleLine1: string
  heroTitleLine2: string
  heroLead: string
  whyTitle: string
  whyBody: string
  donationEyebrow: string
  donationTitle: string
  donationBody: string
  bankTransferEyebrow: string
  bankTransferTitle: string
  bankTransferBody: string
  bankAccountLabel: string
  bankName: string
  bankAccountName: string
  bankIban: string
  bankBic: string
  usBankAccountLabel: string
  usBankName: string
  usBankAccountName: string
  usBankRoutingNumber: string
  usBankAccountNumber: string
  usBankSwift: string
  registrationFeeLabel: string
  registrationFeeTitle: string
  registrationFeeBody: string
  registrationFeeEmail: string
  eventStartIso: string
  eventEndIso: string
  announcement: string
  announcementEnabled: boolean
  registrationOpen: boolean
  donationsEnabled: boolean
  contactEmail: string
  registrationEmail: string
  pressEmail: string
  phone: string
  whatsapp: string
  facebookUrl: string
  xUrl: string
  instagramUrl: string
  youtubeUrl: string
  forumPackagesMenuLabel: string
  accommodationPackageLabel: string
  accommodationPackageTitle: string
  accommodationPackageIntro: string
  sponsorshipPackageLabel: string
  sponsorshipPackageTitle: string
  sponsorshipPackageIntro: string
  footerTitle: string
  footerBody: string
  logoUrl?: string
  faviconUrl?: string
  logoStorageId?: string
  faviconStorageId?: string
}

export interface ProgrammeSession {
  _id: string
  daySlug: string
  slug: string
  startTime: string
  endTime: string
  title: string
  description: string
  tag: string
  speakers: string
  location: string
  order: number
  status: string
}

export interface ProgrammeDay {
  _id: string
  slug: string
  tabLabel: string
  navigationLabel: string
  dateLabel: string
  summary: string
  order: number
  status: string
  sessions: ProgrammeSession[]
}

export interface ChartPoint {
  _id: string
  seriesSlug: string
  label: string
  sublabel: string
  value: number
  order: number
}

export interface ChartSeries {
  _id: string
  slug: string
  title: string
  eyebrow: string
  description: string
  sourceLabel: string
  sourceUrl: string
  unit: string
  order: number
  status: string
  points: ChartPoint[]
}

export interface RegionalCountry {
  _id: string
  slug: string
  name: string
  code: string
  eyebrow: string
  headline: string
  summary: string
  detail: string
  sourceUrl: string | null
  imageUrl: string | null
  order: number
}

export interface Organization {
  _id: string
  slug: string
  name: string
  organizationRole: "organizing" | "managing" | "supporting"
  kind: string
  tier: string
  description: string
  websiteUrl: string | null
  logoUrl: string | null
  order: number
}

export interface MediaItem {
  _id: string
  sectionSlug: string
  slug: string
  title: string
  description: string
  mediaType: string
  coverUrl: string | null
  fileUrl: string | null
  fileName: string
  mimeType: string
  youtubeUrl: string | null
  order: number
}

export interface MediaSection {
  _id: string
  slug: string
  name: string
  description: string
  order: number
  items: MediaItem[]
}

export interface Statement {
  _id: string
  slug: string
  title: string
  description: string
  releaseDate: string
  fileName: string
  mimeType: string
  order: number
  fileUrl: string
}

export interface Banner {
  _id: string
  title: string
  imageStorageId: string
  imageUrl: string
  altText: string
  order: number
  status: string
  updatedAt: number
}

interface ApiResponses {
  "/settings": SummitSettings | null
  "/programme": ProgrammeDay[]
  "/charts": ChartSeries[]
  "/banners": Banner[]
  "/media": MediaSection[]
  "/statements": Statement[]
  "/organizations": Organization[]
  "/regional": RegionalCountry[]
  "/cms/published": CmsEntry[]
}

export function useApi<Path extends keyof ApiResponses>(
  path: Path,
  params?: Record<string, string | number | boolean>
): ApiResponses[Path] | undefined {
  const key = `${path}${toQuery(params)}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(undefined)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/v1${key}`)
      .then((response) => {
        if (!response.ok) throw new Error(`API ${response.status}`)
        return response.json()
      })
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch(() => {
        if (!cancelled) setData(undefined)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return data
}

export type AdminRole = "administrator" | "editor" | "mail_manager"

export interface AdminAccessState {
  signedIn: boolean
  bootstrapAvailable: boolean
  admin: { name: string; email: string; role: AdminRole } | null
}

export interface AdminTeamMember {
  _id: string
  name: string
  email: string
  role: string
  status: string
  createdAt: number
}

export interface AdminDashboard {
  content: number
  submissions: number
  assets: number
  recentSubmissions: Array<{ _id: string; type: string; name: string; email: string; status: string; createdAt: number }>
}

export interface AdminSubmission {
  _id: string
  _creationTime: number
  type: string
  firstName: string
  lastName: string
  email: string
  phone: string
  organization: string
  subject: string
  message: string
  status: string
  adminNote: string
  createdAt: number
}

export interface AdminAuditEvent {
  _id: string
  actorEmail: string
  action: string
  entityType: string
  summary: string
  createdAt: number
}

export interface AdminAsset {
  _id: string
  storageId: string
  fileName: string
  mimeType: string
  byteSize: number
  altText: string
  category: string
  url: string | null
  uploadedAt: number
}

export interface AdminBanner {
  _id: string
  title: string
  imageStorageId?: string
  imageUrl: string | null
  altText: string
  order: number
  status: "draft" | "published"
  updatedAt: number
}

export interface AdminRegional {
  _id: string
  slug: string
  name: string
  code: string
  eyebrow: string
  headline: string
  summary: string
  detail: string
  sourceUrl: string
  order: number
  status: string
}

export interface AdminOrganization {
  _id: string
  slug: string
  name: string
  organizationRole?: "organizing" | "managing" | "supporting"
  kind: string
  tier: string
  description: string
  websiteUrl?: string
  logoStorageId?: string
  order: number
  status: string
}

export interface AdminMediaSection {
  _id: string
  slug: string
  name: string
  description: string
  order: number
  status: string
}

export interface AdminMediaItem {
  _id: string
  sectionSlug: string
  slug: string
  title: string
  description: string
  mediaType: "document" | "photo" | "video"
  coverStorageId?: string
  fileStorageId?: string
  fileName: string
  mimeType: string
  youtubeUrl?: string
  order: number
  status: "draft" | "published"
}

export interface AdminMedia {
  sections: AdminMediaSection[]
  items: AdminMediaItem[]
}

export interface AdminStatement {
  _id: string
  slug: string
  title: string
  description: string
  releaseDate: string
  fileStorageId: string
  fileName: string
  mimeType: string
  order: number
  status: "draft" | "published"
}

export interface AdminProgrammeDay {
  _id: string
  slug: string
  tabLabel: string
  navigationLabel: string
  dateLabel: string
  summary: string
  order: number
  status: string
}

export interface AdminProgrammeSession {
  _id: string
  daySlug: string
  slug: string
  startTime: string
  endTime: string
  title: string
  description: string
  tag: string
  speakers: string
  location: string
  order: number
  status: string
}

export interface AdminProgramme {
  days: AdminProgrammeDay[]
  sessions: AdminProgrammeSession[]
}

export interface AdminChartSeries {
  _id: string
  slug: string
  title: string
  eyebrow: string
  description: string
  sourceLabel: string
  sourceUrl: string
  unit: string
  order: number
  status: string
}

export interface AdminChartPoint {
  _id: string
  seriesSlug: string
  label: string
  sublabel: string
  value: number
  order: number
}

export interface AdminCharts {
  series: AdminChartSeries[]
  points: AdminChartPoint[]
}

export interface AdminMailAttachment {
  _id: string
  fileName: string
  mimeType: string
  byteSize: number
  contentId: string | null
}

export interface AdminMailMessage {
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
  deliveredAddresses: string[]
  failedAddresses: string[]
  deferredAddresses: string[]
  subject: string
  textBody: string
  htmlBody: string
  deliveryStatus: string
  isRead: boolean
  sentByEmail: string | null
  providerResponse: string | null
  createdAt: number
  updatedAt: number
  attachments: AdminMailAttachment[]
}

export interface AdminMailAllowance {
  limit: number
  used: number
  remaining: number
  resetsAt: number
  providerRemaining: number | null
  source: string
}

export interface AdminMailContact {
  _id: string
  name: string
  email: string
  organization: string
  notes: string
  createdAt: number
}

interface AdminApiResponses {
  "/access": AdminAccessState
  "/team": AdminTeamMember[]
  "/dashboard": AdminDashboard
  "/submissions": AdminSubmission[]
  "/audit": AdminAuditEvent[]
  "/assets": AdminAsset[]
  "/banners": AdminBanner[]
  "/cms": CmsEntry[]
  "/regional": AdminRegional[]
  "/organizations": AdminOrganization[]
  "/media": AdminMedia
  "/statements": AdminStatement[]
  "/programme": AdminProgramme
  "/charts": AdminCharts
  "/mail/messages": AdminMailMessage[]
  "/mail/allowance": AdminMailAllowance
  "/mail/contacts": AdminMailContact[]
}

const adminListeners = new Set<() => void>()

export function mutateAdminApi() {
  for (const listener of Array.from(adminListeners)) {
    try {
      listener()
    } catch {
      // ignore
    }
  }
}

export function useAdminApi<Path extends keyof AdminApiResponses>(
  path: Path,
  params?: Record<string, string | number | boolean>
): AdminApiResponses[Path] | undefined {
  const key = `/admin${path}${toQuery(params)}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(undefined)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const handleMutate = () => setRevision((r) => r + 1)
    adminListeners.add(handleMutate)
    return () => {
      adminListeners.delete(handleMutate)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/v1${key}`)
      .then((response) => {
        if (!response.ok) throw new Error(`API ${response.status}`)
        return response.json()
      })
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch(() => {
        if (!cancelled) setData(undefined)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, revision])

  return data
}

export async function apiAdminPost<T>(path: string, body: unknown): Promise<T> {
  const result = await apiPost<T>(`/admin${path}`, body)
  mutateAdminApi()
  return result
}

export async function apiAdminDelete(path: string, id: string): Promise<null> {
  const response = await fetch(`/api/v1/admin${path}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    throw new Error(
      (detail as { error?: string } | null)?.error ?? `Request failed (${response.status})`
    )
  }
  mutateAdminApi()
  return null
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    throw new Error(
      (detail as { error?: string } | null)?.error ?? `Request failed (${response.status})`
    )
  }
  return response.json() as Promise<T>
}
