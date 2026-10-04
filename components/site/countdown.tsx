"use client"

import { useEffect, useState } from "react"

import { useApi } from "@/lib/api"

export function Countdown() {
  const settings = useApi("/settings")
  const [remaining, setRemaining] = useState({ days: "00", hours: "00", minutes: "00" })

  useEffect(() => {
    const update = () => {
      const delta = Math.max(0, new Date(settings?.eventStartIso ?? "2026-10-03T09:00:00+02:00").getTime() - Date.now())
      setRemaining({
        days: String(Math.floor(delta / 86400000)).padStart(2, "0"),
        hours: String(Math.floor(delta / 3600000) % 24).padStart(2, "0"),
        minutes: String(Math.floor(delta / 60000) % 60).padStart(2, "0"),
      })
    }
    update()
    const timer = window.setInterval(update, 60000)
    return () => window.clearInterval(timer)
  }, [settings?.eventStartIso])

  return (
    <div className="countdown" aria-label="Countdown to the summit">
      {Object.entries(remaining).map(([label, value]) => (
        <span key={label}><b>{value}</b><small>{label}</small></span>
      ))}
    </div>
  )
}
