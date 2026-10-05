"use client"

import { SmartImage } from "@/components/site/smart-image"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useApi } from "@/lib/api"
import { useEditorialRecord } from "@/components/site/managed-editorial"
import { Reveal } from "@/components/site/reveal"

export function HomeInfoBar() {
  const settings = useApi("/settings")
  const labels = useEditorialRecord("home-info-labels", {
    title:"Venue",
    summary:"Format",
    body:"Delegates",
    secondaryText:"Languages",
  })
  const facts = [
    [labels.title, settings?.venue ?? "Salle des Princes"],
    [labels.summary, settings?.format ?? "Two-day international summit"],
    [labels.body, settings?.delegateInfo ?? "International delegates"],
    [labels.secondaryText, settings?.languages ?? "English · French · Bengali"],
  ]
  return <section className="home-info-bar">{facts.map(([label,value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</section>
}

export function EvidenceStats() {
  const entries = useApi("/cms/published", { category: "sectionCopy" })
  const stats = (entries ?? []).filter(
    (entry) =>
      entry.slug.startsWith("home-evidence-") &&
      entry.slug !== "home-evidence-heading"
  )

  return (
    <div className="evidence-grid">
      {stats.map((entry) => (
        <article key={entry._id}>
          <b>{entry.title}</b>
          {entry.summary && <p>{entry.summary}</p>}
        </article>
      ))}
    </div>
  )
}

export function EvidenceCharts() {
  const series = useApi("/charts")
  return (
    <section className="evidence-charts section-shell" id="evidence-charts">
      {series?.map((chart, index) => {
        const maximum = Math.max(
          1,
          ...chart.points.map((point) => Math.abs(point.value))
        )

        return (
          <Reveal key={chart._id} delay={index * 100}>
            <article>
              <header>
                <p className="kicker">{chart.eyebrow}</p>
                <h2>{chart.title}</h2>
                <p>{chart.description}</p>
              </header>
              <div
                className="evidence-bar-chart"
                role="img"
                aria-label={`${chart.title}. Exact values are listed in the table below.`}
              >
                {chart.points.map((point) => (
                  <div className="evidence-bar-column" key={point._id}>
                    <span>{point.value}</span>
                    <i
                      aria-hidden="true"
                      style={{
                        "--bar-size": `${Math.max(4, (Math.abs(point.value) / maximum) * 100)}%`,
                      } as React.CSSProperties}
                    />
                    <b>{point.label}</b>
                  </div>
                ))}
              </div>
              <table>
                <caption className="sr-only">{chart.title}</caption>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Context</th>
                    <th>Value ({chart.unit})</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.points.map((point) => (
                    <tr key={point._id}>
                      <td>{point.label}</td>
                      <td>{point.sublabel}</td>
                      <td>{point.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <small>{chart.sourceLabel}</small>
            </article>
          </Reveal>
        )
      })}
    </section>
  )
}

export function FeaturedSpeakers() {
  const managedSpeakers = useApi("/cms/published", { category: "speaker" })
  const heading = useEditorialRecord("home-speakers-heading", {
    eyebrow:"Voices in the room",
    title:"People carrying evidence into action.",
    linkLabel:"Meet the speakers",
    linkUrl:"/speakers",
  })
  const available = managedSpeakers ?? []
  const featured = available.filter((speaker) => speaker.featured)
  const speakers = (featured.length > 0 ? featured : available)
    .slice(0, 3)
    .map((speaker) => ({
          key: speaker._id,
          name: speaker.title,
          country: speaker.country,
          role: speaker.role || speaker.summary,
          image: speaker.imageUrl,
        }))

  return (
    <section className="speaker-preview section-shell">
      <div className="section-heading compact">
        <p className="kicker">{heading.eyebrow}</p>
        <h2>{heading.title}</h2>
      </div>
      <div className="speaker-preview-grid">
        {speakers.map((speaker) => (
          <article key={speaker.key}>
            <div>
              {speaker.image ? (
                <SmartImage
                  src={speaker.image}
                  alt={speaker.name}
                  fill
                  sizes="(max-width: 720px) 100vw, 33vw"
                />
              ) : (
                <span aria-hidden="true">{speaker.name.charAt(0)}</span>
              )}
            </div>
            <p>{speaker.country}</p>
            <h3>{speaker.name}</h3>
            <span>{speaker.role}</span>
          </article>
        ))}
      </div>
      <Button
        nativeButton={false}
        variant="outline"
        render={<Link href={heading.linkUrl || "/speakers"} />}
      >
        {heading.linkLabel} <ArrowRightIcon data-icon="inline-end" />
      </Button>
    </section>
  )
}
