"use client"

import { LandmarkIcon, LockKeyholeIcon } from "lucide-react"

import { BankAccountCards } from "@/components/site/bank-account-cards"
import { useApi } from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useEditorialRecord } from "@/components/site/managed-editorial"
import { Reveal } from "@/components/site/reveal"

export function DonationExperience() {
  const settings = useApi("/settings")
  const disabledCopy = useEditorialRecord("donate-disabled", {
    title:"Contribution desk coming soon",
    summary:"The organisers are preparing this pathway. No contribution details are available while donations are disabled in Global Site Settings.",
  })

  return (
    <section className="donation-desk section-shell">
      <Reveal className="bank-transfer-panel">
        <div className="bank-transfer-intro">
          <LandmarkIcon aria-hidden="true" />
          <div>
            <p className="kicker">{settings?.bankTransferEyebrow ?? "Direct bank transfer"}</p>
            <h2>{settings?.bankTransferTitle ?? "Give directly, securely."}</h2>
            <p>{settings?.bankTransferBody ?? "Your generosity helps bring our community together in Paris for inspiration, dialogue, and justice. Donations can be sent directly to either summit bank account."}</p>
          </div>
        </div>
        <BankAccountCards settings={settings} />
      </Reveal>
      <Reveal className="donation-heading">
        <p className="kicker">{settings?.donationEyebrow ?? "Choose a contribution"}</p>
        <h2>{settings?.donationTitle ?? "Turn solidarity into practical capacity."}</h2>
        <p>{settings?.donationBody ?? "Support documentation, international participation, translation, media work and the continuing rights network after Paris."}</p>
      </Reveal>
      {settings?.donationsEnabled === false && (
        <Alert className="donation-result">
          <LockKeyholeIcon />
          <AlertTitle>{disabledCopy.title}</AlertTitle>
          <AlertDescription>{disabledCopy.summary}</AlertDescription>
        </Alert>
      )}
    </section>
  )
}
