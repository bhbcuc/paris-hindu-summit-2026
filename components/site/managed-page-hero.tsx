"use client"

import { PageHero } from "@/components/site/page-hero"
import { useApi } from "@/lib/api"

export function ManagedPageHero({
  slug,
  eyebrow,
  title,
  intro,
  image,
}: {
  slug:string
  eyebrow:string
  title:string
  intro:string
  image?:string
}) {
  const entries = useApi("/cms/published", { category: "pageCopy" })
  const page = entries?.find((entry) => entry.slug === slug)

  return (
    <PageHero
      eyebrow={page?.eyebrow || (entries === undefined ? "" : eyebrow)}
      title={page?.title || (entries === undefined ? "" : title)}
      intro={page?.summary || (entries === undefined ? "" : intro)}
      image={image}
      loading={entries === undefined}
    />
  )
}
