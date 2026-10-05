import { SmartImage } from "@/components/site/smart-image"
import { AudioLinesIcon } from "lucide-react"

type PageHeroProps = {
  eyebrow: string
  title: string
  intro: string
  image?: string
  loading?: boolean
}

export function PageHero({ eyebrow, title, intro, image, loading = false }: PageHeroProps) {
  return (
    <section
      className={`${image ? "page-hero with-image" : "page-hero"}${loading ? " page-hero-loading" : ""}`}
      aria-busy={loading || undefined}
    >
      <div className="page-hero-inner">
        {loading ? (
          <>
            <span className="content-skeleton content-skeleton-kicker" />
            <span className="content-skeleton page-hero-skeleton-title" />
            <span className="content-skeleton page-hero-skeleton-copy" />
            <span className="content-skeleton page-hero-skeleton-copy short" />
          </>
        ) : (
          <>
            <p className="kicker">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{intro}</p>
            <AudioLinesIcon aria-hidden="true" />
          </>
        )}
      </div>
      <div className="page-hero-aside" aria-hidden="true">
        {loading ? (
          <span className="content-skeleton page-hero-skeleton-aside" />
        ) : image ? (
          <SmartImage src={image} alt="" fill priority sizes="(max-width: 720px) 100vw, 38vw" />
        ) : (
          <>
            <b>PARIS</b>
            <span>ASSEMBLY / 2026</span>
          </>
        )}
      </div>
    </section>
  )
}
