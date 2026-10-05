import type { Metadata } from "next"
import { SmartImage } from "@/components/site/smart-image"
import Link from "next/link"
import { ArrowLeftIcon, ArrowUpRightIcon, MapPinIcon } from "lucide-react"

export const metadata: Metadata = {
  title: "Honor the Victims | Paris Hindu Summit 2026",
  description: "A post-conference interfaith visit to the Drancy Memorial on 5 October 2026.",
}

const references = [
  ["Drancy Internment Camp · Mémoires en réseau", "https://memoires-en-reseau.org/en/drancy-internment-camp.html"],
  ["Drancy · United States Holocaust Memorial Museum", "https://encyclopedia.ushmm.org/tags/en/tag/drancy"],
  ["Drancy internment camp · Wikipedia", "https://en.wikipedia.org/wiki/Drancy_internment_camp"],
] as const

export default function HonorTheVictimsPage() {
  return (
    <main className="drancy-page">
      <section className="section-shell drancy-hero">
        <div className="drancy-hero-copy">
          <Link className="drancy-back" href="/programme"><ArrowLeftIcon aria-hidden="true" /> Programme</Link>
          <p className="kicker">Monday · 5 October 2026</p>
          <h1>Honor the Victims</h1>
          <p className="drancy-deck">Post-conference interfaith visit to the Drancy Memorial</p>
          <div className="drancy-location"><MapPinIcon aria-hidden="true" /><span>Drancy, Paris</span></div>
        </div>
        <figure className="drancy-image-wrap">
          <SmartImage src="/images/drancy-memorial.jpg" alt="Memorial sculpture and inscribed rail car at the Drancy internment camp memorial" width={585} height={439} priority sizes="(max-width: 900px) 100vw, 48vw" />
          <figcaption>Drancy Memorial · a place of remembrance and witness</figcaption>
        </figure>
      </section>

      <section className="section-shell drancy-story">
        <aside aria-label="Visit details">
          <p className="kicker">Interfaith pilgrimage</p>
          <h2>Remember together.</h2>
          <p>Registration for the pilgrimage will be available during the conference.</p>
        </aside>
        <article>
          <p className="drancy-lead">During the Second World War, Drancy was the site of a Nazi internment camp used to round up and deport French and other European Jews to Auschwitz and other death camps. Of approximately 70,000 people interned there between August 1941 and August 1944, only 1,542 survived. The murdered included approximately 6,000 children.</p>

          <p>Our conference is dedicated to stopping an attempt to exterminate a people. It is fitting that, as an interfaith community, we pay homage to the victims of the Shoah and stand against the hatred that continues to threaten religious communities.</p>

          <h2>The site and memorial</h2>
          <p>Built as a collective living space in the 1930s but never completed, the Cité de la Muette became a Nazi internment camp in 1941 and soon became a centre for sending Jews to extermination camps. Until 1943 it was run by French police; after the liberation of France, it was used to house French collaborationists. Seventy years after deportations began, the municipality of Drancy donated land for a memorial to the victims.</p>

          <p>Respectful of the site and its urban environment, the five-level memorial provides a panoramic view of the Cité de la Muette. Its permanent exhibition retraces the camp’s history and function, the daily lives of those interned there, and Drancy’s central role in the exclusion and deportation of the Jews of France under Nazi occupation and the Vichy government.</p>

          <h2>Monday, 5 October</h2>
          <p>We will gather at a designated location for an interfaith pilgrimage to the camp. Together we will pay our respects to the victims, confront the hatred that drove the Holocaust and that still endangers Hindus and Hinduism in Bangladesh, and stand as brothers and sisters who refuse that hatred.</p>

          <div className="drancy-registration">
            <span>Visit registration</span>
            <p>You will be able to register for the pilgrimage at the conference. The meeting point and practical details will be shared with registered participants.</p>
          </div>

          <div className="drancy-references">
            <p className="kicker">Further reading</p>
            {references.map(([label, href]) => <Link key={href} href={href} target="_blank" rel="noreferrer">{label}<ArrowUpRightIcon aria-hidden="true" /></Link>)}
          </div>
        </article>
      </section>
    </main>
  )
}
