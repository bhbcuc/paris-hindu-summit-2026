"use client"

import { ContentListSkeleton } from "@/components/site/content-list-skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useApi } from "@/lib/api"

export function ProgrammeTabs() {
  const days = useApi("/programme")
  if (days === undefined) return <ContentListSkeleton cards={2} />
  if (days.length === 0) return <p>No programme days are currently published.</p>
  return (
    <Tabs defaultValue={days[0].slug} className="programme-tabs">
      <TabsList variant="line" className="programme-tab-list">
        {days.map((day) => <TabsTrigger key={day._id} value={day.slug}><span>{day.tabLabel}</span>{day.navigationLabel} · {day.summary}</TabsTrigger>)}
      </TabsList>
      {days.map((day) => <TabsContent key={day._id} value={day.slug}>
        <header className="programme-day-heading"><p className="programme-day-date">{day.dateLabel}</p><h2>{day.summary}</h2><span>{day.sessions.length} programme {day.sessions.length === 1 ? "moment" : "moments"}</span></header>
        <div className="schedule-list">
          {day.sessions.map((item) => {
            const details = item.description.split("\n").map((line) => line.trim()).filter(Boolean)
            return (
            <article key={item._id}>
              <time>{item.startTime}<small>{item.endTime}</small></time>
              <div className="schedule-session"><p className="kicker">{[item.tag,item.location].filter(Boolean).join(" · ")}</p><h3>{item.title}</h3>{details.length > 1 ? <ul>{details.map((detail) => <li key={detail}>{detail}</li>)}</ul> : <p>{details[0]}</p>}{item.speakers && <small>{item.speakers}</small>}</div>
            </article>
          )})}
        </div>
      </TabsContent>)}
    </Tabs>
  )
}
