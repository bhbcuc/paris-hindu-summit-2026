"use client"

import { CheckCircle2Icon, Loader2Icon, SendIcon } from "lucide-react"
import { FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { apiPost } from "@/lib/api"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useEditorialRecord } from "@/components/site/managed-editorial"

const pathways = [
  ["support", "General support"],
  ["contact", "Contact organisers"],
  ["sponsorship", "Partner or sponsor"],
  ["volunteer", "Volunteer"],
  ["media", "Media enquiry"],
] as const

export function SupportForm() {
  const submit = (args: Record<string, unknown>) =>
    apiPost<{ accepted: boolean; reference: string }>("/submissions", args)
  const [type, setType] = useState<(typeof pathways)[number][0]>("support")
  const [busy, setBusy] = useState(false)
  const [reference, setReference] = useState("")
  const [consent, setConsent] = useState(false)
  const successCopy = useEditorialRecord("support-form-success", {
    eyebrow:"Received",
    title:"Your message is now in the record.",
    summary:"The summit team can review and manage this enquiry in the secure admin inbox.",
  })
  async function send(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true)
    const form = new FormData(event.currentTarget)
    const response = await submit({
      type,
      firstName:String(form.get("firstName")),
      lastName:String(form.get("lastName")),
      email:String(form.get("email")),
      phone:String(form.get("phone")),
      organization:String(form.get("organization")),
      attendingAs:"",
      subject:String(form.get("subject")),
      message:String(form.get("message")),
      consent,
      website:String(form.get("website")),
    })
    setBusy(false)
    if (response.accepted) setReference(response.reference)
  }
  if (reference) return <div className="support-success"><CheckCircle2Icon /><p className="kicker">{successCopy.eyebrow}</p><h2>{successCopy.title}</h2><p>Reference <b>{reference}</b>. {successCopy.summary}</p><Button variant="outline" onClick={() => setReference("")}>Send another message</Button></div>
  return (
    <form className="support-form" onSubmit={send}>
      <div className="support-pathways">{pathways.map(([value,label]) => <button type="button" data-active={type === value} key={value} onClick={() => setType(value)}>{label}</button>)}</div>
      <div className="support-fields">
        <label><span>First name</span><Input name="firstName" required /></label>
        <label><span>Last name</span><Input name="lastName" /></label>
        <label><span>Email address</span><Input name="email" type="email" required /></label>
        <label><span>Phone / WhatsApp</span><Input name="phone" /></label>
        <label><span>Organisation</span><Input name="organization" /></label>
        <label><span>Subject</span><Input name="subject" /></label>
        <label className="wide"><span>How can we help?</span><Textarea name="message" required /></label>
        <input className="form-honeypot" name="website" tabIndex={-1} autoComplete="off" />
        <label className="wide consent"><Checkbox checked={consent} onCheckedChange={(value) => setConsent(Boolean(value))} /> I consent to the summit team using these details to respond to this enquiry.</label>
      </div>
      <Button size="lg" disabled={busy || !consent} type="submit">{busy ? <Loader2Icon className="animate-spin" /> : <SendIcon />} Send to the summit desk</Button>
    </form>
  )
}
