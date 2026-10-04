"use client"

import Image from "next/image"
import { ArrowUpRightIcon } from "lucide-react"

import { useEditorialRecord } from "@/components/site/managed-editorial"
import { useApi } from "@/lib/api"
import { resolveOrganizationRole } from "@/lib/organization-compat"

export function PartnerWall() {
  const liveOrganizations = useApi("/organizations")
  const organizerCopy = useEditorialRecord("main-organizer", {
    eyebrow:"Organizing organization",
    title:"Bureau of Human Rights and Justice",
    summary:"The France-based Bureau of Human Rights and Justice leads the Paris Hindu Summit 2026. Its work advances human rights, humanitarian relief, sustainable agriculture, and long-term resilience in vulnerable communities.",
    linkLabel:"Visit BHRJ",
    linkUrl:"https://www.bhrj.org/",
  })
  const managerCopy = useEditorialRecord("managing-organizer", {
    eyebrow:"Managing organization",
    title:"Interfaith Forcefield",
    summary:"The US-registered Interfaith Forcefield manages conference coordination and delivery, bringing an interfaith human-rights perspective to the summit's programme and operations.",
    linkLabel:"Visit official website",
    linkUrl:"",
  })
  const heading = useEditorialRecord("supporting-organizations-heading", {
    eyebrow:"Regional network",
    title:"Supporting Organisations",
    summary:"Our partners from India, Bangladesh, Pakistan and Nepal help extend policy impact, strengthen research, deepen community connections, improve access, and provide practical support—all in one visible and valued network.",
  })
  const organizations = liveOrganizations ?? []
  const organizingOrganization = organizations.find(
    (organization) => resolveOrganizationRole(organization) === "organizing"
  )
  const managingOrganization = organizations.find(
    (organization) => resolveOrganizationRole(organization) === "managing"
  )
  const supportingOrganizations = organizations.filter(
    (organization) => resolveOrganizationRole(organization) === "supporting"
  )
  const organizer = {
    name: organizingOrganization?.name || organizerCopy.title,
    description: organizingOrganization?.description || organizerCopy.summary,
    websiteUrl:
      organizingOrganization?.websiteUrl || organizerCopy.linkUrl || "https://www.bhrj.org/",
    logoUrl: organizingOrganization?.logoUrl ?? null,
  }
  const manager = {
    name:
      managingOrganization?.name.toLowerCase() === "forcefield human rights"
        ? managerCopy.title
        : managingOrganization?.name || managerCopy.title,
    description: managingOrganization?.description || managerCopy.summary,
    websiteUrl: managingOrganization?.websiteUrl || managerCopy.linkUrl,
    logoUrl: managingOrganization?.logoUrl ?? null,
  }

  return (
    <section className="partner-wall section-shell" id="partners">
      <div className="organization-leadership" aria-label="Summit leadership organizations">
        <OrganizationFeature
          number="01"
          label={organizerCopy.eyebrow}
          organization={organizer}
          linkLabel={organizerCopy.linkLabel || "Visit BHRJ"}
          emphasis="primary"
        />
        <OrganizationFeature
          number="02"
          label={managerCopy.eyebrow}
          organization={manager}
          linkLabel={managerCopy.linkLabel || "Visit official website"}
          emphasis="secondary"
        />
      </div>
      <div className="section-heading">
        <p className="kicker"><span>03</span> {heading.eyebrow}</p>
        <div>
          <h2>{heading.title}</h2>
          <p>{heading.summary}</p>
        </div>
      </div>
      <div className="partner-grid">
        {supportingOrganizations.map((organization) => (
          <article
            key={organization._id}
            className={`partner-card partner-${organization.tier}`}
          >
            <div className="partner-card-meta">
              <span>{organization.kind}</span>
              <small>{organization.tier}</small>
            </div>
            <div className="partner-identity">
              {organization.logoUrl && (
                <div className="partner-logo-frame">
                  <Image
                    src={organization.logoUrl}
                    alt={`${organization.name} logo`}
                    width={120}
                    height={60}
                    sizes="120px"
                  />
                </div>
              )}
              <b>{organization.name}</b>
            </div>
            <p>{organization.description}</p>
            {organization.websiteUrl && (
              <a href={organization.websiteUrl} target="_blank" rel="noreferrer">
                Visit organization <ArrowUpRightIcon aria-hidden="true" />
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

type FeaturedOrganization = {
  name: string
  description: string
  websiteUrl: string
  logoUrl: string | null
}

function OrganizationFeature({
  number,
  label,
  organization,
  linkLabel,
  emphasis,
}: {
  number: string
  label: string
  organization: FeaturedOrganization
  linkLabel: string
  emphasis: "primary" | "secondary"
}) {
  return (
    <article className="organization-feature" data-emphasis={emphasis}>
      <div className="organization-feature-heading">
        <span>{number}</span>
        <p className="kicker">{label}</p>
      </div>
      <div className="organization-feature-logo">
        {organization.logoUrl ? (
          <Image
            src={organization.logoUrl}
            alt={`${organization.name} logo`}
            width={260}
            height={160}
            sizes="(max-width: 720px) 180px, 260px"
          />
        ) : (
          <b aria-hidden="true">
            {organization.name
              .split(/\s+/)
              .map((word) => word[0])
              .join("")
              .slice(0, 4)}
          </b>
        )}
      </div>
      <div className="organization-feature-copy">
        <h2>{organization.name}</h2>
        <p>{organization.description}</p>
        {organization.websiteUrl && (
          <a href={organization.websiteUrl} target="_blank" rel="noreferrer">
            {linkLabel} <ArrowUpRightIcon aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  )
}

export function RegionalSection({ showIntro = true }: { showIntro?: boolean }) {
  const liveCountries = useApi("/regional")
  const countries = liveCountries ?? []
  const heading = useEditorialRecord("regional-heading", {
    eyebrow:"Beyond Bangladesh · regional forum",
    title:"Beyond Bangladesh: a regional crisis",
    summary:"Bangladesh is where this forum began, but South Asian Hindu minorities face the same story of shrinking numbers and unanswered violence well beyond its borders. Pakistan, Afghanistan, Nepal, and Myanmar are four of the starkest examples—and four reasons this forum exists for more than one country's diaspora.",
  })

  return (
    <section className="regional-section" id="beyond-bangladesh">
      {showIntro && (
        <div className="regional-intro section-shell">
          <p className="kicker">{heading.eyebrow}</p>
          <h2>{heading.title}</h2>
          <p>{heading.summary}</p>
        </div>
      )}
      <div className="regional-grid">
        {countries.map((country, index) => (
          <article key={country._id}>
            <div className="regional-card-top">
              <span>{country.code}</span>
              <small>
                {String(index + 1).padStart(2, "0")} /{" "}
                {String(countries.length).padStart(2, "0")}
              </small>
            </div>
            <p className="kicker">{country.eyebrow}</p>
            <h3>{country.name}</h3>
            <h4>{country.headline}</h4>
            <p>{country.summary}</p>
            <details>
              <summary>
                Read the regional focus <ArrowUpRightIcon />
              </summary>
              <p>{country.detail}</p>
            </details>
          </article>
        ))}
      </div>
    </section>
  )
}
