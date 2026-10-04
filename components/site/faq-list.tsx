"use client"

import { ChevronDownIcon } from "lucide-react"

import { ContentListSkeleton } from "@/components/site/content-list-skeleton"
import { useApi } from "@/lib/api"

export function FaqList() {
  const entries = useApi("/cms/published", { category: "faq" })
  if (entries === undefined) {
    return <section className="faq-list section-shell"><ContentListSkeleton /></section>
  }

  return (
    <section className="faq-list section-shell">
      {entries.map((entry, index) => (
        <details key={entry._id}>
          <summary>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h2>{entry.title}</h2>
            <ChevronDownIcon aria-hidden="true" />
          </summary>
          <div>
            {entry.summary && <p className="faq-summary">{entry.summary}</p>}
            {entry.body && <p>{entry.body}</p>}
          </div>
        </details>
      ))}
    </section>
  )
}
