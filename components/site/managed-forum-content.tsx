"use client"

import Image from "next/image"
import { useState } from "react"
import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  ChevronDownIcon,
  ChurchIcon,
  HouseIcon,
  LogOutIcon,
  ShieldAlertIcon,
  TriangleAlertIcon,
  UserRoundIcon,
} from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useEditorialRecord } from "@/components/site/managed-editorial"
import { ManagedPageHero } from "@/components/site/managed-page-hero"
import { ContentListSkeleton } from "@/components/site/content-list-skeleton"
import { Reveal } from "@/components/site/reveal"
import { useApi } from "@/lib/api"

type DocumentCategory =
  | "agenda"
  | "resolution"
  | "strategy"
  | "partnership"

export function ManagedOverview() {
  const entries = useApi("/cms/published", { category: "overview" })
  if (!entries?.length) return null
  return (
    <section className="managed-overview section-shell">
      {entries.map((entry, index) => (
        <Reveal key={entry._id} delay={index * 80}>
          <article>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <p className="kicker">{entry.eyebrow}</p>
              <h2>{entry.title}</h2>
              <p>{entry.summary}</p>
              <p>{entry.body}</p>
              {entry.secondaryText && <aside>{entry.secondaryText}</aside>}
            </div>
          </article>
        </Reveal>
      ))}
    </section>
  )
}

export function PresentMoment() {
  const entries = useApi("/cms/published", { category: "presentMoment" })
  const heading = useEditorialRecord("about-present-moment-heading", {
    eyebrow:"The present moment",
    title:"Fifty-six years after independence, structural and everyday pressures still shape daily life for Bangladesh's Hindu community.",
  })
  const icons = [
    HouseIcon,
    ChurchIcon,
    ShieldAlertIcon,
    BriefcaseBusinessIcon,
    TriangleAlertIcon,
    LogOutIcon,
  ]

  return (
    <section className="present-moment">
      <header className="section-shell">
        <p className="kicker">{heading.eyebrow}</p>
        <p>{heading.title}</p>
      </header>
      <div className="present-moment-grid">
        {entries?.map((entry, index) => {
          const Icon = icons[index % icons.length]
          return (
            <article key={entry._id}>
              <Icon aria-hidden="true" />
              <h2>{entry.title}</h2>
              <p>{entry.summary || entry.body}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function PersonPortrait({
  image,
  name,
  sizes,
  className = "committee-portrait",
}: {
  image?: string | null
  name: string
  sizes: string
  className?: string
}) {
  return (
    <div className={`${className} person-portrait`}>
      {image ? (
        <Image src={image} alt={name} fill sizes={sizes} />
      ) : (
        <span className="person-placeholder" aria-label={`Photo of ${name} not yet available`}>
          <UserRoundIcon aria-hidden="true" />
        </span>
      )}
    </div>
  )
}

function ExpandableBio({ bio }: { bio?: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const cleanBio = bio?.trim() ?? ""
  if (!cleanBio) return null

  const previewText =
    cleanBio.length > 260
      ? cleanBio.slice(0, 260).replace(/\s+\S*$/, "")
      : cleanBio
  const remainingBio = cleanBio.slice(previewText.length).trimStart()

  if (!remainingBio) {
    return <p className="person-bio-copy">{cleanBio}</p>
  }

  return (
    <div className="person-bio">
      <p className="person-bio-copy">
        {isExpanded ? cleanBio : `${previewText}…`}
      </p>
      {!isExpanded && (
        <button
          type="button"
          className="person-bio-expand"
          onClick={() => setIsExpanded(true)}
        >
          Read more <ChevronDownIcon aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export function ManagedCommittee() {
  const managedTeam = useApi("/cms/published", { category: "team" })
  const team = managedTeam ?? []
  const teamHeading = useEditorialRecord("committee-team-heading", {
    eyebrow:"Organising Committee",
    title:"Working across borders, disciplines, and responsibilities.",
  })

  return (
    <section className="committee-roster section-shell" id="organising-team">
      <div className="section-heading compact">
        <p className="kicker">{teamHeading.eyebrow}</p>
        <h2>{teamHeading.title}</h2>
      </div>
      <div className="roster-grid managed-roster">
        {team.map((person, index) => (
          <article key={person._id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <PersonPortrait
              image={"imageUrl" in person ? person.imageUrl : null}
              name={person.title}
              sizes="(max-width: 720px) 70vw, 24vw"
            />
            <div>
              <h3>{person.title}</h3>
              {person.role && (
                <Badge className="person-designation">{person.role}</Badge>
              )}
              <ExpandableBio bio={person.body} />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function ManagedAdvisoryBoard() {
  const advisors = useApi("/cms/published", { category: "advisory" })
  const advisoryHeading = useEditorialRecord("committee-advisory-heading", {
    eyebrow:"Strategic guidance",
    title:"Advisory Board",
    summary:"International outreach, partnerships, fundraising, and regional coordination carried by named advisors.",
  })

  return (
    <section className="committee-roster section-shell" id="advisory-board">
      <div className="section-heading compact">
        <p className="kicker">{advisoryHeading.eyebrow}</p>
        <h2>{advisoryHeading.title}</h2>
        <p>{advisoryHeading.summary}</p>
      </div>
      <div className="roster-grid managed-roster">
        {advisors?.map((person, index) => (
          <article key={person._id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <PersonPortrait
              image={person.imageUrl}
              name={person.title}
              sizes="(max-width: 720px) 70vw, 24vw"
            />
            <div>
              <h3>{person.title}</h3>
              {person.role && (
                <Badge className="person-designation">{person.role}</Badge>
              )}
              <ExpandableBio bio={person.body} />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function ManagedSpeakers() {
  const managed = useApi("/cms/published", { category: "speaker" })
  const speakers = (managed ?? []).map((speaker) => ({
          key: speaker._id,
          name: speaker.title,
          intro: speaker.role || speaker.summary,
          country: speaker.country,
          bio: speaker.body,
          image: speaker.imageUrl,
        }))

  return (
    <section className="speaker-list section-shell">
      {speakers.map((speaker, index) => (
        <article key={speaker.key}>
          <span className="speaker-number">
            {String(index + 1).padStart(2, "0")}
          </span>
          <PersonPortrait
            image={speaker.image}
            name={speaker.name}
            sizes="(max-width: 720px) 70vw, 28vw"
            className="speaker-portrait"
          />
          <div>
            <p className="kicker">{speaker.country || "Paris 2026"}</p>
            <h2>{speaker.name}</h2>
            {speaker.intro && <h3>{speaker.intro}</h3>}
            <ExpandableBio bio={speaker.bio} />
          </div>
        </article>
      ))}
    </section>
  )
}

export function CmsDocumentPage({
  category,
  eyebrow,
  title,
  intro,
}: {
  category:DocumentCategory
  eyebrow:string
  title:string
  intro:string
}) {
  const entries = useApi("/cms/published", { category })
  const records = entries ?? []
  const strategyVision = category === "strategy"
    ? records.find((entry) => entry.parentSlug === "vision")
    : undefined
  const strategyTimeline = category === "strategy"
    ? records.filter((entry) => entry.parentSlug === "timeline")
    : []
  const mainRecords = category === "strategy"
    ? records.filter((entry) => !["vision", "timeline"].includes(entry.parentSlug))
    : records
  const strategyTimelineHeading = useEditorialRecord("strategy-timeline-heading", {
    eyebrow:"Five-year delivery",
    title:"Implementation Timeline",
  })

  if (entries === undefined) {
    return (
      <>
        <ManagedPageHero
          slug={category === "partnership" ? "partnership-framework" : category}
          eyebrow={eyebrow}
          title={title}
          intro={intro}
        />
        <section className="document-accordion section-shell">
          <ContentListSkeleton cards={4} />
        </section>
      </>
    )
  }

  return (
    <>
      <ManagedPageHero
        slug={category === "partnership" ? "partnership-framework" : category}
        eyebrow={eyebrow}
        title={title}
        intro={intro}
      />
      {strategyVision && (
        <section className="strategy-vision section-shell">
          <p className="kicker">{strategyVision.eyebrow || "Vision"}</p>
          <h2>{strategyVision.title}</h2>
          <p>{strategyVision.body || strategyVision.summary}</p>
        </section>
      )}
      <section className="document-accordion section-shell">
        {mainRecords.map((entry, index) => (
          <Reveal key={entry._id} delay={(index % 4) * 45}>
            <details id={entry.slug} data-document-category={category}>
              <summary>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <p className="kicker">{entry.eyebrow}</p>
                  <h2>{entry.title}</h2>
                </div>
                <ChevronDownIcon aria-hidden="true" />
              </summary>
              <div className="document-accordion-body">
                {category !== "strategy" &&
                  entry.summary &&
                  entry.summary !== entry.body && (
                  <p className="document-summary">{entry.summary}</p>
                )}
                {entry.body && (
                  <div className="document-labelled-copy">
                    <small>
                      {category === "agenda"
                        ? "Discussion points"
                        : category === "strategy"
                          ? "Key actions"
                          : category === "partnership"
                            ? "Area of cooperation"
                            : "Resolution details"}
                    </small>
                    <p>{entry.body}</p>
                  </div>
                )}
                {entry.secondaryText && (
                  <aside>
                    <small>Expected outcomes</small>
                    <p>{entry.secondaryText}</p>
                  </aside>
                )}
                {entry.linkUrl && (
                  <Button
                    nativeButton={false}
                    variant="link"
                    render={<Link href={entry.linkUrl} />}
                  >
                    {entry.linkLabel || "Read more"}{" "}
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>
                )}
              </div>
            </details>
          </Reveal>
        ))}
      </section>
      {category === "strategy" && strategyTimeline.length > 0 && (
        <section className="strategy-timeline section-shell">
          <header>
            <p className="kicker">{strategyTimelineHeading.eyebrow}</p>
            <h2>{strategyTimelineHeading.title}</h2>
          </header>
          <div>
            {strategyTimeline.map((entry) => (
              <article key={entry._id}>
                <span>{entry.dateLabel}</span>
                <h3>{entry.title}</h3>
                <p>{entry.body || entry.summary}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
