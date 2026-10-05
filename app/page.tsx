"use client"

import { SmartImage } from "@/components/site/smart-image"
import Link from "next/link"
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CalendarRangeIcon,
  MapPinIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { TextReveal } from "@/components/motion/text-reveal"
import { useApi } from "@/lib/api"
import { Countdown } from "@/components/site/countdown"
import { HeroCountdown } from "@/components/site/hero-countdown"
import { HomeBannerCarousel } from "@/components/site/home-banner-carousel"
import { ManagedText, useEditorialRecord } from "@/components/site/managed-editorial"
import {
  EvidenceCharts,
  EvidenceStats,
  FeaturedSpeakers,
  HomeInfoBar,
} from "@/components/site/home-dynamic-sections"
import {
  PartnerWall,
  RegionalSection,
} from "@/components/site/institutional-sections"
import { PaymentDialog } from "@/components/site/payment-dialog"
import { event } from "@/lib/content"
import { formatEventDateRange } from "@/lib/event-format"

export default function HomePage() {
  const settings = useApi("/settings")
  const programme = useApi("/programme")
  const charts = useApi("/charts")
  const speakers = useApi("/cms/published", { category: "speaker" })
  const banners = useApi("/banners")
  const organizations = useApi("/organizations")
  const countries = useApi("/regional")
  const heroActions = useEditorialRecord("home-hero-actions", {
    title:"Reserve a place",
    secondaryText:"View programme schedule",
    linkUrl:"/participate",
    body:"/programme",
  })
  const whyIntro = useEditorialRecord("home-why-intro", {
    eyebrow:"Why Paris · Why now",
    linkLabel:"Read why the forum exists",
    linkUrl:"/about",
  })
  const programmeHeading = useEditorialRecord("home-programme-heading", {
    eyebrow:"Conference programme",
    title:"Understand. Engage. Inspire.",
    secondaryText:"Collaborate. Commit. Conclude.",
    linkLabel:"Explore both days",
    linkUrl:"/programme",
  })
  const eventDates = formatEventDateRange(
    settings?.eventStartIso,
    settings?.eventEndIso,
    settings?.timezone,
    event.dates
  )
  const registrationOpen = settings?.registrationOpen !== false
  const donationsEnabled = settings?.donationsEnabled !== false
  const contentReady =
    settings !== undefined &&
    programme !== undefined &&
    charts !== undefined &&
    speakers !== undefined &&
    banners !== undefined &&
    organizations !== undefined &&
    countries !== undefined &&
    !heroActions.isLoading &&
    !whyIntro.isLoading &&
    !programmeHeading.isLoading

  if (!contentReady) {
    return <HomePageLoading />
  }

  return (
    <>
      <section className="assembly-home-hero">
        <div className="assembly-home-copy">
          <p className="kicker">
            {settings?.heroEyebrow ?? "Global summit · October 2026"}
          </p>
          <TextReveal
            as="h1"
            text={[
              settings?.heroTitleLine1 ?? "We assemble",
              settings?.heroTitleLine2 ?? "for equality.",
            ]}
            stagger={0.055}
            blur={8}
            yOffset="28%"
          />
          <p className="hero-lead">
            {settings?.heroLead ??
              "Leaders, researchers, rights defenders, and communities building a practical agenda for the rights and future of Hindus in Bangladesh."}
          </p>
          <div className="hero-actions">
            {registrationOpen ? (
              <Button
                nativeButton={false}
                size="lg"
                render={<Link href={heroActions.linkUrl || "/participate"} />}
              >
                {heroActions.title} <ArrowRightIcon data-icon="inline-end" />
              </Button>
            ) : (
              <Button size="lg" disabled>
                Registration coming soon
              </Button>
            )}
            <Button
              nativeButton={false}
              size="lg"
              variant="outline"
              render={<Link href={heroActions.body || "/media"} />}
            >
              <CalendarRangeIcon data-icon="inline-start" /> {heroActions.secondaryText}
            </Button>
          </div>
          <div className="hero-meta">
            <span>
              <CalendarDaysIcon /> {eventDates}
            </span>
            <span>
              <MapPinIcon /> {settings?.venue ?? event.venue},{" "}
              {settings?.cityCountry ?? "Drancy, Paris"}
            </span>
          </div>
        </div>
        <div
          className="assembly-home-date"
          aria-label="Summit countdown"
        >
          <HeroCountdown />
        </div>
      </section>

      <HomeBannerCarousel banners={banners} />
      <HomeInfoBar />

      <section className="split-intro section-shell">
        <div>
          <p className="kicker">{whyIntro.eyebrow}</p>
          <h2>{settings?.whyTitle ?? "Justice delayed for half a century cannot be denied indefinitely."}</h2>
        </div>
        <div className="body-copy">
          <p>{settings?.whyBody ?? "The forum brings verified testimony, research, policy, and international cooperation into one room—and turns them into commitments that continue after Paris."}</p>
          <Button
            nativeButton={false}
            variant="link"
            render={<Link href={whyIntro.linkUrl || "/about"} />}
          >
            {whyIntro.linkLabel} <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </section>

      <section className="evidence-band">
        <div className="section-heading compact">
          <p className="kicker"><ManagedText slug="home-evidence-heading" field="eyebrow" fallback="Bangladesh · the record" /></p>
          <h2><ManagedText slug="home-evidence-heading" field="title" fallback="The Numbers That Leave the Room Silent" /></h2>
        </div>
        <EvidenceStats />
        <p className="source-note">
          <ManagedText slug="home-evidence-heading" field="body" fallback="Source: summit concept note and cited organisations. Detailed citations and methodology will accompany the evidence archive." />
        </p>
      </section>

      <EvidenceCharts />

      <section
        className="section-shell programme-preview"
        id="programme-preview"
      >
        <div className="section-heading">
          <p className="kicker">{programmeHeading.eyebrow}</p>
          <h2>
            {programmeHeading.title}
            <br />
            {programmeHeading.secondaryText}
          </h2>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={programmeHeading.linkUrl || "/programme"} />}
          >
            {programmeHeading.linkLabel} <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
        <div className="day-preview">
          {(programme?.slice(0, 2) ?? []).map((day, index) => (
            <article key={day._id}>
              <span>{day.tabLabel || `Day 0${index + 1}`}</span>
              <div>
                <h3>{day.navigationLabel}</h3>
                <p>{day.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <FeaturedSpeakers />

      <PartnerWall />

      <RegionalSection />

      <section className="countdown-section section-shell">
        <div>
          <p className="kicker"><ManagedText slug="home-countdown-heading" field="eyebrow" fallback="The room opens in" /></p>
          <h2>
            {eventDates}
            <br />
            {settings?.cityCountry ?? "Paris, France"}
          </h2>
          <p>{settings?.address ?? event.address}</p>
        </div>
        <Countdown />
      </section>

      <section className="home-support">
        <SmartImage
          src="/images/paris-night.png"
          alt="Paris at night beside the River Seine"
          fill
          sizes="100vw"
        />
        <div>
          <p className="kicker">
            {settings?.donationEyebrow ?? "Stand with the summit"}
          </p>
          <h2>
            {settings?.donationTitle ??
              "Help testimony travel further than the room."}
          </h2>
          <p>
            {settings?.donationBody ??
              "Support documentation, international participation, media work, legal advocacy, and the standing network after Paris."}
          </p>
          <PaymentDialog disabled={!donationsEnabled} />
        </div>
      </section>
    </>
  )
}

function HomePageLoading() {
  return (
    <section
      className="assembly-home-hero home-page-loading"
      aria-busy="true"
      aria-label="Loading summit content"
    >
      <div className="assembly-home-copy">
        <span className="content-skeleton content-skeleton-kicker" />
        <div className="content-skeleton-title">
          <span className="content-skeleton" />
          <span className="content-skeleton" />
        </div>
        <span className="content-skeleton content-skeleton-copy" />
        <span className="content-skeleton content-skeleton-copy short" />
        <div className="content-skeleton-actions">
          <span className="content-skeleton" />
          <span className="content-skeleton" />
        </div>
      </div>
      <div className="assembly-home-date">
        <span className="content-skeleton content-skeleton-countdown" />
      </div>
    </section>
  )
}
