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

export interface SummitSettings extends Record<string, any> {
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
  logoUrl: string | null
  faviconUrl: string | null
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

export interface DonationTier {
  _id: string
  slug: string
  label: string
  amountCents: number | null
  description: string
  customAmount: boolean
  order: number
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
  "/donation-tiers": DonationTier[]
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
