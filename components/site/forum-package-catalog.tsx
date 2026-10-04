"use client"

import Link from "next/link"
import { ArrowRightIcon, CheckIcon, XIcon } from "lucide-react"

import { ContentListSkeleton } from "@/components/site/content-list-skeleton"
import { useApi } from "@/lib/api"

type Catalogue = "accommodation" | "sponsorship"

const copy = {
  accommodation:{
    eyebrow:"Four nights in Paris",
    title:"Stay close to the Forum.",
    intro:"Compare five accommodation levels for the Paris Hindu Summit. Every package includes four hotel nights and the local tourist tax.",
    note:"Local transportation, where included, covers hotel-to-venue return service on 2, 3 and 4 October.",
  },
  sponsorship:{
    eyebrow:"Partnership & Sponsorship",
    title:"Put your institution behind meaningful action.",
    intro:"Choose a level that matches your organisation's goals—from visible Forum partnership to a focused programme, hospitality, scholarship or archive contribution.",
    note:"Availability and programme placement remain subject to confirmation by the Forum partnership team.",
  },
} as const

export function ForumPackageCatalog({ catalogue }: { catalogue:Catalogue }) {
  const entries = useApi("/cms/published", { category: "forumPackage" })
  const settings = useApi("/settings")
  const packages = entries?.filter((entry) => entry.parentSlug === catalogue)
  const text = copy[catalogue]
  const eyebrow = catalogue === "accommodation" ? settings?.accommodationPackageLabel : settings?.sponsorshipPackageLabel
  const title = catalogue === "accommodation" ? settings?.accommodationPackageTitle : settings?.sponsorshipPackageTitle
  const intro = catalogue === "accommodation" ? settings?.accommodationPackageIntro : settings?.sponsorshipPackageIntro
  return <main className="forum-packages-page">
    <section className="section-shell forum-packages-hero">
      <p className="kicker">{eyebrow ?? text.eyebrow}</p>
      <h1>{title ?? text.title}</h1>
      <p>{intro ?? text.intro}</p>
      <nav className="package-switcher" aria-label="Forum package categories">
        <Link data-active={catalogue === "accommodation"} href="/forum-packages/accommodation">Accommodation packages</Link>
        <Link data-active={catalogue === "sponsorship"} href="/forum-packages/partnership-sponsorship">Partnership & sponsorship</Link>
      </nav>
    </section>
    <section className="section-shell package-catalogue" aria-live="polite">
      {packages === undefined ? <ContentListSkeleton cards={5} /> : packages.length === 0 ? <p>No packages are currently published.</p> : <div className="package-card-grid">
        {packages.map((item, index) => {
          const included = item.body.split("\n").map((value) => value.trim()).filter(Boolean)
          const excluded = item.secondaryText.split("\n").map((value) => value.trim()).filter(Boolean)
          return <article className="package-card" key={item._id}>
            <header><span>{String(index + 1).padStart(2,"0")}</span><p>{item.summary}</p></header>
            <h2>{item.title}</h2>
            <strong>{item.dateLabel}</strong>
            <div className="package-features">
              {included.map((feature) => <p key={feature}><CheckIcon aria-hidden="true" />{feature}</p>)}
              {excluded.map((feature) => <p data-excluded key={feature}><XIcon aria-hidden="true" />{feature}</p>)}
            </div>
          </article>
        })}
      </div>}
      <div className="package-note"><p>{text.note}</p><Link href="/participate#contact">Discuss a package <ArrowRightIcon aria-hidden="true" /></Link></div>
    </section>
  </main>
}
