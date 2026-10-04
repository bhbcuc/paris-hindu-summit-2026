"use client"

import { CheckCircle2Icon, HeartHandshakeIcon, LandmarkIcon, Loader2Icon, LockKeyholeIcon } from "lucide-react"
import { FormEvent, useState } from "react"

import { BankAccountCards } from "@/components/site/bank-account-cards"
import { apiPost, useApi } from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEditorialRecord } from "@/components/site/managed-editorial"
import { Reveal } from "@/components/site/reveal"

export function DonationExperience() {
  const tiers = useApi("/donation-tiers")
  const settings = useApi("/settings")
  const checkout = (args: Record<string, unknown>) =>
    apiPost<{ mode: string; url: string | null; reference: string }>("/donations/checkout", args)
  const [selected, setSelected] = useState<string | null>(null)
  const [custom, setCustom] = useState("75")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ reference:string; demo:boolean } | null>(null)
  const tier = tiers?.find((item) => item._id === selected)
  const disabledCopy = useEditorialRecord("donate-disabled", {
    title:"Contribution desk coming soon",
    summary:"The organisers are preparing this pathway. No contribution can be recorded while donations are disabled in Global Site Settings.",
  })
  const checkoutCopy = useEditorialRecord("donate-checkout", {
    eyebrow:"Secure contribution desk",
    title:"Select a level to begin.",
    secondaryText:"Record your intention to contribute.",
    summary:"Online payments are not yet open. For now, this form securely records your contribution intention without taking payment.",
    body:"No payment is taken through this form.",
  })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !tier) return
    const form = new FormData(event.currentTarget)
    setBusy(true)
    try {
      const response = await checkout({
        tierId: selected,
        customAmountCents: tier.customAmount ? Math.round(Number(custom) * 100) : undefined,
        donorName: String(form.get("name")),
        donorEmail: String(form.get("email")),
      })
      if (response.mode === "stripe" && response.url) window.location.assign(response.url)
      else setResult({ reference:response.reference, demo:true })
    } finally { setBusy(false) }
  }

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
      {settings?.donationsEnabled === false ? (
        <Alert className="donation-result">
          <LockKeyholeIcon />
          <AlertTitle>{disabledCopy.title}</AlertTitle>
          <AlertDescription>{disabledCopy.summary}</AlertDescription>
        </Alert>
      ) : (
        <>
      <div className="donation-tier-grid">
        {tiers?.map((item, index) => (
          <Reveal key={item._id} delay={index * 70}>
            <button className="donation-tier" data-active={selected === item._id} onClick={() => setSelected(item._id)}>
              <span>0{index + 1}</span>
              <HeartHandshakeIcon />
              <h3>{item.label}</h3>
              <b>{item.customAmount ? "Your amount" : `€${(item.amountCents ?? 0) / 100}`}</b>
              <p>{item.description}</p>
            </button>
          </Reveal>
        ))}
      </div>
      <Reveal className="checkout-demo">
        <div>
          <p className="kicker">{checkoutCopy.eyebrow}</p>
          <h2>{selected ? checkoutCopy.secondaryText : checkoutCopy.title}</h2>
          <p>{checkoutCopy.summary}</p>
          <div className="payment-readiness"><span><CheckCircle2Icon /> Secure record</span><span><CheckCircle2Icon /> Email reference</span><span><LockKeyholeIcon /> No charge today</span></div>
        </div>
        <form onSubmit={submit}>
          {tier?.customAmount && <label><span>Amount in euros</span><Input type="number" min="5" max="100000" value={custom} onChange={(event) => setCustom(event.target.value)} /></label>}
          <label><span>Name</span><Input name="name" required /></label>
          <label><span>Email for receipt</span><Input name="email" type="email" required /></label>
          <Button disabled={!selected || busy} type="submit">{busy && <Loader2Icon className="animate-spin" />} Continue to payment</Button>
          <small>{checkoutCopy.body}</small>
        </form>
      </Reveal>
      {result && <Alert className="donation-result"><CheckCircle2Icon /><AlertTitle>Contribution intention recorded</AlertTitle><AlertDescription>Reference {result.reference}. Keep this reference for your records; no payment was taken.</AlertDescription></Alert>}
        </>
      )}
    </section>
  )
}
