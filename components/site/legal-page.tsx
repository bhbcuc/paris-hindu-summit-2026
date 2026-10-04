"use client"

import { ContentListSkeleton } from "@/components/site/content-list-skeleton"
import { useEditorialRecord } from "@/components/site/managed-editorial"
import { useApi } from "@/lib/api"

export function LegalPage({ slug }: { slug: string }) {
  const entries = useApi("/cms/published", { category: "legal" })
  const draftNote = useEditorialRecord("legal-draft-note", {
    title:"This is a working draft and requires organiser/legal approval before public launch.",
  })
  const entry = entries?.find((item) => item.slug === slug)
  if (entries === undefined) {
    return <section className="legal-copy section-shell"><ContentListSkeleton cards={1} /></section>
  }
  if (!entry) return <section className="legal-copy section-shell"><p>This legal page is currently unavailable.</p></section>
  return <section className="legal-copy section-shell"><p className="kicker">{entry.eyebrow}</p><h1>{entry.title}</h1><p className="legal-lead">{entry.summary}</p>{entry.body.split("\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<aside>{draftNote.title}</aside></section>
}
