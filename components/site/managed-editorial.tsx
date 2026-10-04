"use client"

import { useApi } from "@/lib/api"

type EditorialField =
  | "title"
  | "eyebrow"
  | "summary"
  | "body"
  | "secondaryText"
  | "linkLabel"
  | "linkUrl"
  | "dateLabel"
  | "timeLabel"

export type EditorialFallback = Partial<Record<EditorialField, string>>

export function useEditorialRecord(
  slug:string,
  fallback:EditorialFallback = {}
) {
  const entries = useApi("/cms/published", { category: "sectionCopy" })
  const entry = entries?.find((item) => item.slug === slug)
  return {
    isLoading:entries === undefined,
    title:entry?.title || fallback.title || "",
    eyebrow:entry?.eyebrow || fallback.eyebrow || "",
    summary:entry?.summary || fallback.summary || "",
    body:entry?.body || fallback.body || "",
    secondaryText:entry?.secondaryText || fallback.secondaryText || "",
    linkLabel:entry?.linkLabel || fallback.linkLabel || "",
    linkUrl:entry?.linkUrl || fallback.linkUrl || "",
    dateLabel:entry?.dateLabel || fallback.dateLabel || "",
    timeLabel:entry?.timeLabel || fallback.timeLabel || "",
  }
}

export function ManagedText({
  slug,
  field,
  fallback,
}: {
  slug:string
  field:EditorialField
  fallback:string
}) {
  const entry = useEditorialRecord(slug, { [field]:fallback })
  return <>{entry[field]}</>
}
