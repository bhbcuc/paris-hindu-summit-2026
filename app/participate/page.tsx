"use client"

import { BankAccountCards } from "@/components/site/bank-account-cards"
import { useApi } from "@/lib/api"
import { ManagedText } from "@/components/site/managed-editorial"
import { ManagedPageHero } from "@/components/site/managed-page-hero"
import { RegisterForm } from "@/components/site/register-form"
import { SupportForm } from "@/components/site/support-form"
import { event } from "@/lib/content"
import { formatEventDateRange } from "@/lib/event-format"
import { MailIcon } from "lucide-react"

export default function ParticipatePage() {
  const settings = useApi("/settings")
  const registrationOpen = settings?.registrationOpen !== false
  const eventDates = formatEventDateRange(
    settings?.eventStartIso,
    settings?.eventEndIso,
    settings?.timezone,
    event.dates
  )
  return (
    <>
      <ManagedPageHero
        slug="participate"
        eyebrow="Attend and support"
        title="There is more than one way to enter the work."
        intro="Register as a delegate, volunteer, partner, sponsor, donor, or accredited member of the media."
        image="/images/paris-night.png"
      />
      <section className="participate-grid section-shell">
        <div>
          <p className="kicker"><ManagedText slug="participate-attend-heading" field="eyebrow" fallback="Attend in Paris" /></p>
          <h2>{eventDates}<br />{settings?.venue ?? event.venue}</h2>
          <p>{settings?.address ?? event.address}</p>
          <p>{settings?.languages ?? "English · French · Bengali interpretation"}</p>
        </div>
        <RegisterForm enabled={registrationOpen} />
      </section>
      <section className="registration-fee section-shell" aria-labelledby="registration-fee-title">
        <div className="registration-fee-summary">
          <p className="kicker">Complete your registration</p>
          <div className="registration-fee-mark">
            <span>{settings?.registrationFeeLabel ?? "US$250"}</span>
            <small>Required processing fee</small>
          </div>
          <h2 id="registration-fee-title">{settings?.registrationFeeTitle ?? "Registration processing fee"}</h2>
          <p>{settings?.registrationFeeBody ?? "Deposit the registration processing fee into either summit bank account. After sending the payment, email the payment slip for confirmation."}</p>
        </div>
        <div className="registration-payment-card">
          <header>
            <span>01</span>
            <div><p className="kicker">Bank transfer</p><h3>Choose a summit account</h3></div>
          </header>
          <BankAccountCards settings={settings} />
          <a className="registration-slip-action" href={`mailto:${settings?.registrationFeeEmail ?? "info@parishindusummit.org"}`}>
            <span>02</span><MailIcon aria-hidden="true" />
            <span><small>After the transfer</small><strong>Send your payment slip</strong><em>{settings?.registrationFeeEmail ?? "info@parishindusummit.org"}</em></span>
          </a>
        </div>
      </section>
      <section className="contact-section section-shell" id="contact">
        <div>
          <p className="kicker"><ManagedText slug="participate-contact-heading" field="eyebrow" fallback="Contact with us" /></p>
          <h2><ManagedText slug="participate-contact-heading" field="title" fallback="We will get back to you with answers." /></h2>
          <p><ManagedText slug="participate-contact-heading" field="summary" fallback="General enquiries · Registration · Media · Donation · Partnership" /></p>
          {settings?.contactEmail && (
            <p>
              <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
              {settings.phone && <> · <a href={`tel:${settings.phone}`}>{settings.phone}</a></>}
            </p>
          )}
        </div>
        <SupportForm />
      </section>
    </>
  )
}
