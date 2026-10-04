"use client"

import { CheckIcon, Loader2Icon, SendIcon } from "lucide-react"
import { FormEvent, useState } from "react"
import { toast } from "@/components/motion/animated-toast-provider"

import { Button } from "@/components/ui/button"
import { apiPost } from "@/lib/api"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useEditorialRecord } from "@/components/site/managed-editorial"

const attendanceOptions = ["Survivor", "Delegate", "Audience", "Researcher-Speaker"] as const

export function RegisterForm({ enabled = true }: { enabled?: boolean }) {
  const submit = (args: Record<string, unknown>) =>
    apiPost<{ accepted: boolean; reference: string }>("/submissions", args)
  const [reference, setReference] = useState("")
  const [attendance, setAttendance] = useState<(typeof attendanceOptions)[number]>("Delegate")
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const closedCopy = useEditorialRecord("participate-registration-closed", {
    eyebrow:"Registration is currently closed",
    title:"The delegate desk will open soon.",
    summary:"Event information remains available while the organisers prepare the next registration window.",
  })
  const successCopy = useEditorialRecord("participate-registration-success", {
    eyebrow:"Registration received",
    title:"Your place in the room starts here.",
    summary:"The registration team can now review this record in the secure admin inbox and follow up with confirmation and practical information.",
  })
  const formCopy = useEditorialRecord("participate-registration-form", {
    title:"Delegate details",
    summary:"Both programme days, printed materials, listed meals, and the closing gala dinner are included. Attendance remains subject to organiser confirmation.",
    body:"I consent to the organisers using these details to administer my registration and contact me about the summit.",
  })

  if (!enabled) {
    return (
      <div className="form-success" role="status">
        <p className="kicker">{closedCopy.eyebrow}</p>
        <h2>{closedCopy.title}</h2>
        <p>{closedCopy.summary}</p>
      </div>
    )
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const form = new FormData(event.currentTarget)
    const result = await submit({
      type: "registration",
      firstName: String(form.get("firstName")),
      lastName: String(form.get("lastName")),
      email: String(form.get("email")),
      phone: String(form.get("phone")),
      organization: String(form.get("organization")),
      attendingAs: attendance,
      subject: "Delegate registration",
      message: String(form.get("message")),
      consent,
      website: String(form.get("website")),
    })
    setBusy(false)
    if (!result.accepted) return toast.error("Check the required fields and consent.")
    setReference(result.reference)
    toast.success("Registration interest recorded.")
  }

  if (reference) {
    return (
      <div className="form-success" role="status">
        <CheckIcon />
        <p className="kicker">{successCopy.eyebrow} · {reference}</p>
        <h2>{successCopy.title}</h2>
        <p>{successCopy.summary}</p>
        <Button variant="outline" onClick={() => setReference("")}>Register another delegate</Button>
      </div>
    )
  }

  return (
    <form className="registration-form" onSubmit={register}>
      <FieldSet>
        <FieldLegend>{formCopy.title}</FieldLegend>
        <FieldDescription>{formCopy.summary}</FieldDescription>
        <FieldGroup>
          <div className="form-grid">
            <Field><FieldLabel htmlFor="first-name">First name</FieldLabel><Input id="first-name" name="firstName" required /></Field>
            <Field><FieldLabel htmlFor="last-name">Last name</FieldLabel><Input id="last-name" name="lastName" required /></Field>
            <Field><FieldLabel htmlFor="registration-email">Email</FieldLabel><Input id="registration-email" name="email" required type="email" /></Field>
            <Field><FieldLabel htmlFor="registration-phone">WhatsApp contact</FieldLabel><Input id="registration-phone" name="phone" required type="tel" /></Field>
            <Field><FieldLabel htmlFor="organisation">Organisation</FieldLabel><Input id="organisation" name="organization" placeholder="Optional" /></Field>
            <Field>
              <FieldLabel>Attending as</FieldLabel>
              <Select value={attendance} onValueChange={(value) => value && setAttendance(value as typeof attendance)}>
                <SelectTrigger className="form-select"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup>{attendanceOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            </Field>
          </div>
          <Field><FieldLabel htmlFor="message">Access, dietary, visa, or participation notes</FieldLabel><Textarea id="message" name="message" /></Field>
          <input className="form-honeypot" name="website" tabIndex={-1} autoComplete="off" />
          <Field orientation="horizontal">
            <Checkbox id="registration-consent" checked={consent} onCheckedChange={(value) => setConsent(Boolean(value))} />
            <FieldLabel htmlFor="registration-consent">{formCopy.body}</FieldLabel>
          </Field>
          <Button type="submit" size="lg" disabled={busy || !consent}>
            {busy ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
            Send registration interest
          </Button>
        </FieldGroup>
      </FieldSet>
    </form>
  )
}
