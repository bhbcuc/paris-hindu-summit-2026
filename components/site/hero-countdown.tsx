"use client"

import { useMemo } from "react"
import { RadioIcon } from "lucide-react"

import FlipClock from "@/components/8starlabs-ui/flip-clock"
import { useEditorialRecord } from "@/components/site/managed-editorial"
import { useApi } from "@/lib/api"

const FALLBACK_START = "2026-10-03T08:30:00+02:00"

function validDate(value: string | undefined) {
  const date = new Date(value ?? FALLBACK_START)
  return Number.isNaN(date.getTime()) ? new Date(FALLBACK_START) : date
}

export function HeroCountdown() {
  const settings = useApi("/settings")
  const copy = useEditorialRecord("home-hero-countdown", {
    eyebrow:"Paris opens in",
    title:"Make the time count.",
    dateLabel:"03—04 / OCT",
  })
  const targetDate = useMemo(
    () => validDate(settings?.eventStartIso),
    [settings?.eventStartIso]
  )
  const eventLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: settings?.timezone || "Europe/Paris",
      })
        .format(targetDate)
        .replace(",", " ·")
        .toUpperCase(),
    [settings?.timezone, targetDate]
  )

  return (
    <div className="hero-countdown">
      <div className="hero-countdown-topline">
        <span>
          <i aria-hidden="true" />
          Live countdown
        </span>
        <RadioIcon aria-hidden="true" />
      </div>

      <div className="hero-countdown-copy">
        <p>{copy.eyebrow}</p>
        <strong>{copy.title}</strong>
      </div>

      <div className="hero-clock-stage">
        <FlipClock
          countdown
          targetDate={targetDate}
          showDays="always"
          size="sm"
          variant="secondary"
          className="hero-flip-clock"
          aria-label={`Countdown to the summit on ${eventLabel}, ${settings?.timezone || "Europe/Paris"}`}
        />
        <div className="hero-clock-labels" aria-hidden="true">
          <span>Days</span>
          <span>Hours</span>
          <span>Minutes</span>
          <span>Seconds</span>
        </div>
      </div>

      <div className="hero-countdown-date">
        <span>{copy.dateLabel}</span>
        <span>{eventLabel}</span>
      </div>
    </div>
  )
}
