"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowUpRightIcon, MailIcon, MapPinIcon, MessageCircleIcon, PhoneIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useApi } from "@/lib/api"
import { useEditorialRecord } from "@/components/site/managed-editorial"
import { Separator } from "@/components/ui/separator"
import { SocialIcon } from "@/components/site/social-icon"
import { event, navItems } from "@/lib/content"

export function SiteFooter() {
  const settings = useApi("/settings")
  const callout = useEditorialRecord("global-footer-callout", {
    eyebrow:"Paris · October 2026",
    title:"One room. Many institutions. A shared commitment.",
    linkLabel:"Take part",
    linkUrl:"/engage",
  })
  const legal = useEditorialRecord("global-footer-legal", {
    title:"Human rights · dignity · equal citizenship",
  })
  if (settings === undefined || callout.isLoading || legal.isLoading) {
    return (
      <footer className="site-footer footer-loading" aria-busy="true">
        <span className="content-skeleton footer-loading-title" />
        <span className="content-skeleton footer-loading-rule" />
        <span className="content-skeleton footer-loading-copy" />
      </footer>
    )
  }
  const socialLinks = [
    ["facebook", "Facebook", settings?.facebookUrl],
    ["x", "X / Twitter", settings?.xUrl],
    ["instagram", "Instagram", settings?.instagramUrl],
    ["linkedin", "LinkedIn", settings?.linkedinUrl],
    ["youtube", "YouTube", settings?.youtubeUrl],
  ] as const

  return (
    <footer className="site-footer">
      <div className="footer-callout">
        <p className="kicker">{callout.eyebrow}</p>
        <h2>{settings?.footerTitle ?? callout.title}</h2>
        <Button nativeButton={false} render={<Link href={callout.linkUrl || "/engage"} />}>
          {callout.linkLabel} <ArrowUpRightIcon data-icon="inline-end" />
        </Button>
      </div>
      <Separator />
      <div className="footer-grid">
        <div className="footer-brand">
          <Image
            src={settings?.logoUrl || "/images/witness-flame-logo.png"}
            alt=""
            width={64}
            height={64}
            aria-hidden="true"
          />
          <div>
            <b>{settings?.shortName ?? "Paris Hindu Summit"}</b>
            {settings?.eventName && <small>{settings.eventName}</small>}
            <p>{settings?.footerBody ?? event.descriptor}</p>
          </div>
        </div>
        <div className="footer-links">
          {navItems.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          {settings?.registrationOpen !== false && <Link href="/participate">Register</Link>}
          {settings?.donationsEnabled !== false && <Link href="/donate">Donate</Link>}
        </div>
        <div className="footer-contact">
          <span><MapPinIcon /> {settings?.venue ?? event.venue}, {settings?.cityCountry ?? "Drancy, Paris"}</span>
          <a href={`mailto:${settings?.contactEmail ?? "eng.suvra@gmail.com"}`}><MailIcon /> General enquiries</a>
          {settings?.registrationEmail && <a href={`mailto:${settings.registrationEmail}`}><MailIcon /> Registration desk</a>}
          {settings?.pressEmail && <a href={`mailto:${settings.pressEmail}`}><MailIcon /> Press desk</a>}
          {settings?.phone && <a href={`tel:${settings.phone}`}><PhoneIcon /> {settings.phone}</a>}
          {settings?.whatsapp && <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}><MessageCircleIcon /> WhatsApp</a>}
          <div className="footer-socials" aria-label="Social media">
            {socialLinks.map(([network, label, href]) =>
              href ? (
                <a
                  aria-label={label}
                  href={href}
                  key={network}
                  rel="noreferrer"
                  target="_blank"
                  title={label}
                >
                  <SocialIcon network={network} />
                </a>
              ) : (
                <span
                  aria-hidden="true"
                  data-empty="true"
                  key={network}
                  title={`${label} link not configured`}
                >
                  <SocialIcon network={network} />
                </span>
              )
            )}
          </div>
        </div>
      </div>
      <div className="footer-legal">
        <span>© 2026 {settings?.shortName ?? "Paris Hindu Summit"}</span>
        <span><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · {legal.title}</span>
      </div>
    </footer>
  )
}
