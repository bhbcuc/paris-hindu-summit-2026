"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { useQuery } from "convex/react"
import {
  ArrowDownToLineIcon,
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExpandIcon,
  ImagesIcon,
  PlayIcon,
} from "lucide-react"

import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { useEditorialRecord } from "@/components/site/managed-editorial"

function getYouTubeEmbedUrl(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    const hostname = url.hostname.replace(/^www\./, "")
    const videoId =
      hostname === "youtu.be"
        ? url.pathname.slice(1).split("/")[0]
        : url.pathname.startsWith("/shorts/")
          ? url.pathname.split("/")[2]
          : url.pathname.startsWith("/embed/")
            ? url.pathname.split("/")[2]
            : url.searchParams.get("v")
    return videoId
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`
      : null
  } catch {
    return null
  }
}

export function MediaPublications() {
  const sections = useQuery(api.media.listPublished)
  const statements = useQuery(api.statements.listPublished)
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null)
  const emptyCopy = useEditorialRecord("media-empty", {
    eyebrow:"Editorial archive",
    title:"No publications are currently available.",
    summary:"Published books, reports, research papers, and media resources will be collected here.",
  })
  const photoItems = (sections ?? []).flatMap((section) =>
    section.items.filter(
      (item) => item.mediaType === "photo" && Boolean(item.fileUrl)
    )
  )
  const activePhoto =
    activePhotoIndex === null ? null : photoItems[activePhotoIndex]

  const movePhoto = (direction: -1 | 1) => {
    setActivePhotoIndex((current) => {
      if (current === null || photoItems.length === 0) return current
      return (current + direction + photoItems.length) % photoItems.length
    })
  }
  useEffect(() => {
    if (activePhotoIndex === null || photoItems.length < 2) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
      event.preventDefault()
      const direction = event.key === "ArrowLeft" ? -1 : 1
      setActivePhotoIndex((current) => {
        if (current === null) return current
        return (current + direction + photoItems.length) % photoItems.length
      })
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activePhotoIndex, photoItems.length])

  if (sections === undefined || statements === undefined) {
    return (
      <section className="publication-library section-shell" aria-busy="true">
        <p className="kicker">Loading the public archive</p>
      </section>
    )
  }

  if (sections.length === 0 && statements.length === 0) {
    return (
      <section className="publication-library section-shell">
        <div className="publication-empty">
          <BookOpenIcon />
          <p className="kicker">{emptyCopy.eyebrow}</p>
          <h2>{emptyCopy.title}</h2>
          <p>{emptyCopy.summary}</p>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="publication-library section-shell">
        <section className="publication-section statements-section" id="statements">
          <header>
            <span>01</span>
            <div>
              <p className="kicker">Media &amp; Publication</p>
              <h2>Statements</h2>
              <p>Official and community statements, press releases, and public notices connected to the Paris Hindu Summit.</p>
            </div>
          </header>
          {statements.length > 0 ? (
            <div className="statement-list">
              {statements.map((statement) => (
                <article key={statement._id}>
                  <time dateTime={statement.releaseDate}>
                    {new Intl.DateTimeFormat("en-GB", {
                      day:"2-digit",
                      month:"short",
                      year:"numeric",
                      timeZone:"UTC",
                    }).format(new Date(`${statement.releaseDate}T00:00:00Z`))}
                  </time>
                  <div>
                    <p className="kicker">{statement.fileName.split(".").pop()?.toUpperCase() || "FILE"}</p>
                    <h3>{statement.title}</h3>
                    {statement.description && <p>{statement.description}</p>}
                  </div>
                  <Button
                    nativeButton={false}
                    variant="outline"
                    render={<a href={statement.fileUrl} target="_blank" rel="noreferrer" />}
                  >
                    Open file <ArrowDownToLineIcon data-icon="inline-end" />
                  </Button>
                </article>
              ))}
            </div>
          ) : (
            <p className="publication-section-empty">
              No statements have been published yet.
            </p>
          )}
        </section>
        {sections.map((section, sectionIndex) => (
        <section className="publication-section" id={section.slug} key={section._id}>
          <header>
            <span>{String(sectionIndex + 2).padStart(2, "0")}</span>
            <div>
              <p className="kicker">Media &amp; Publication</p>
              <h2>{section.name}</h2>
              {section.description && <p>{section.description}</p>}
            </div>
          </header>
          {section.items.length > 0 ? (
            section.items.some((item) => item.mediaType !== "document") ? (
              <div className="visual-archive">
                {section.items.some((item) => item.mediaType === "photo") && (
                  <div className="photo-gallery">
                    <div className="gallery-heading">
                      <ImagesIcon aria-hidden="true" />
                      <div>
                        <p className="kicker">Photo gallery</p>
                        <h3>Latest photographs</h3>
                      </div>
                    </div>
                    <div className="photo-gallery-grid">
                      {section.items
                        .filter(
                          (item) =>
                            item.mediaType === "photo" && Boolean(item.fileUrl)
                        )
                        .map((item) => (
                          <button
                            type="button"
                            key={item._id}
                            aria-label={`Open ${item.title} in the image viewer`}
                            onClick={() => {
                              const photoIndex = photoItems.findIndex(
                                (photo) => photo._id === item._id
                              )
                              if (photoIndex >= 0) setActivePhotoIndex(photoIndex)
                            }}
                          >
                            <span className="photo-gallery-image">
                              <Image
                                src={item.fileUrl!}
                                alt={item.title}
                                fill
                                sizes="(max-width: 720px) 100vw, 33vw"
                              />
                            </span>
                            <span className="photo-gallery-caption">
                              <strong>{item.title}</strong>
                              {item.description && <small>{item.description}</small>}
                              <ExpandIcon aria-hidden="true" />
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
                {section.items.some((item) => item.mediaType === "video") && (
                  <div className="video-gallery">
                    <div className="gallery-heading">
                      <PlayIcon aria-hidden="true" />
                      <div>
                        <p className="kicker">Video gallery</p>
                        <h3>Watch on YouTube</h3>
                      </div>
                    </div>
                    <div className="video-gallery-grid">
                      {section.items
                        .filter((item) => item.mediaType === "video")
                        .map((item) => {
                          const embedUrl = getYouTubeEmbedUrl(item.youtubeUrl)
                          if (!embedUrl) return null
                          return (
                            <article key={item._id}>
                              <div className="video-gallery-frame">
                                <iframe
                                  src={embedUrl}
                                  title={item.title}
                                  loading="lazy"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  referrerPolicy="strict-origin-when-cross-origin"
                                  allowFullScreen
                                />
                              </div>
                              <div>
                                <h4>{item.title}</h4>
                                {item.description && <p>{item.description}</p>}
                              </div>
                            </article>
                          )
                        })}
                    </div>
                  </div>
                )}
                {section.items.some((item) => item.mediaType === "document") && (
                  <div className="publication-grid">
                    {section.items
                      .filter((item) => item.mediaType === "document")
                      .map((item) => (
                        <article key={item._id}>
                          <div className="publication-cover">
                            {item.coverUrl ? (
                              <Image
                                src={item.coverUrl}
                                alt=""
                                fill
                                sizes="(max-width: 720px) 100vw, 30vw"
                              />
                            ) : (
                              <BookOpenIcon aria-hidden="true" />
                            )}
                          </div>
                          <div className="publication-copy">
                            <p className="kicker">{item.fileName}</p>
                            <h3>{item.title}</h3>
                            <p>{item.description}</p>
                            {item.fileUrl && (
                              <Button
                                nativeButton={false}
                                variant="outline"
                                render={
                                  <a
                                    href={item.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  />
                                }
                              >
                                Open file{" "}
                                <ArrowDownToLineIcon data-icon="inline-end" />
                              </Button>
                            )}
                          </div>
                        </article>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="publication-grid">
                {section.items.map((item) => (
                  <article key={item._id}>
                    <div className="publication-cover">
                      {item.coverUrl ? (
                        <Image
                          src={item.coverUrl}
                          alt=""
                          fill
                          sizes="(max-width: 720px) 100vw, 30vw"
                        />
                      ) : (
                        <BookOpenIcon aria-hidden="true" />
                      )}
                    </div>
                    <div className="publication-copy">
                      <p className="kicker">{item.fileName}</p>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      {item.fileUrl && (
                        <Button
                          nativeButton={false}
                          variant="outline"
                          render={
                            <a href={item.fileUrl} target="_blank" rel="noreferrer" />
                          }
                        >
                          Open file <ArrowDownToLineIcon data-icon="inline-end" />
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : (
            <p className="publication-section-empty">
              No publications have been released in this section yet.
            </p>
          )}
        </section>
        ))}
      </section>
      <Dialog
        open={Boolean(activePhoto)}
        onOpenChange={(open) => {
          if (!open) setActivePhotoIndex(null)
        }}
      >
        <DialogContent className="photo-lightbox">
          {activePhoto?.fileUrl && (
            <>
              <div className="photo-lightbox-stage">
                <Image
                  src={activePhoto.fileUrl}
                  alt={activePhoto.title}
                  fill
                  sizes="100vw"
                />
              </div>
              <div className="photo-lightbox-copy">
                <p className="kicker">
                  Photograph{" "}
                  {String((activePhotoIndex ?? 0) + 1).padStart(2, "0")} /{" "}
                  {String(photoItems.length).padStart(2, "0")}
                </p>
                <DialogTitle>{activePhoto.title}</DialogTitle>
                <DialogDescription>
                  {activePhoto.description || "Paris Hindu Summit visual archive"}
                </DialogDescription>
              </div>
              {photoItems.length > 1 && (
                <div className="photo-lightbox-controls">
                  <Button
                    aria-label="Previous photograph"
                    onClick={() => movePhoto(-1)}
                    size="icon"
                    variant="outline"
                  >
                    <ChevronLeftIcon />
                  </Button>
                  <Button
                    aria-label="Next photograph"
                    onClick={() => movePhoto(1)}
                    size="icon"
                    variant="outline"
                  >
                    <ChevronRightIcon />
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
