import { SmartImage } from "@/components/site/smart-image"
import { BookOpenIcon, LandmarkIcon, ShieldAlertIcon } from "lucide-react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ManagedText } from "@/components/site/managed-editorial"
import { ManagedPageHero } from "@/components/site/managed-page-hero"
import { charter, evidence } from "@/lib/content"

export default function ContextPage() {
  return (
    <>
      <ManagedPageHero
        slug="context"
        eyebrow="Understanding the context"
        title="History, evidence, and the right to belong."
        intro="A concise public record of demographic decline, constitutional contradiction, documented violence, property loss, and the continuing struggle for equal citizenship."
        image="/images/archive-table.png"
      />
      <section className="evidence-band light">
        <div className="evidence-grid">{evidence.map((item, index) => {
          const slug = ["home-evidence-1951", "home-evidence-2022", "home-evidence-2024-25", "home-evidence-2026"][index]
          return <article key={item.value}><b><ManagedText slug={slug} field="title" fallback={item.value} /></b><p><ManagedText slug={slug} field="summary" fallback={item.label} /></p></article>
        })}</div>
        <p className="source-note"><ManagedText slug="context-evidence-source" field="body" fallback="Source: summit concept note and cited organisations. Detailed citations and methodology will accompany the evidence archive." /></p>
      </section>
      <section className="context-chapters section-shell">
        {[
          [BookOpenIcon, "context-chapter-partition", "1947–1971", "From partition to independence", "Partition, outward migration, dispossession, and the changing place of religious minorities in East Pakistan shaped the conditions inherited by independent Bangladesh."],
          [LandmarkIcon, "context-chapter-constitution", "1972–present", "Constitutional contradiction", "The 1972 Constitution enshrined secularism. Later amendments removed and then restored it while retaining Islam as the state religion—an unresolved tension between equality on paper and lived citizenship."],
          [ShieldAlertIcon, "context-chapter-violence", "Documented record", "Violence and protection failures", "Minority organisations and international monitors document killings, arson, looting, attacks on homes and places of worship, sexual violence, land grabbing, intimidation, and blasphemy-related persecution."],
        ].map(([Icon, slug, label, title, text]) => {
          const ChapterIcon = Icon as typeof BookOpenIcon
          return <article key={String(slug)}><ChapterIcon /><p className="kicker"><ManagedText slug={String(slug)} field="eyebrow" fallback={String(label)} /></p><h2><ManagedText slug={String(slug)} field="title" fallback={String(title)} /></h2><p><ManagedText slug={String(slug)} field="summary" fallback={String(text)} /></p></article>
        })}
      </section>
      <section className="section-shell charter-section">
        <div className="section-heading">
          <p className="kicker"><ManagedText slug="context-charter-heading" field="eyebrow" fallback="The seven-point charter" /></p>
          <h2><ManagedText slug="context-charter-heading" field="title" fallback="Goodwill is not a substitute for law." /></h2>
          <p><ManagedText slug="context-charter-heading" field="summary" fallback="Longstanding demands from minority-rights organisations call for enforceable protection, investigation, restitution, and equal access to public life." /></p>
        </div>
        <Accordion defaultValue={["item-0"]} className="charter-accordion">
          {charter.map((item, index) => (
            <AccordionItem key={item} value={`item-${index}`}>
              <AccordionTrigger><span>{String(index + 1).padStart(2, "0")}</span><ManagedText slug={`context-charter-${index + 1}`} field="title" fallback={item} /></AccordionTrigger>
              <AccordionContent><ManagedText slug={`context-charter-${index + 1}`} field="body" fallback="Paris will examine the legal, institutional, documentation, and international-coordination steps required to move this demand from advocacy into enforceable practice." /></AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
      <section className="image-band">
        <SmartImage src="/images/river-delta.png" alt="Aerial view of Bangladesh river systems and settlements" fill sizes="100vw" />
        <div><p className="kicker"><ManagedText slug="context-image-caption" field="eyebrow" fallback="The living record" /></p><h2><ManagedText slug="context-image-caption" field="title" fallback="Behind every data point is a family deciding whether it can stay." /></h2></div>
      </section>
    </>
  )
}
