"use client"

import { SmartImage } from "@/components/site/smart-image"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
} from "lucide-react"
import { useReducedMotion } from "motion/react"
import { useEffect, useMemo, useState } from "react"

type HomeBanner = {
  _id: string
  title: string
  imageUrl: string
  altText: string
}

const fallbackBanner: HomeBanner = {
  _id: "summit-banner-2026",
  title: "Paris Hindu Summit 2026",
  imageUrl: "/images/paris-hindu-summit-2026-banner.jpg",
  altText:
    "Paris Hindu Summit 2026 banner announcing the Global Forum on Religious Freedom and Hindu Rights in Bangladesh, 3–4 October 2026 in Paris, France.",
}

export function HomeBannerCarousel({ banners }: { banners: HomeBanner[] }) {
  const slides = useMemo(
    () => (banners.length > 0 ? banners : [fallbackBanner]),
    [banners]
  )
  const reduceMotion = useReducedMotion() ?? false
  const [active, setActive] = useState(0)
  const [manuallyPaused, setManuallyPaused] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const activeIndex = active % slides.length

  useEffect(() => {
    if (slides.length < 2 || manuallyPaused || interacting || reduceMotion)
      return
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % slides.length),
      7000
    )
    return () => window.clearInterval(timer)
  }, [interacting, manuallyPaused, reduceMotion, slides.length])

  const current = slides[activeIndex]
  const move = (direction: -1 | 1) => {
    setActive(
      (currentIndex) =>
        ((currentIndex % slides.length) + direction + slides.length) %
        slides.length
    )
  }

  return (
    <section
      className="home-banner-carousel"
      aria-label="Summit announcements"
      aria-roledescription="carousel"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setInteracting(false)
      }}
    >
      <div className="home-banner-shell">
        <div
          className="home-banner-artwork"
          role="group"
          aria-label={`${activeIndex + 1} of ${slides.length}: ${current.title}`}
          aria-roledescription="slide"
        >
          <SmartImage
            key={current._id}
            src={current.imageUrl}
            alt={current.altText}
            fill
            sizes="100vw"
            className="home-banner-image"
          />
        </div>
        {slides.length > 1 && (
          <div className="home-banner-controls">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Show previous banner"
            >
              <ChevronLeftIcon />
            </button>
            <span aria-live="polite">
              {String(activeIndex + 1).padStart(2, "0")}
              <i aria-hidden="true">/</i>
              {String(slides.length).padStart(2, "0")}
            </span>
            {!reduceMotion && (
              <button
                type="button"
                onClick={() =>
                  setManuallyPaused((currentPaused) => !currentPaused)
                }
                aria-label={
                  manuallyPaused
                    ? "Resume automatic banner rotation"
                    : "Pause automatic banner rotation"
                }
              >
                {manuallyPaused ? <PlayIcon /> : <PauseIcon />}
              </button>
            )}
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Show next banner"
            >
              <ChevronRightIcon />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
