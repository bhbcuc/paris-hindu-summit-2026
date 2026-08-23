"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, @next/next/no-img-element */

import { useMutation, useQuery } from "convex/react"
import {
  ArchiveIcon,
  BarChart3Icon,
  BlocksIcon,
  BookOpenIcon,
  BookUserIcon,
  CheckCircle2Icon,
  CircleDollarSignIcon,
  FileTextIcon,
  Globe2Icon,
  EyeIcon,
  EyeOffIcon,
  ExternalLinkIcon,
  HandshakeIcon,
  HomeIcon,
  ImageIcon,
  InboxIcon,
  LayoutDashboardIcon,
  CalendarRangeIcon,
  Loader2Icon,
  LogOutIcon,
  MailIcon,
  MegaphoneIcon,
  MonitorIcon,
  PaperclipIcon,
  RefreshCwIcon,
  SaveIcon,
  SearchIcon,
  SendIcon,
  Settings2Icon,
  ShieldCheckIcon,
  SmartphoneIcon,
  SparklesIcon,
  TabletIcon,
  UserCogIcon,
  Users2Icon,
  XIcon,
} from "lucide-react"
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "@/components/motion/animated-toast-provider"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { authClient } from "@/lib/auth-client"
import { ensureLeadershipRecords, isLegacyOrganizationRoleError, omitOrganizationRole, resolveOrganizationRole } from "@/lib/organization-compat"
import { prepareAdminRecordSave } from "@/lib/admin-record"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AdminFileUpload } from "@/components/admin/admin-file-upload"
import { ThemeToggle } from "@/components/site/theme-toggle"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

const websitePages = [
  ["home", "Home", "/", HomeIcon],
  ["about", "About", "/about", FileTextIcon],
  ["programme", "Programme", "/programme", CalendarRangeIcon],
  ["forumPackages", "Forum Packages", "/forum-packages/accommodation", BlocksIcon],
  ["speakers", "Speakers", "/speakers", Users2Icon],
  ["organizingTeam", "Organising Committee", "/committee", UserCogIcon],
  ["advisoryBoard", "Advisory Board", "/advisory-board", UserCogIcon],
  ["agenda", "Proposed Agenda", "/agenda", FileTextIcon],
  ["resolution", "Paris Resolution", "/resolution", FileTextIcon],
  ["strategy", "5-Year Strategic Plan", "/strategy", BarChart3Icon],
  ["partnership", "Partnership Framework", "/partnership-framework", HandshakeIcon],
  ["regional", "Regional", "/regional", Globe2Icon],
  ["partners", "Organizations", "/partners", HandshakeIcon],
  ["media", "Media & Publication", "/media", BookOpenIcon],
  ["engage", "Attend and Support", "/engage", SparklesIcon],
  ["faq", "FAQ", "/faq", InboxIcon],
  ["evidence", "Evidence charts", "/#evidence-charts", BarChart3Icon],
  ["pageCopy", "Page titles & intros", "/about", FileTextIcon],
  ["sectionCopy", "Editorial sections", "/", FileTextIcon],
  ["content", "Other content", "/privacy", FileTextIcon],
  ["settings", "Site settings", "/", Settings2Icon],
] as const

const operationPanels = [
  ["dashboard", "Overview", LayoutDashboardIcon],
  ["mail", "Mail desk", MailIcon],
  ["inbox", "Forms inbox", InboxIcon],
  ["donations", "Donations", CircleDollarSignIcon],
  ["assets", "Media library", ImageIcon],
  ["team", "Team access", UserCogIcon],
  ["audit", "Activity", ArchiveIcon],
] as const

type StudioPage = (typeof websitePages)[number][0]
type OperationPanel = (typeof operationPanels)[number][0]
type DevicePreview = "desktop" | "tablet" | "mobile"
type SubmissionStatus = "new" | "in_progress" | "resolved" | "archived"

const categories = [
  "overview",
  "agenda",
  "resolution",
  "strategy",
  "partnership",
  "why",
  "challenge",
  "presentMoment",
  "engage",
  "speaker",
  "team",
  "advisory",
  "programme",
  "forumPackage",
  "media",
  "faq",
  "legal",
  "pageCopy",
  "sectionCopy",
] as const

const blankContent = {
  slug: "",
  title: "",
  eyebrow: "",
  summary: "",
  body: "",
  secondaryText: "",
  country: "",
  role: "",
  email: "",
  phone: "",
  linkLabel: "",
  linkUrl: "",
  dateLabel: "",
  timeLabel: "",
  parentSlug: "",
  order: 50,
  status: "draft" as const,
  featured: false,
}
type ContentDraft = Omit<typeof blankContent, "status"> & {
  status: "draft" | "published"
}

function AuthGate() {
  const access = useQuery(api.admin.getAccessState)
  const bootstrap = useMutation(api.admin.bootstrapFirstAdmin)
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [passwordError, setPasswordError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get("email"))
    const password = String(data.get("password"))
    const confirmation = String(data.get("confirmPassword"))
    const name = String(data.get("name") || "Paris Hindu Summit editor")
    if (mode === "signup" && password !== confirmation) {
      setPasswordError("The passwords do not match. Check both entries and try again.")
      toast.error("The passwords do not match.")
      return
    }
    setPasswordError("")
    setBusy(true)
    try {
      const result =
        mode === "signin"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name })
      if (result.error) toast.error(result.error.message)
      else toast.success(mode === "signin" ? "Signed in." : "Account created.")
    } catch {
      toast.error("Authentication could not be completed. Check your details and try again.")
    } finally {
      setBusy(false)
    }
  }

  if (access === undefined) {
    return <FullScreenStatus label="Checking secure access…" />
  }

  if (!access.signedIn) {
    return (
      <main className="admin-auth">
        <section className="admin-auth-note">
          <div className="admin-seal"><ShieldCheckIcon /></div>
          <p className="admin-kicker">Protected workspace · 2026</p>
          <h1>The public record starts behind this door.</h1>
          <p>
            Edit the summit, receive enquiries, publish regional briefings, and
            monitor donations from one controlled workspace.
          </p>
          <div className="auth-pulse"><span /> Better Auth + Convex</div>
        </section>
        <section className="admin-auth-card">
          <p className="admin-kicker">{mode === "signin" ? "Welcome back" : "Initial setup"}</p>
          <h2>{mode === "signin" ? "Sign in" : "Create editor account"}</h2>
          <form onSubmit={submit}>
            {mode === "signup" && <Field name="name" label="Your name" required />}
            <Field name="email" type="email" label="Email address" required />
            <PasswordField
              id="admin-password"
              name="password"
              label="Password"
              visible={showPassword}
              onToggle={() => setShowPassword((visible) => !visible)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              describedBy={passwordError ? "password-match-error" : undefined}
            />
            {mode === "signup" && (
              <PasswordField
                id="admin-confirm-password"
                name="confirmPassword"
                label="Retype password"
                visible={showConfirmation}
                onToggle={() => setShowConfirmation((visible) => !visible)}
                autoComplete="new-password"
                describedBy={passwordError ? "password-match-error" : undefined}
              />
            )}
            {passwordError && (
              <p className="admin-field-error" id="password-match-error" role="alert">
                {passwordError}
              </p>
            )}
            <Button disabled={busy} type="submit">
              {busy && <Loader2Icon className="animate-spin" />}
              {mode === "signin" ? "Enter control room" : "Create account"}
            </Button>
          </form>
          {access.bootstrapAvailable && (
            <button className="admin-text-button" onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin")
              setShowPassword(false)
              setShowConfirmation(false)
              setPasswordError("")
            }}>
              {mode === "signin" ? "Need the initial administrator account?" : "Already have an account? Sign in"}
            </button>
          )}
          <p className="auth-note">
            {access.bootstrapAvailable
              ? "Initial account creation is available until the first administrator is established."
              : "Public account creation is closed. An administrator must create every additional team account."}
          </p>
        </section>
      </main>
    )
  }

  if (!access.admin) {
    return (
      <main className="admin-auth">
        <section className="admin-auth-note">
          <div className="admin-seal"><ShieldCheckIcon /></div>
          <p className="admin-kicker">Identity confirmed</p>
          <h1>{access.bootstrapAvailable ? "Claim the first administrator seat." : "This account is waiting for access."}</h1>
          <p>
            {access.bootstrapAvailable
              ? "The first verified account can establish the protected editorial workspace."
              : "Ask an existing administrator to add this account as an editor."}
          </p>
        </section>
        <section className="admin-auth-card">
          {access.bootstrapAvailable ? (
            <Button onClick={async () => { await bootstrap(); toast.success("Administrator workspace created.") }}>
              <ShieldCheckIcon /> Become administrator
            </Button>
          ) : (
            <Badge variant="outline">Access pending</Badge>
          )}
          <Button variant="outline" onClick={() => authClient.signOut()}>
            <LogOutIcon /> Sign out
          </Button>
        </section>
      </main>
    )
  }

  return <Workspace admin={access.admin} />
}

type AdminRole = "administrator" | "editor" | "mail_manager"

function Workspace({ admin }: { admin: { name: string; email: string; role: AdminRole } }) {
  const mailOnly = admin.role === "mail_manager"
  const [page, setPage] = useState<StudioPage>("home")
  const [operation, setOperation] = useState<OperationPanel | null>(mailOnly ? "mail" : null)
  const pageTitle = websitePages.find(([id]) => id === page)?.[1] ?? "Home"
  const operationTitle = operationPanels.find(([id]) => id === operation)?.[1]
  return (
    <div className="admin-shell">
      <aside className="admin-rail">
        <div className="admin-wordmark">
          <span>PA</span>
          <div><b>Page studio</b><small>Paris · 2026</small></div>
        </div>
        <nav className="admin-primary-nav" aria-label="Admin workspace">
          {!mailOnly && <p>Website</p>}
          {!mailOnly && websitePages.map(([id, label, , Icon]) => (
            <button key={id} data-active={!operation && page === id} onClick={() => { setPage(id); setOperation(null) }}>
              <Icon /><span>{label}</span>
            </button>
          ))}
          <p>Operations</p>
          {operationPanels.filter(([id]) => !mailOnly || id === "mail" || id === "inbox").map(([id, label, Icon]) => (
            <button key={id} data-active={operation === id} onClick={() => setOperation(id)}>
              <Icon /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="admin-profile">
          <b>{admin.name}</b><small>{admin.role}</small>
          <button onClick={() => authClient.signOut()}><LogOutIcon /> Sign out</button>
        </div>
      </aside>
      <main className="admin-stage">
        {operation ? (
          <>
            <header className="admin-topbar">
              <div>
                <p className="admin-kicker">Operations</p>
                <h1>{operationTitle}</h1>
              </div>
              {!mailOnly && <button onClick={() => setOperation(null)}><HomeIcon /> Return to {pageTitle}</button>}
            </header>
            <div className="admin-operation-stage">
              {operation === "dashboard" && <Dashboard />}
              {operation === "mail" && <MailDeskPanel />}
              {operation === "team" && <TeamAccessPanel canManage={admin.role === "administrator"} />}
              {operation === "inbox" && <InboxPanel />}
              {operation === "donations" && <DonationsPanel />}
              {operation === "assets" && <AssetsPanel />}
              {operation === "audit" && <AuditPanel />}
            </div>
          </>
        ) : (
          <PageStudio page={page} />
        )}
      </main>
    </div>
  )
}

function PageStudio({ page }: { page:StudioPage }) {
  const selectedPage = websitePages.find(([id]) => id === page) ?? websitePages[0]
  const [, label, path] = selectedPage
  const [device, setDevice] = useState<DevicePreview>("desktop")
  const [reloadKey, setReloadKey] = useState(0)
  const [previewReady, setPreviewReady] = useState(false)
  const [publishSignal, setPublishSignal] = useState(0)
  const [canvasWidth, setCanvasWidth] = useState(900)
  const canvasRef = useRef<HTMLElement | null>(null)
  const canPublishPage = page === "home" || page === "settings"
  const previewWidth = device === "desktop" ? 1440 : device === "tablet" ? 834 : 390
  const previewHeight = device === "desktop" ? 900 : device === "tablet" ? 1112 : 844
  const previewScale = Math.min(1, Math.max(0.28, (canvasWidth - 72) / previewWidth))
  useEffect(() => {
    const element = canvasRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setCanvasWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="page-studio">
      <header className="studio-topbar">
        <div className="studio-page-title">
          <span>Editing</span>
          <strong>{label}</strong>
          <small><i data-ready={previewReady} /> {previewReady ? "Live preview ready" : "Loading preview…"}</small>
        </div>
        <div className="studio-device-switcher" aria-label="Preview size">
          {([
            ["desktop", "Desktop", MonitorIcon],
            ["tablet", "Tablet", TabletIcon],
            ["mobile", "Mobile", SmartphoneIcon],
          ] as const).map(([id, text, Icon]) => (
            <button key={id} aria-pressed={device === id} onClick={() => setDevice(id)}>
              <Icon /><span>{text}</span>
            </button>
          ))}
        </div>
        <div className="studio-actions">
          <button aria-label="Refresh preview" onClick={() => { setPreviewReady(false); setReloadKey((value) => value + 1) }}><RefreshCwIcon /></button>
          <a href={path} target="_blank" rel="noreferrer">Open live site <ExternalLinkIcon /></a>
          <Button onClick={() => {
            if (canPublishPage) setPublishSignal((value) => value + 1)
            else {
              document.querySelector(".studio-inspector")?.scrollTo({ top:0, behavior:"smooth" })
              toast.info("Save the selected section in the inspector to publish it.")
            }
          }}><SaveIcon /> Publish changes</Button>
        </div>
      </header>
      <div className="studio-workspace">
        <section ref={canvasRef} className="studio-canvas" aria-label={`${label} page preview`}>
          <div className="studio-canvas-ruler">
            <span>{device}</span>
            <b>{device === "desktop" ? "1440" : device === "tablet" ? "834" : "390"} px</b>
          </div>
          <div className="studio-preview-stage" style={{ height:previewHeight * previewScale }}>
            <div
              className="studio-preview-shell"
              data-device={device}
              style={{ width:previewWidth, height:previewHeight, transform:`scale(${previewScale})` }}
            >
              <div className="studio-selection-frame" aria-hidden="true"><span>{page === "home" ? "Hero" : label}</span></div>
              <iframe
                key={reloadKey}
                src={path}
                title={`${label} live website preview`}
                onLoad={() => setPreviewReady(true)}
              />
            </div>
          </div>
        </section>
        <aside className="studio-inspector">
          <StudioInspector page={page} publishSignal={publishSignal} onSaved={() => {
            setReloadKey((value) => value + 1)
            setPreviewReady(false)
          }} />
        </aside>
      </div>
    </div>
  )
}

function StudioInspector({ page, publishSignal, onSaved }: { page:StudioPage; publishSignal:number; onSaved:()=>void }) {
  if (page === "home") return <><SettingsPanel compact focus="home" publishSignal={publishSignal} onSaved={onSaved} /><HomeBannersEditor onSaved={onSaved} /><EvidenceStatsEditor onSaved={onSaved} /></>
  if (page === "settings") return <SettingsPanel compact publishSignal={publishSignal} onSaved={onSaved} />
  if (page === "about") return <AboutEditor />
  if (page === "programme") return <ProgrammeAdmin />
  if (page === "forumPackages") return <ForumPackagesAdmin />
  if (page === "speakers") return <PeopleEditor mode="speaker" />
  if (page === "organizingTeam") return <PeopleEditor mode="team" />
  if (page === "advisoryBoard") return <PeopleEditor mode="advisory" />
  if (page === "agenda") return <StructuredDocumentPanel category="agenda" />
  if (page === "resolution") return <StructuredDocumentPanel category="resolution" />
  if (page === "strategy") return <StructuredDocumentPanel category="strategy" />
  if (page === "partnership") return <StructuredDocumentPanel category="partnership" />
  if (page === "regional") return <RegionalPanel />
  if (page === "partners") return <PartnersPanel />
  if (page === "media") return <MediaPublicationPanel />
  if (page === "engage") return <ContentPanel compact initialCategory="engage" />
  if (page === "faq") return <ContentPanel compact initialCategory="faq" />
  if (page === "evidence") return <ChartsAdmin />
  if (page === "pageCopy") return <PageCopyEditor />
  if (page === "sectionCopy") return <EditorialCopyEditor />
  if (page === "content") return <ContentPanel compact initialCategory="legal" />
  return <ContentPanel compact initialCategory="resolution" />
}

type HomeBannerDraft = {
  title: string
  imageStorageId?: Id<"_storage">
  altText: string
  order: number
  status: "draft" | "published"
}

function HomeBannersEditor({ onSaved }: { onSaved: () => void }) {
  const rows = useQuery(api.banners.listForAdmin)
  const assets = useQuery(api.assets.list)
  const save = useMutation(api.banners.save)
  const remove = useMutation(api.banners.remove)
  const generateUploadUrl = useMutation(api.assets.generateUploadUrl)
  const register = useMutation(api.assets.register)
  const [selected, setSelected] = useState<string>("new")
  const [uploading, setUploading] = useState(false)
  const [draft, setDraft] = useState<HomeBannerDraft>({
    title: "",
    altText: "",
    order: 10,
    status: "published",
  })
  const existing = rows?.find((row) => row._id === selected)
  const imageAssets = assets?.filter((asset) => asset.mimeType.startsWith("image/"))
  const selectedAsset = imageAssets?.find(
    (asset) => asset.storageId === draft.imageStorageId
  )

  useEffect(() => {
    if (existing) {
      setDraft({
        title: existing.title,
        imageStorageId: existing.imageStorageId,
        altText: existing.altText,
        order: existing.order,
        status: existing.status,
      })
      return
    }
    const nextOrder =
      (rows?.reduce((highest, row) => Math.max(highest, row.order), 0) ?? 0) + 10
    setDraft({
      title: "",
      altText: "",
      order: nextOrder,
      status: "published",
    })
  }, [existing, rows])

  return (
    <section className="admin-panel" data-compact="true">
      <PanelTitle
        eyebrow="Homepage banners"
        title="Campaign artwork carousel"
        copy="Upload any number of wide banners, choose their order, and publish only the artwork that should rotate on the Home page."
      />
      <AdminRecordSelect
        label="Banner to edit"
        value={selected}
        createLabel="+ Add a banner"
        records={
          rows?.map((row) => ({
            value: row._id,
            label: `${row.title} · ${row.status}`,
          })) ?? []
        }
        onChange={setSelected}
      />
      <div className="admin-form-grid">
        <Field
          label="Internal banner name"
          value={draft.title}
          onValueChange={(value) => setDraft({ ...draft, title: value })}
        />
        <Field
          label="Image description for screen readers"
          multiline
          value={draft.altText}
          onValueChange={(value) => setDraft({ ...draft, altText: value })}
        />
        <Field
          label="Display order"
          type="number"
          value={String(draft.order)}
          onValueChange={(value) =>
            setDraft({ ...draft, order: Number(value) })
          }
        />
        <label className="admin-field">
          <span>Publication status</span>
          <select
            value={draft.status}
            onChange={(event) =>
              setDraft({
                ...draft,
                status: event.target.value as "draft" | "published",
              })
            }
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </label>
        <div className="admin-asset-picker admin-banner-picker">
          <label className="admin-field">
            <span>Banner artwork</span>
            <select
              value={draft.imageStorageId ?? ""}
              onChange={(event) => {
                const storageId = (event.target.value || undefined) as
                  | Id<"_storage">
                  | undefined
                const asset = imageAssets?.find(
                  (item) => item.storageId === storageId
                )
                setDraft({
                  ...draft,
                  imageStorageId: storageId,
                  altText: draft.altText || asset?.altText || "",
                })
              }}
            >
              <option value="">Choose managed artwork</option>
              {imageAssets?.map((asset) => (
                <option key={asset._id} value={asset.storageId}>
                  {asset.fileName}
                </option>
              ))}
            </select>
          </label>
          <div className="admin-banner-preview">
            {selectedAsset?.url ? (
              <img src={selectedAsset.url} alt={draft.altText || selectedAsset.altText} />
            ) : (
              <div>
                <ImageIcon />
                <span>No banner selected</span>
              </div>
            )}
          </div>
          <AdminFileUpload
            accept="image/jpeg,image/png,image/webp,image/avif"
            title="Upload banner artwork"
            description="Wide JPEG, PNG, WebP or AVIF · at least 1200 × 400 px · maximum 20 MB"
            disabled={uploading}
            onUpload={async (file) => {
              const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/avif",
              ]
              if (!allowedTypes.includes(file.type)) {
                throw new Error("Choose a JPEG, PNG, WebP, or AVIF banner.")
              }
              const bitmap = await createImageBitmap(file)
              if (bitmap.width < 1200 || bitmap.height < 400) {
                bitmap.close()
                throw new Error("Banner artwork must be at least 1200 × 400 pixels.")
              }
              bitmap.close()
              setUploading(true)
              try {
                const storageId = await uploadAdminAsset({
                  file,
                  category: "media",
                  uploadUrl: generateUploadUrl,
                  register,
                })
                const plainName = file.name.replace(/\.[^.]+$/, "").trim()
                setDraft((current) => ({
                  ...current,
                  imageStorageId: storageId,
                  title: current.title || plainName,
                  altText:
                    current.altText ||
                    `${plainName || "Paris Hindu Summit"} promotional banner`,
                }))
                toast.success("Banner uploaded and selected. Save it to publish.")
              } finally {
                setUploading(false)
              }
            }}
          />
        </div>
      </div>
      <div className="admin-editor-actions">
        <Button
          onClick={async () => {
            if (!draft.imageStorageId) {
              toast.error("Choose or upload banner artwork first.")
              return
            }
            try {
              await save({
                ...(existing ? { id: existing._id } : {}),
                title: draft.title,
                imageStorageId: draft.imageStorageId,
                altText: draft.altText,
                order: draft.order,
                status: draft.status,
              })
              toast.success(
                draft.status === "published"
                  ? "Homepage banner published."
                  : "Banner saved as a draft."
              )
              setSelected("new")
              onSaved()
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "The banner could not be saved."
              )
            }
          }}
        >
          <SaveIcon /> Save banner
        </Button>
        {existing && (
          <ConfirmDelete
            label={existing.title}
            onConfirm={async () => {
              await remove({ id: existing._id })
              setSelected("new")
              onSaved()
            }}
          />
        )}
      </div>
    </section>
  )
}

function EvidenceStatsEditor({ onSaved }: { onSaved:()=>void }) {
  const entries = useQuery(api.cms.listForAdmin, { category: "sectionCopy" })
  const save = useMutation(api.cms.save)
  const remove = useMutation(api.cms.remove)
  const stats = entries?.filter(
    (entry) =>
      entry.slug.startsWith("home-evidence-") &&
      entry.slug !== "home-evidence-heading"
  )
  const [selected, setSelected] = useState<string>("new")
  const [draft, setDraft] = useState<ContentDraft>({
    ...blankContent,
    parentSlug: "home",
    status: "published",
  })
  const existing = stats?.find((entry) => entry._id === selected)

  useEffect(() => {
    if (existing) {
      const {
        _id,
        category: _category,
        imageStorageId: _image,
        imageUrl: _url,
        ...fields
      } = existing
      void _id
      void _category
      void _image
      void _url
      setDraft(fields)
    } else {
      setDraft({
        ...blankContent,
        parentSlug: "home",
        status: "published",
        order: (stats?.length ?? 0) + 11,
      })
    }
  }, [existing, selected, stats?.length])

  return (
    <section className="admin-panel" data-compact="true">
      <PanelTitle
        eyebrow="Homepage evidence"
        title="Editable number cards"
        copy="Add, reorder, publish, or remove any number of cards in “The Numbers That Leave the Room Silent.”"
      />
      <AdminRecordSelect
        label="Card to edit"
        value={selected}
        createLabel="+ Add an evidence card"
        records={
          stats?.map((entry) => ({
            value: entry._id,
            label: `${entry.title} · ${entry.summary}`,
          })) ?? []
        }
        onChange={setSelected}
      />
      <div className="admin-form-grid">
        <Field
          label="Number or statistic"
          value={draft.title}
          onValueChange={(value) => setDraft({ ...draft, title: value })}
        />
        <Field
          label="Explanation"
          multiline
          value={draft.summary}
          onValueChange={(value) => setDraft({ ...draft, summary: value })}
        />
        <Field
          label="Display order"
          type="number"
          value={String(draft.order)}
          onValueChange={(value) =>
            setDraft({ ...draft, order: Number(value) })
          }
        />
        <label className="admin-field">
          <span>Publication status</span>
          <select
            value={draft.status}
            onChange={(event) =>
              setDraft({
                ...draft,
                status: event.target.value as "draft" | "published",
              })
            }
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
      </div>
      <div className="admin-editor-actions">
        <Button
          onClick={async () => {
            if (!draft.title.trim()) {
              toast.error("Add a number or statistic before saving.")
              return
            }
            const slug =
              existing?.slug ||
              `home-evidence-stat-${Date.now().toString(36)}`
            await save({
              ...(existing ? { id: existing._id } : {}),
              ...draft,
              category: "sectionCopy",
              slug,
              parentSlug: "home",
            })
            toast.success("Homepage evidence card published.")
            setSelected("new")
            onSaved()
          }}
        >
          <SaveIcon /> Save evidence card
        </Button>
        {existing && (
          <ConfirmDelete
            label={existing.title}
            onConfirm={async () => {
              await remove({ id: existing._id })
              setSelected("new")
              onSaved()
            }}
          />
        )}
      </div>
    </section>
  )
}

function TeamAccessPanel({ canManage }: { canManage:boolean }) {
  const members = useQuery(api.admin.listTeamMembers)
  const provision = useMutation(api.admin.provisionTeamMember)
  const changeRole = useMutation(api.admin.changeAdminRole)
  const setStatus = useMutation(api.admin.setTeamMemberStatus)
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [passwordError, setPasswordError] = useState("")

  async function createMember(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const password = String(data.get("password"))
    const confirmation = String(data.get("confirmPassword"))
    if (password !== confirmation) {
      setPasswordError("The passwords do not match.")
      return
    }
    setPasswordError("")
    setBusy(true)
    try {
      await provision({
        name:String(data.get("name")),
        email:String(data.get("email")),
        password,
        role:String(data.get("role")) as AdminRole,
      })
      form.reset()
      setShowPassword(false)
      setShowConfirmation(false)
      toast.success("Team account created. Share the credentials securely.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The team account could not be created.")
    } finally {
      setBusy(false)
    }
  }

  if (!members) return <PanelLoading />
  return (
    <section className="admin-panel">
      <PanelTitle
        eyebrow="Invitation-only access"
        title="Every account begins here."
        copy="Public sign-up is disabled. Administrators create named accounts, choose the role, and can suspend access immediately."
      />
      {canManage && (
        <form className="team-access-form" onSubmit={createMember}>
          <fieldset className="admin-fieldset">
            <legend>Create a team account</legend>
            <div className="admin-form-grid">
              <Field name="name" label="Full name" required />
              <Field name="email" type="email" label="Email address" required />
              <label className="admin-field">
                <span>Access role</span>
                <select name="role" defaultValue="editor">
                  <option value="editor">Editor</option>
                  <option value="mail_manager">Mail & forms only</option>
                  <option value="administrator">Administrator</option>
                </select>
              </label>
              <div className="team-access-guidance">
                Editors manage content. Mail & forms accounts only handle correspondence. Administrators control everything.
              </div>
              <PasswordField
                id="team-password"
                name="password"
                label="Initial password"
                visible={showPassword}
                onToggle={() => setShowPassword((visible) => !visible)}
                autoComplete="new-password"
                describedBy={passwordError ? "team-password-error" : undefined}
              />
              <PasswordField
                id="team-confirm-password"
                name="confirmPassword"
                label="Retype initial password"
                visible={showConfirmation}
                onToggle={() => setShowConfirmation((visible) => !visible)}
                autoComplete="new-password"
                describedBy={passwordError ? "team-password-error" : undefined}
              />
            </div>
            {passwordError && <p className="admin-field-error" id="team-password-error" role="alert">{passwordError}</p>}
            <Button disabled={busy} type="submit">
              {busy ? <Loader2Icon className="animate-spin" /> : <UserCogIcon />}
              Create authorised account
            </Button>
          </fieldset>
        </form>
      )}
      {!canManage && <p className="team-access-guidance">Only an administrator can create accounts or change access. Editors can review the authorised team below.</p>}
      <div className="team-access-list">
        {members.map((member) => (
          <article key={member._id} data-status={member.status}>
            <div>
              <Badge variant={member.status === "active" ? "default" : "outline"}>{member.status}</Badge>
              <h3>{member.name}</h3>
              <p>{member.email}</p>
            </div>
            <label>
              <span>Role</span>
              <select
                value={member.role}
                disabled={!canManage}
                onChange={async (event) => {
                  try {
                    await changeRole({ id:member._id, role:event.target.value as AdminRole })
                    toast.success("Team role updated.")
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Role could not be updated.")
                  }
                }}
              >
                <option value="editor">Editor</option>
                <option value="mail_manager">Mail & forms only</option>
                <option value="administrator">Administrator</option>
              </select>
            </label>
            {canManage && (
              <Button
                variant={member.status === "active" ? "outline" : "default"}
                onClick={async () => {
                  try {
                    await setStatus({ id:member._id, status:member.status === "active" ? "suspended" : "active" })
                    toast.success(member.status === "active" ? "Account suspended." : "Account activated.")
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Account access could not be changed.")
                  }
                }}
              >
                {member.status === "active" ? "Suspend access" : "Restore access"}
              </Button>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

function Dashboard() {
  const data = useQuery(api.admin.getDashboard)
  if (!data) return <PanelLoading />
  const stats = [
    ["Content records", data.content, BlocksIcon],
    ["Form submissions", data.submissions, InboxIcon],
    ["Donation records", data.donations, CircleDollarSignIcon],
    ["Managed assets", data.assets, ImageIcon],
  ] as const
  return (
    <section className="admin-panel">
      <div className="admin-status-line"><span /> Systems connected · public site reads live Convex data</div>
      <div className="admin-stat-grid">
        {stats.map(([label, value, Icon], index) => (
          <article key={label}><Icon /><span>0{index + 1}</span><b>{value}</b><p>{label}</p></article>
        ))}
      </div>
      <PanelTitle eyebrow="Latest intake" title="Recent form submissions" />
      <div className="admin-list">
        {data.recentSubmissions.length === 0 && <EmptyCopy text="No submissions yet. The public support and contact forms are ready." />}
        {data.recentSubmissions.map((item) => (
          <div key={item._id}><Badge variant="outline">{item.type}</Badge><b>{item.name}</b><span>{item.email}</span><small>{item.status}</small></div>
        ))}
      </div>
    </section>
  )
}

function SettingsPanel({ compact = false, focus, publishSignal = 0, onSaved }: { compact?:boolean; focus?:"home"; publishSignal?:number; onSaved?:()=>void }) {
  const settings = useQuery(api.settings.get)
  const assets = useQuery(api.assets.list)
  const save = useMutation(api.settings.save)
  const generateUploadUrl = useMutation(api.assets.generateUploadUrl)
  const register = useMutation(api.assets.register)
  const [draft, setDraft] = useState<Record<string, string | boolean | Id<"_storage"> | undefined> | null>(null)
  const [assetBusy, setAssetBusy] = useState<"logoStorageId" | "faviconStorageId" | null>(null)
  const lastPublishSignal = useRef(0)
  useEffect(() => {
    if (!settings) return
    const { logoUrl: _logoUrl, faviconUrl: _faviconUrl, ...editable } = settings
    void _logoUrl
    void _faviconUrl
    setDraft(editable)
  }, [settings])
  const allGroups = [
    ["Identity & dates", ["eventName", "shortName", "theme", "eventStartIso", "eventEndIso", "timezone"]],
    ["Venue & scale", ["venue", "address", "cityCountry", "format", "delegateInfo", "languages"]],
    ["Contact desk", ["contactEmail", "registrationEmail", "pressEmail", "phone", "whatsapp"]],
    ["Social links", ["facebookUrl", "xUrl", "instagramUrl", "linkedinUrl", "youtubeUrl"]],
    ["Hero", ["heroEyebrow", "heroTitleLine1", "heroTitleLine2", "heroLead"]],
    ["Why this summit", ["whyTitle", "whyBody"]],
    ["Donation invitation", ["donationEyebrow", "donationTitle", "donationBody"]],
    ["Donation bank transfer", ["bankTransferEyebrow", "bankTransferTitle", "bankTransferBody"]],
    ["France bank account", ["bankAccountLabel", "bankName", "bankAccountName", "bankIban", "bankBic"]],
    ["United States bank account", ["usBankAccountLabel", "usBankName", "usBankAccountName", "usBankRoutingNumber", "usBankAccountNumber", "usBankSwift"]],
    ["Registration processing fee", ["registrationFeeLabel", "registrationFeeTitle", "registrationFeeBody", "registrationFeeEmail"]],
    ["Forum packages", ["forumPackagesMenuLabel", "accommodationPackageLabel", "accommodationPackageTitle", "accommodationPackageIntro", "sponsorshipPackageLabel", "sponsorshipPackageTitle", "sponsorshipPackageIntro"]],
    ["Footer", ["footerTitle", "footerBody"]],
    ["Announcement", ["announcement"]],
  ] as const
  const groups = focus === "home"
    ? allGroups.filter(([title]) => ["Hero", "Why this summit", "Donation invitation", "Footer", "Announcement"].includes(title))
    : allGroups
  const publish = useCallback(async () => {
    if (!draft) return
    try {
      await save(draft as Parameters<typeof save>[0])
      toast.success("Page changes published.")
      onSaved?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Changes could not be published.")
    }
  }, [draft, onSaved, save])
  useEffect(() => {
    if (publishSignal > lastPublishSignal.current) {
      lastPublishSignal.current = publishSignal
      void publish()
    }
  }, [publish, publishSignal])
  if (!draft) return <PanelLoading />
  const imageAssets = assets?.filter((asset) => asset.mimeType.startsWith("image/"))
  return (
    <section className="admin-panel" data-compact={compact}>
      <PanelTitle
        eyebrow={focus === "home" ? "Page inspector" : "Global controls"}
        title={focus === "home" ? "Home sections" : "Site-wide details"}
        copy={focus === "home" ? "Edit the words visitors see on the Home page, then publish and watch the preview refresh." : "Identity, dates, contact details, availability and shared footer content."}
      />
      <div className="admin-switches">
        {["announcementEnabled", "registrationOpen", "donationsEnabled"].map((key) => (
          <label key={key}><Switch checked={Boolean(draft[key])} onCheckedChange={(value) => setDraft({ ...draft, [key]: value })} /><span>{humanize(key)}</span></label>
        ))}
      </div>
      {!focus && (
        <fieldset className="admin-fieldset">
          <legend>Logo &amp; browser icon</legend>
          <div className="admin-form-grid">
            {([
              ["logoStorageId", "Website logo", "Upload website logo"],
              ["faviconStorageId", "Browser favicon", "Upload browser favicon"],
            ] as const).map(([key, label, uploadLabel]) => {
              const selected = imageAssets?.find(
                (asset) => asset.storageId === draft[key]
              )
              return (
                <div className="admin-asset-picker" key={key}>
                  <label className="admin-field">
                    <span>{label}</span>
                    <select
                      value={String(draft[key] ?? "")}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          [key]: event.target.value
                            ? (event.target.value as Id<"_storage">)
                            : undefined,
                        })
                      }
                    >
                      <option value="">Use the built-in summit mark</option>
                      {imageAssets?.map((asset) => (
                        <option key={asset._id} value={asset.storageId}>
                          {asset.fileName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="admin-asset-preview">
                    {selected?.url ? (
                      <img src={selected.url} alt={selected.altText} />
                    ) : (
                      <div>
                        <ImageIcon />
                        <span>Built-in mark</span>
                      </div>
                    )}
                    <AdminFileUpload
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      title={uploadLabel}
                      description="JPEG, PNG, WebP or AVIF · maximum 20 MB"
                      disabled={assetBusy !== null}
                      onUpload={async (file) => {
                        setAssetBusy(key)
                        try {
                          const storageId = await uploadAdminAsset({
                            file,
                            category: "logo",
                            uploadUrl: generateUploadUrl,
                            register,
                          })
                          setDraft((current) =>
                            current ? { ...current, [key]: storageId } : current
                          )
                          toast.success(
                            `${label} uploaded and selected. Publish site settings to apply it.`
                          )
                        } finally {
                          setAssetBusy(null)
                        }
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </fieldset>
      )}
      {groups.map(([title, keys]) => (
        <fieldset className="admin-fieldset" key={title}>
          <legend>{title}</legend>
          <div className="admin-form-grid">
            {keys.map((key) => (
              <Field key={key} label={humanize(key)} value={String(draft[key] ?? "")} multiline={/Body|Lead|announcement/i.test(key)} onValueChange={(value) => setDraft({ ...draft, [key]: value })} />
            ))}
          </div>
        </fieldset>
      ))}
      <Button className="admin-save" onClick={publish}>
        <SaveIcon /> Publish {focus === "home" ? "Home page" : "site settings"}
      </Button>
    </section>
  )
}

type StructuredCategory = "agenda" | "resolution" | "strategy" | "partnership"

function AboutEditor() {
  const [category, setCategory] = useState<"overview" | "presentMoment">("overview")
  const entries = useQuery(api.cms.listForAdmin, { category })
  const save = useMutation(api.cms.save)
  const remove = useMutation(api.cms.remove)
  const [selected, setSelected] = useState<string>("new")
  const [draft, setDraft] = useState<ContentDraft>({ ...blankContent })
  const existing = entries?.find((entry) => entry._id === selected)
  useEffect(() => { setSelected("new") }, [category])
  useEffect(() => {
    if (existing) {
      const { _id, category: _category, imageStorageId: _image, imageUrl: _url, ...fields } = existing
      void _id; void _category; void _image; void _url
      setDraft(fields)
    } else {
      setDraft({ ...blankContent })
    }
  }, [category, existing, selected])
  const update = (key:keyof ContentDraft, value:string | number) =>
    setDraft((current) => ({ ...current, [key]:value }))
  const label = category === "overview" ? "About sections" : "Present moment cards"

  return (
    <section className="admin-panel" data-compact="true">
      <PanelTitle
        eyebrow="About page"
        title={label}
        copy={category === "overview"
          ? "Edit the meaningful headings and copy on the About page."
          : "Edit the six public-interest cards in The present moment."}
      />
      <label className="admin-field admin-record-select">
        <span>About area</span>
        <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
          <option value="overview">About sections</option>
          <option value="presentMoment">Present moment</option>
        </select>
      </label>
      <AdminRecordSelect
        label="Section to edit"
        value={selected}
        createLabel="+ Create a new section"
        records={entries?.map((entry) => ({ value:entry._id, label:entry.title })) ?? []}
        onChange={setSelected}
      />
      <div className="admin-form-grid">
        {category === "overview" && (
          <Field label="Section label" value={draft.eyebrow} onValueChange={(value) => update("eyebrow", value)} />
        )}
        <Field label={category === "overview" ? "Heading" : "Card heading"} value={draft.title} onValueChange={(value) => update("title", value)} />
        <Field label={category === "overview" ? "Introduction" : "Card text"} multiline value={draft.summary} onValueChange={(value) => update("summary", value)} />
        {category === "overview" && (
          <Field label="Detailed copy" multiline value={draft.body} onValueChange={(value) => update("body", value)} />
        )}
        <Field label="Display order" type="number" value={String(draft.order)} onValueChange={(value) => update("order", Number(value))} />
        <label className="admin-field">
          <span>Publication status</span>
          <select value={draft.status} onChange={(event) => setDraft({ ...draft, status:event.target.value as "draft" | "published" })}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
      </div>
      <div className="admin-editor-actions">
        <Button onClick={async () => {
          const slug = draft.slug || draft.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
          if (!slug || !draft.title.trim()) {
            toast.error("Add a heading before saving.")
            return
          }
          try {
            await save({
              ...(existing ? { id:existing._id } : {}),
              category,
              ...draft,
              slug,
              body:category === "presentMoment" ? (draft.body || draft.summary) : draft.body,
              featured:false,
            })
            toast.success(`${label} updated.`)
            setSelected("new")
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "The section could not be saved.")
          }
        }}><SaveIcon /> Save</Button>
        {existing && <ConfirmDelete label={existing.title} onConfirm={async () => { await remove({ id:existing._id }); setSelected("new") }} />}
      </div>
    </section>
  )
}

function PageCopyEditor() {
  const entries = useQuery(api.cms.listForAdmin, { category:"pageCopy" })
  const save = useMutation(api.cms.save)
  const [selected, setSelected] = useState<string>("new")
  const [draft, setDraft] = useState<ContentDraft>({
    ...blankContent,
    status:"published",
  })
  const existing = entries?.find((entry) => entry._id === selected)
  useEffect(() => {
    if (existing) {
      const {
        _id,
        category: _category,
        imageStorageId: _image,
        imageUrl: _url,
        ...fields
      } = existing
      void _id
      void _category
      void _image
      void _url
      setDraft(fields)
    } else {
      setDraft({ ...blankContent, status:"published" })
    }
  }, [existing, selected])
  const update = (key:keyof ContentDraft, value:string | number) =>
    setDraft((current) => ({ ...current, [key]:value }))

  return (
    <section className="admin-panel" data-compact="true">
      <PanelTitle
        eyebrow="Shared page copy"
        title="Page titles & introductions"
        copy="Choose a public page, edit its hero label, title and introduction, then publish."
      />
      <AdminRecordSelect
        label="Page to edit"
        value={selected}
        createLabel="+ Add another page"
        records={entries?.map((entry) => ({
          value:entry._id,
          label:`${entry.linkUrl || "/"} · ${entry.title}`,
        })) ?? []}
        onChange={setSelected}
      />
      <div className="admin-form-grid">
        <Field label="Page route" value={draft.linkUrl} placeholder="/page" onValueChange={(value) => update("linkUrl", value)} />
        <Field label="Small label above title" value={draft.eyebrow} onValueChange={(value) => update("eyebrow", value)} />
        <Field label="Page title" value={draft.title} onValueChange={(value) => update("title", value)} />
        <Field label="Page introduction" multiline value={draft.summary} onValueChange={(value) => update("summary", value)} />
        <Field label="Display order" type="number" value={String(draft.order)} onValueChange={(value) => update("order", Number(value))} />
        <label className="admin-field">
          <span>Publication status</span>
          <select value={draft.status} onChange={(event) => setDraft({ ...draft, status:event.target.value as "draft" | "published" })}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
      </div>
      <Button className="admin-save" onClick={async () => {
        const slug =
          draft.slug ||
          draft.linkUrl
            .replace(/^\/|\/$/g, "")
            .replace(/[^a-z0-9]+/gi, "-")
            .toLowerCase() ||
          draft.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
        if (!slug || !draft.title.trim() || !draft.linkUrl.startsWith("/")) {
          toast.error("Add a page route beginning with / and a page title.")
          return
        }
        try {
          await save({
            ...(existing ? { id:existing._id } : {}),
            category:"pageCopy",
            ...draft,
            slug,
            body:"",
            featured:false,
          })
          toast.success("Page title and introduction published.")
          setSelected("new")
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Page copy could not be saved.")
        }
      }}><SaveIcon /> Save page copy</Button>
    </section>
  )
}

const editorialPageLabels:Record<string, string> = {
  global:"Shared header & footer",
  home:"Home",
  about:"About",
  context:"Context",
  speakers:"Speakers",
  committee:"Organising Committee",
  "advisory-board":"Advisory Board",
  participate:"Participate",
  engage:"Attend and Support",
  faq:"FAQ",
  partners:"Partners",
  regional:"Regional",
  donate:"Donate",
  media:"Media & Publication",
  resolution:"Resolution",
  strategy:"Strategic Plan",
  legal:"Legal",
}

function EditorialCopyEditor() {
  const entries = useQuery(api.cms.listForAdmin, { category:"sectionCopy" })
  const save = useMutation(api.cms.save)
  const [page, setPage] = useState("home")
  const [selected, setSelected] = useState<string>("")
  const [draft, setDraft] = useState<ContentDraft>({
    ...blankContent,
    parentSlug:"home",
    status:"published",
  })
  const pages = useMemo(
    () => Array.from(new Set(entries?.map((entry) => entry.parentSlug).filter(Boolean) ?? [])),
    [entries]
  )
  const pageEntries = useMemo(
    () => entries?.filter((entry) => entry.parentSlug === page) ?? [],
    [entries, page]
  )
  const existing = entries?.find((entry) => entry._id === selected)
  useEffect(() => {
    if (pages.length > 0 && !pages.includes(page)) setPage(pages[0])
  }, [page, pages])
  useEffect(() => {
    setSelected("")
    setDraft({ ...blankContent, parentSlug:page, status:"published" })
  }, [page])
  useEffect(() => {
    if (!selected && pageEntries[0]) setSelected(pageEntries[0]._id)
  }, [pageEntries, selected])
  useEffect(() => {
    if (existing) {
      const { _id, category: _category, imageStorageId: _image, imageUrl: _url, ...fields } = existing
      void _id; void _category; void _image; void _url
      setDraft(fields)
    } else {
      setDraft((current) => ({ ...blankContent, parentSlug:current.parentSlug || page, status:"published" }))
    }
  }, [existing, page, selected])
  const update = (key:keyof ContentDraft, value:string | number) =>
    setDraft((current) => ({ ...current, [key]:value }))

  return (
    <section className="admin-panel" data-compact="true">
      <PanelTitle
        eyebrow="Editorial control"
        title="Every public section"
        copy="Choose a page and section, then edit the visible labels, headings, supporting copy and call to action without changing the layout."
      />
      <label className="admin-field admin-record-select">
        <span>Page or shared area</span>
        <select value={page} onChange={(event) => setPage(event.target.value)}>
          {pages.map((value) => <option value={value} key={value}>{editorialPageLabels[value] || humanize(value)}</option>)}
        </select>
      </label>
      <AdminRecordSelect
        label="Section to edit"
        value={selected}
        records={pageEntries.map((entry) => ({ value:entry._id, label:entry.title || entry.slug }))}
        onChange={setSelected}
      />
      <div className="admin-form-grid">
        <Field label="Internal section key" value={draft.slug} disabled />
        <Field label="Page group" value={draft.parentSlug} disabled />
        <Field label="Small label / eyebrow" value={draft.eyebrow} onValueChange={(value) => update("eyebrow", value)} />
        <Field label="Heading or primary text" value={draft.title} onValueChange={(value) => update("title", value)} />
        <Field label="Supporting paragraph" multiline value={draft.summary} onValueChange={(value) => update("summary", value)} />
        <Field label="Detailed copy or source note" multiline value={draft.body} onValueChange={(value) => update("body", value)} />
        <Field label="Additional text" multiline value={draft.secondaryText} onValueChange={(value) => update("secondaryText", value)} />
        <Field label="Button label" value={draft.linkLabel} onValueChange={(value) => update("linkLabel", value)} />
        <Field label="Button destination" value={draft.linkUrl} onValueChange={(value) => update("linkUrl", value)} />
        <Field label="Display order" type="number" value={String(draft.order)} onValueChange={(value) => update("order", Number(value))} />
      </div>
      <Button className="admin-save" onClick={async () => {
        if (!existing || !draft.title.trim()) {
          toast.error("Choose a section and add its primary heading.")
          return
        }
        try {
          await save({
            id:existing._id,
            category:"sectionCopy",
            ...draft,
            slug:existing.slug,
            parentSlug:existing.parentSlug,
            status:"published",
            featured:false,
          })
          toast.success("Editorial section published.")
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Editorial copy could not be saved.")
        }
      }}><SaveIcon /> Save editorial section</Button>
    </section>
  )
}

function StructuredDocumentPanel({ category }: { category:StructuredCategory }) {
  const entries = useQuery(api.cms.listForAdmin, { category })
  const save = useMutation(api.cms.save)
  const remove = useMutation(api.cms.remove)
  const [selected, setSelected] = useState<string>("new")
  const [draft, setDraft] = useState<ContentDraft>({
    ...blankContent,
    parentSlug:category === "strategy" ? "goal" : "",
  })
  const existing = entries?.find((entry) => entry._id === selected)
  useEffect(() => {
    if (existing) {
      const { _id, category: _category, imageStorageId: _image, imageUrl: _url, ...fields } = existing
      void _id; void _category; void _image; void _url
      setDraft(fields)
    } else {
      setDraft({ ...blankContent, parentSlug:category === "strategy" ? "goal" : "" })
    }
  }, [category, existing, selected])

  const labels = {
    agenda:["Proposed Agenda", "Each agenda entry has its own number, discussion points, and expected outcome."],
    resolution:["Paris Resolution 2026", "Expected outcomes are collected into one section after all published resolutions."],
    strategy:["5-Year Strategic Plan", "Create one Vision, strategic goals, and year-by-year Implementation Timeline cards."],
    partnership:["International Partnership Framework", "Create a country or institution card with its cooperation area and expected outcomes."],
  }[category]
  const update = (key:keyof ContentDraft, value:string | number | boolean) =>
    setDraft((current) => ({ ...current, [key]:value }))
  const strategyType = draft.parentSlug || "goal"

  return (
    <section className="admin-panel" data-compact="true">
      <PanelTitle eyebrow="Page editor" title={labels[0]} copy={labels[1]} />
      <AdminRecordSelect
        label="Section to edit"
        value={selected}
        createLabel="+ Create a new section"
        records={entries?.map((entry) => ({ value:entry._id, label:entry.title })) ?? []}
        onChange={setSelected}
      />
      <div className="admin-form-grid">
        {category === "strategy" && <label className="admin-field"><span>Content type</span><select value={strategyType} onChange={(event) => update("parentSlug", event.target.value)}><option value="goal">Strategic goal</option><option value="vision">Vision</option><option value="timeline">Implementation Timeline card</option></select></label>}
        <Field label="URL slug" value={draft.slug} onValueChange={(value) => update("slug", value)} />
        {category === "agenda" && <Field label="Agenda number" value={draft.eyebrow} onValueChange={(value) => update("eyebrow", value)} />}
        {category === "resolution" && <Field label="Resolution number" value={draft.eyebrow} onValueChange={(value) => update("eyebrow", value)} />}
        {category === "strategy" && strategyType === "goal" && <Field label="Strategic goal number" value={draft.eyebrow} onValueChange={(value) => update("eyebrow", value)} />}
        {category === "strategy" && strategyType === "timeline" && <Field label="Year" value={draft.dateLabel} onValueChange={(value) => update("dateLabel", value)} />}
        <Field label={category === "agenda" ? "Agenda title" : category === "partnership" ? "Country or institution name" : strategyType === "vision" ? "Vision title" : "Title"} value={draft.title} onValueChange={(value) => update("title", value)} />
        {category === "resolution" && <Field label="Summary" multiline value={draft.summary} onValueChange={(value) => update("summary", value)} />}
        {category !== "resolution" && <Field label={category === "agenda" ? "Discussion points" : category === "partnership" ? "Area of cooperation" : strategyType === "goal" ? "Key actions" : strategyType === "timeline" ? "Plan for this year" : "Vision"} multiline value={draft.body} onValueChange={(value) => update("body", value)} />}
        {(category === "agenda" || category === "resolution" || category === "partnership" || (category === "strategy" && strategyType === "goal")) && <Field label="Expected outcomes" multiline value={draft.secondaryText} onValueChange={(value) => update("secondaryText", value)} />}
        <Field label="Display order" type="number" value={String(draft.order)} onValueChange={(value) => update("order", Number(value))} />
        <label className="admin-field"><span>Publication status</span><select value={draft.status} onChange={(event) => update("status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label>
      </div>
      <div className="admin-editor-actions">
        <Button onClick={async () => {
          try {
            await save({
              ...(existing ? { id:existing._id } : {}),
              category,
              ...draft,
              summary:category === "agenda" && !draft.summary ? draft.body : draft.summary,
              parentSlug:category === "strategy" ? strategyType : draft.parentSlug,
            })
            toast.success(`${labels[0]} updated.`)
            setSelected("new")
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "The section could not be saved.")
          }
        }}><SaveIcon /> Save section</Button>
        {existing && <ConfirmDelete label={existing.title} onConfirm={async () => { await remove({ id:existing._id }); setSelected("new") }} />}
      </div>
    </section>
  )
}

async function uploadAdminAsset({
  file,
  category,
  uploadUrl,
  register,
}: {
  file:File
  category:"portrait" | "media" | "document" | "logo"
  uploadUrl:()=>Promise<string>
  register:(args:{ storageId:Id<"_storage">; fileName:string; mimeType:string; byteSize:number; altText:string; category:"portrait" | "media" | "document" | "logo" })=>Promise<unknown>
}) {
  if (file.size > 20_000_000) throw new Error("Files must be smaller than 20 MB.")
  const url = await uploadUrl()
  const response = await fetch(url, { method:"POST", headers:{ "Content-Type":file.type }, body:file })
  if (!response.ok) throw new Error("The file could not be uploaded to Convex.")
  const result = await response.json() as { storageId:Id<"_storage"> }
  await register({
    storageId:result.storageId,
    fileName:file.name,
    mimeType:file.type,
    byteSize:file.size,
    altText:file.name.replace(/\.[^.]+$/, "").trim() || "Uploaded file",
    category,
  })
  return result.storageId
}

function PeopleEditor({ mode }: { mode:"speaker" | "team" | "advisory" }) {
  const category = mode
  const entries = useQuery(api.cms.listForAdmin, { category })
  const assets = useQuery(api.assets.list)
  const save = useMutation(api.cms.save)
  const remove = useMutation(api.cms.remove)
  const generateUploadUrl = useMutation(api.assets.generateUploadUrl)
  const register = useMutation(api.assets.register)
  const [selected, setSelected] = useState<string>("new")
  const [draft, setDraft] = useState<ContentDraft>({ ...blankContent })
  const [imageStorageId, setImageStorageId] = useState<Id<"_storage"> | undefined>()
  const [uploading, setUploading] = useState(false)
  const existing = entries?.find((entry) => entry._id === selected)
  const portraits = assets?.filter((asset) => asset.mimeType.startsWith("image/"))
  useEffect(() => { setSelected("new") }, [category])
  useEffect(() => {
    if (existing) {
      const { _id, category: _category, imageStorageId:image, imageUrl: _url, ...fields } = existing
      void _id; void _category; void _url
      setDraft(fields)
      setImageStorageId(image)
    } else {
      setDraft({ ...blankContent })
      setImageStorageId(undefined)
    }
  }, [existing, selected, category])
  const update = (key:keyof ContentDraft, value:string | number | boolean) => setDraft((current) => ({ ...current, [key]:value }))

  return (
    <section className="admin-panel" data-compact="true">
      <PanelTitle eyebrow="People editor" title={mode === "speaker" ? "Speakers" : mode === "team" ? "Organising Committee" : "Advisory Board"} copy="Add each person with a name, role, full biography, and profile picture. The public page creates a short preview and a Read more control automatically." />
      <AdminRecordSelect
        label="Person to edit"
        value={selected}
        createLabel="+ Add a new person"
        records={entries?.map((entry) => ({ value:entry._id, label:entry.title })) ?? []}
        onChange={setSelected}
      />
      <div className="admin-form-grid">
        <Field label="URL slug" value={draft.slug} onValueChange={(value) => update("slug", value)} />
        <Field label="Name" value={draft.title} onValueChange={(value) => update("title", value)} />
        <Field label="Short intro shown below the name" value={draft.role} onValueChange={(value) => update("role", value)} />
        {category === "speaker" && <Field label="Country" value={draft.country} onValueChange={(value) => update("country", value)} />}
        <Field label="Full biography (leave blank to show no biography)" multiline value={draft.body} onValueChange={(value) => update("body", value)} />
        <label className="admin-field"><span>Profile picture</span><select value={imageStorageId ?? ""} onChange={(event) => setImageStorageId((event.target.value || undefined) as Id<"_storage"> | undefined)}><option value="">No picture selected</option>{portraits?.map((asset) => <option key={asset._id} value={asset.storageId}>{asset.fileName}</option>)}</select></label>
        <AdminFileUpload
          accept="image/jpeg,image/png,image/webp,image/avif"
          title="Upload profile picture"
          description="JPEG, PNG, WebP or AVIF · maximum 20 MB"
          disabled={uploading}
          onUpload={async (file) => {
            if (!file.type.startsWith("image/")) throw new Error("Choose an image file.")
            setUploading(true)
            try {
              const storageId = await uploadAdminAsset({ file, category:"portrait", uploadUrl:generateUploadUrl, register })
              setImageStorageId(storageId)
              toast.success("Profile picture uploaded and selected.")
            } finally {
              setUploading(false)
            }
          }}
        />
        <Field label="Display order" type="number" value={String(draft.order)} onValueChange={(value) => update("order", Number(value))} />
        <label className="admin-field"><span>Publication status</span><select value={draft.status} onChange={(event) => update("status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label>
        {category === "speaker" && <label className="admin-check"><Checkbox checked={draft.featured} onCheckedChange={(value) => update("featured", Boolean(value))} /> Feature on Home page</label>}
      </div>
      <div className="admin-editor-actions">
        <Button onClick={async () => {
          try {
            await save({
              ...(existing ? { id:existing._id } : {}),
              category,
              ...draft,
              summary:draft.summary || draft.role,
              eyebrow:category === "speaker" ? "Speaker" : category === "team" ? "Organizing Team" : "Advisory Board",
              imageStorageId,
            })
            toast.success("Person saved.")
            setSelected("new")
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "The person could not be saved.")
          }
        }}><SaveIcon /> Save person</Button>
        {existing && <ConfirmDelete label={existing.title} onConfirm={async () => { await remove({ id:existing._id }); setSelected("new") }} />}
      </div>
    </section>
  )
}

function MediaPublicationPanel() {
  const data = useQuery(api.media.listForAdmin)
  const assets = useQuery(api.assets.list)
  const saveSection = useMutation(api.media.saveSection)
  const removeSection = useMutation(api.media.removeSection)
  const saveItem = useMutation(api.media.saveItem)
  const removeItem = useMutation(api.media.removeItem)
  const generateUploadUrl = useMutation(api.assets.generateUploadUrl)
  const register = useMutation(api.assets.register)
  const [selected, setSelected] = useState<string>("new")
  const [uploading, setUploading] = useState<"cover" | "file" | null>(null)
  const [draft, setDraft] = useState<{
    sectionSlug:string
    slug:string
    title:string
    description:string
    mediaType:"document" | "photo" | "video"
    coverStorageId?:Id<"_storage">
    fileStorageId?:Id<"_storage">
    fileName:string
    mimeType:string
    youtubeUrl?:string
    order:number
    status:"draft" | "published"
  }>({
    sectionSlug:"",
    slug:"",
    title:"",
    description:"",
    mediaType:"document",
    fileName:"",
    mimeType:"",
    youtubeUrl:"",
    order:50,
    status:"draft",
  })
  const existing = data?.items.find((item) => item._id === selected)
  const imageAssets = assets?.filter((asset) => asset.mimeType.startsWith("image/"))
  const fileAssets = assets?.filter((asset) => !asset.mimeType.startsWith("image/") || asset.category === "document")
  useEffect(() => {
    if (existing) {
      const { _id, ...fields } = existing
      void _id
      setDraft(fields)
    } else {
      setDraft({
        sectionSlug:data?.sections[0]?.slug ?? "",
        slug:"",
        title:"",
        description:"",
        mediaType:"document",
        fileName:"",
        mimeType:"",
        youtubeUrl:"",
        order:50,
        status:"draft",
      })
    }
  }, [data?.sections, existing, selected])

  return (
    <section className="admin-panel media-publication-admin" data-compact="true">
      <PanelTitle eyebrow="Publication editor" title="Media & Publication" copy="Create publication sections, photo galleries, and YouTube video galleries from one managed archive." />
      <StatementsEditor />
      <RecordCards
        title="Publication sections"
        copy="These section names become the Media & Publication submenu."
        rows={data?.sections}
        fields={["slug","name","description","order","status"]}
        blank={{ slug:"",name:"",description:"",order:50,status:"draft" }}
        onSave={saveSection}
        onRemove={removeSection}
      />
      <div className="admin-subpanel">
        <PanelTitle eyebrow="Archive items" title="Publications, photos & videos" copy="Choose a format for each item. Photos open as a visual gallery; videos play in privacy-enhanced YouTube embeds." />
        <AdminRecordSelect
          label="Publication to edit"
          value={selected}
          createLabel="+ Add a new publication"
          records={data?.items.map((item) => ({ value:item._id, label:item.title })) ?? []}
          onChange={setSelected}
        />
        <div className="admin-form-grid">
          <label className="admin-field"><span>Submenu section</span><select value={draft.sectionSlug} onChange={(event) => setDraft({ ...draft, sectionSlug:event.target.value })}><option value="">Choose a section</option>{data?.sections.map((section) => <option key={section._id} value={section.slug}>{section.name}</option>)}</select></label>
          <label className="admin-field"><span>Item format</span><select value={draft.mediaType} onChange={(event) => setDraft({ ...draft, mediaType:event.target.value as typeof draft.mediaType, fileStorageId:undefined, fileName:"", mimeType:"", youtubeUrl:"" })}><option value="document">Downloadable publication</option><option value="photo">Photo gallery image</option><option value="video">YouTube video</option></select></label>
          <Field label="URL slug (optional)" value={draft.slug} placeholder="Generated from the title" onValueChange={(value) => setDraft({ ...draft, slug:value })} />
          <Field label="Title" value={draft.title} onValueChange={(value) => setDraft({ ...draft, title:value })} />
          <Field label="Description" multiline value={draft.description} onValueChange={(value) => setDraft({ ...draft, description:value })} />
          {draft.mediaType === "document" && <label className="admin-field"><span>Optional cover image</span><select value={draft.coverStorageId ?? ""} onChange={(event) => setDraft({ ...draft, coverStorageId:(event.target.value || undefined) as Id<"_storage"> | undefined })}><option value="">No cover image</option>{imageAssets?.map((asset) => <option key={asset._id} value={asset.storageId}>{asset.fileName}</option>)}</select></label>}
          {draft.mediaType === "document" && <AdminFileUpload
            accept="image/jpeg,image/png,image/webp,image/avif"
            title="Upload cover image"
            description="JPEG, PNG, WebP or AVIF · maximum 20 MB"
            disabled={Boolean(uploading)}
            onUpload={async (file) => {
              setUploading("cover")
              try {
                const storageId = await uploadAdminAsset({ file, category:"media", uploadUrl:generateUploadUrl, register })
                setDraft((current) => ({ ...current, coverStorageId:storageId }))
                toast.success("Cover uploaded and selected.")
              } finally {
                setUploading(null)
              }
            }}
          />}
          {draft.mediaType !== "video" && <label className="admin-field"><span>{draft.mediaType === "photo" ? "Gallery image" : "Publication file"}</span><select value={draft.fileStorageId ?? ""} onChange={(event) => {
            const asset = assets?.find((item) => item.storageId === event.target.value)
            setDraft({ ...draft, fileStorageId:(event.target.value || undefined) as Id<"_storage"> | undefined, fileName:asset?.fileName ?? "", mimeType:asset?.mimeType ?? "" })
          }}><option value="">Choose a file</option>{(draft.mediaType === "photo" ? imageAssets : fileAssets)?.map((asset) => <option key={asset._id} value={asset.storageId}>{asset.fileName}</option>)}</select></label>}
          {draft.mediaType !== "video" && <AdminFileUpload
            accept={draft.mediaType === "photo" ? "image/jpeg,image/png,image/webp,image/avif" : ".pdf,.doc,.docx,.ppt,.pptx,application/pdf"}
            title={draft.mediaType === "photo" ? "Upload gallery image" : "Upload publication file"}
            description={draft.mediaType === "photo" ? "JPEG, PNG, WebP or AVIF · maximum 20 MB" : "PDF, Word or PowerPoint · maximum 20 MB"}
            disabled={Boolean(uploading)}
            onUpload={async (file) => {
              setUploading("file")
              try {
                const storageId = await uploadAdminAsset({ file, category:draft.mediaType === "photo" ? "media" : "document", uploadUrl:generateUploadUrl, register })
                setDraft((current) => ({ ...current, fileStorageId:storageId, fileName:file.name, mimeType:file.type }))
                toast.success(draft.mediaType === "photo" ? "Gallery image uploaded and selected." : "Publication file uploaded and selected.")
              } finally {
                setUploading(null)
              }
            }}
          />}
          {draft.mediaType === "video" && <Field label="YouTube video URL" value={draft.youtubeUrl ?? ""} placeholder="https://www.youtube.com/watch?v=…" onValueChange={(value) => setDraft({ ...draft, youtubeUrl:value })} />}
          <Field label="Display order" type="number" value={String(draft.order)} onValueChange={(value) => setDraft({ ...draft, order:Number(value) })} />
          <label className="admin-field"><span>Publication status</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status:event.target.value as "draft" | "published" })}><option value="draft">Draft</option><option value="published">Published</option></select></label>
        </div>
        <div className="admin-editor-actions">
          <Button onClick={async () => {
            const sectionExists = data?.sections.some((section) => section.slug === draft.sectionSlug)
            const title = draft.title.trim()
            const slug = (draft.slug || title).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
            const selectedFile = assets?.find((asset) => asset.storageId === draft.fileStorageId)
            if (!sectionExists) { toast.error("Choose an existing submenu section."); return }
            if (!title) { toast.error("Enter a title."); return }
            if (!slug) { toast.error("Enter a URL slug using letters or numbers."); return }
            if (draft.mediaType !== "video" && !draft.fileStorageId) { toast.error(draft.mediaType === "photo" ? "Choose or upload a gallery image first." : "Choose or upload a publication file first."); return }
            if (draft.mediaType === "video" && !draft.youtubeUrl?.trim()) { toast.error("Enter a YouTube video URL first."); return }
            try {
              await saveItem({
                ...(existing ? { id:existing._id } : {}),
                sectionSlug:draft.sectionSlug,
                slug,
                title,
                description:draft.description,
                mediaType:draft.mediaType,
                ...(draft.mediaType === "document" && draft.coverStorageId ? { coverStorageId:draft.coverStorageId } : {}),
                ...(draft.mediaType === "video"
                  ? { fileName:"", mimeType:"", youtubeUrl:draft.youtubeUrl }
                  : {
                      fileStorageId:draft.fileStorageId!,
                      fileName:selectedFile?.fileName ?? draft.fileName,
                      mimeType:selectedFile?.mimeType ?? draft.mimeType,
                    }),
                order:draft.order,
                status:draft.status,
              })
              toast.success(draft.mediaType === "photo" ? "Photo saved." : draft.mediaType === "video" ? "Video saved." : "Publication saved.")
              setSelected("new")
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "The publication could not be saved.")
            }
          }}><SaveIcon /> Save {draft.mediaType}</Button>
          {existing && <ConfirmDelete label={existing.title} onConfirm={async () => { await removeItem({ id:existing._id }); setSelected("new") }} />}
        </div>
      </div>
    </section>
  )
}

function StatementsEditor() {
  const rows = useQuery(api.statements.listForAdmin)
  const assets = useQuery(api.assets.list)
  const save = useMutation(api.statements.save)
  const remove = useMutation(api.statements.remove)
  const generateUploadUrl = useMutation(api.assets.generateUploadUrl)
  const register = useMutation(api.assets.register)
  const [selected, setSelected] = useState("new")
  const [uploading, setUploading] = useState(false)
  const [draft, setDraft] = useState<{
    slug:string
    title:string
    description:string
    releaseDate:string
    fileStorageId?:Id<"_storage">
    order:number
    status:"draft" | "published"
  }>({
    slug:"",
    title:"",
    description:"",
    releaseDate:"",
    order:50,
    status:"draft",
  })
  const existing = rows?.find((row) => row._id === selected)
  const statementAssets = assets?.filter((asset) =>
    [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
    ].includes(asset.mimeType)
  )

  useEffect(() => {
    if (existing) {
      setDraft({
        slug:existing.slug,
        title:existing.title,
        description:existing.description,
        releaseDate:existing.releaseDate,
        fileStorageId:existing.fileStorageId,
        order:existing.order,
        status:existing.status,
      })
      return
    }
    setDraft({
      slug:"",
      title:"",
      description:"",
      releaseDate:"",
      order:50,
      status:"draft",
    })
  }, [existing, selected])

  return (
    <div className="admin-subpanel statements-admin">
      <PanelTitle
        eyebrow="Official record"
        title="Statements"
        copy="Publish official or community statements, press releases, and public notices. Upload the original file directly. No cover image is required."
      />
      <AdminRecordSelect
        label="Statement to edit"
        value={selected}
        createLabel="+ Add a new statement"
        records={rows?.map((row) => ({ value:row._id, label:row.title })) ?? []}
        onChange={setSelected}
      />
      <div className="admin-form-grid">
        <Field label="Title" value={draft.title} onValueChange={(title) => setDraft({ ...draft, title })} />
        <Field label="Statement date" type="date" value={draft.releaseDate} onValueChange={(releaseDate) => setDraft({ ...draft, releaseDate })} />
        <Field label="URL slug (optional)" value={draft.slug} placeholder="Generated from the title" onValueChange={(slug) => setDraft({ ...draft, slug })} />
        <Field label="Short description" multiline value={draft.description} onValueChange={(description) => setDraft({ ...draft, description })} />
        <label className="admin-field">
          <span>Statement file</span>
          <select
            value={draft.fileStorageId ?? ""}
            onChange={(event) => setDraft({
              ...draft,
              fileStorageId:(event.target.value || undefined) as Id<"_storage"> | undefined,
            })}
          >
            <option value="">Choose a file</option>
            {statementAssets?.map((asset) => (
              <option key={asset._id} value={asset.storageId}>{asset.fileName}</option>
            ))}
          </select>
        </label>
        <AdminFileUpload
          accept=".pdf,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
          title="Upload statement file"
          description="PDF, DOCX, JPG or PNG · maximum 20 MB"
          disabled={uploading}
          onUpload={async (file) => {
            const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
            if (![".pdf", ".docx", ".jpg", ".jpeg", ".png"].includes(extension)) {
              throw new Error("Choose a PDF, DOCX, JPG, or PNG file.")
            }
            setUploading(true)
            try {
              const storageId = await uploadAdminAsset({
                file,
                category:"document",
                uploadUrl:generateUploadUrl,
                register,
              })
              setDraft((current) => ({ ...current, fileStorageId:storageId }))
              toast.success("Statement file uploaded and selected.")
            } finally {
              setUploading(false)
            }
          }}
        />
        <Field label="Display order" type="number" value={String(draft.order)} onValueChange={(order) => setDraft({ ...draft, order:Number(order) })} />
        <label className="admin-field">
          <span>Publication status</span>
          <select value={draft.status} onChange={(event) => setDraft({ ...draft, status:event.target.value as "draft" | "published" })}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
      </div>
      <div className="admin-editor-actions">
        <Button onClick={async () => {
          if (!draft.title.trim()) { toast.error("Enter a statement title."); return }
          if (!draft.releaseDate) { toast.error("Choose the statement date."); return }
          if (!draft.fileStorageId) { toast.error("Choose or upload a statement file."); return }
          try {
            await save({
              ...(existing ? { id:existing._id } : {}),
              slug:draft.slug,
              title:draft.title,
              description:draft.description,
              releaseDate:draft.releaseDate,
              fileStorageId:draft.fileStorageId,
              order:draft.order,
              status:draft.status,
            })
            toast.success(draft.status === "published" ? "Statement published." : "Statement saved as a draft.")
            setSelected("new")
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "The statement could not be saved.")
          }
        }}><SaveIcon /> Save statement</Button>
        {existing && <ConfirmDelete label={existing.title} onConfirm={async () => {
          await remove({ id:existing._id })
          setSelected("new")
          toast.success("Statement removed.")
        }} />}
      </div>
    </div>
  )
}

function ContentPanel({ compact = false, initialCategory = "engage" }: { compact?:boolean; initialCategory?:(typeof categories)[number] }) {
  const [category, setCategory] = useState<(typeof categories)[number]>(initialCategory)
  const entries = useQuery(api.cms.listForAdmin, { category })
  const save = useMutation(api.cms.save)
  const remove = useMutation(api.cms.remove)
  const assets = useQuery(api.assets.list)
  const [selected, setSelected] = useState<string>("new")
  const [imageStorageId, setImageStorageId] = useState<Id<"_storage"> | undefined>()
  const existing = entries?.find((item) => item._id === selected)
  const [draft, setDraft] = useState<ContentDraft>({ ...blankContent })
  useEffect(() => { setCategory(initialCategory); setSelected("new") }, [initialCategory])
  useEffect(() => {
    if (existing) {
      const { _id, category: _category, imageStorageId: _image, imageUrl: _url, ...fields } = existing
      setImageStorageId(_image)
      void _id; void _category; void _url
      setDraft(fields)
    } else { setDraft({ ...blankContent }); setImageStorageId(undefined) }
  }, [existing, category, selected])
  return (
    <section className="admin-panel" data-compact={compact}>
      <PanelTitle eyebrow="Page inspector" title={`Edit ${humanize(category)}`} copy="Choose an item, edit the public copy, and save it as a draft or published section." />
      <div className="admin-content-layout">
        <aside className="admin-records">
          <select value={category} onChange={(event) => { setCategory(event.target.value as typeof category); setSelected("new") }}>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button data-active={selected === "new"} onClick={() => setSelected("new")}><SparklesIcon /> New {category}</button>
          {entries?.map((entry) => <button data-active={selected === entry._id} key={entry._id} onClick={() => setSelected(entry._id)}><span>{entry.title}</span><small>{entry.status}</small></button>)}
        </aside>
        <div className="admin-editor">
          <div className="admin-form-grid">
            {Object.entries(draft).filter(([key]) => !["featured", "status", "order"].includes(key)).map(([key, value]) => (
              <Field key={key} label={humanize(key)} value={String(value)} multiline={["summary", "body", "secondaryText"].includes(key)} onValueChange={(next) => setDraft({ ...draft, [key]: next })} />
            ))}
            <Field label="Display order" type="number" value={String(draft.order)} onValueChange={(value) => setDraft({ ...draft, order: Number(value) })} />
            <label className="admin-field"><span>Publication status</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as "draft" | "published" })}><option value="draft">Draft</option><option value="published">Published</option></select></label>
            <label className="admin-check"><Checkbox checked={draft.featured} onCheckedChange={(value) => setDraft({ ...draft, featured: Boolean(value) })} /> Featured record</label>
            <label className="admin-field"><span>Attached image or document</span><select value={imageStorageId ?? ""} onChange={(event) => setImageStorageId((event.target.value || undefined) as Id<"_storage"> | undefined)}><option value="">No attachment</option>{assets?.map((asset) => <option key={asset._id} value={asset.storageId}>{asset.fileName}</option>)}</select></label>
          </div>
          <div className="admin-editor-actions">
            <Button onClick={async () => {
              await save({ ...(existing ? { id: existing._id } : {}), category, ...draft, imageStorageId })
              toast.success("Content saved."); setSelected("new")
            }}><SaveIcon /> Save record</Button>
            {existing && <ConfirmDelete label={existing.title} onConfirm={async () => { await remove({ id: existing._id }); setSelected("new"); toast.success("Record removed.") }} />}
          </div>
        </div>
      </div>
    </section>
  )
}

function RegionalPanel() {
  const rows = useQuery(api.content.listRegionalForAdmin)
  const save = useMutation(api.content.saveRegional)
  const remove = useMutation(api.content.removeRegional)
  return <RecordCards title="Beyond Bangladesh" copy="Nepal is included. Add any country, revise its public briefing, change the order or hold it as a draft." rows={rows} fields={["slug","name","code","eyebrow","headline","summary","detail","sourceUrl","order","status"]} blank={{ slug:"",name:"",code:"",eyebrow:"",headline:"",summary:"",detail:"",sourceUrl:"",order:50,status:"draft" }} onSave={save} onRemove={remove} />
}

function PartnersPanel() {
  const rows = useQuery(api.content.listOrganizationsForAdmin)
  const assets = useQuery(api.assets.list)
  const saveMutation = useMutation(api.content.saveOrganization)
  const remove = useMutation(api.content.removeOrganization)
  const uploadUrl = useMutation(api.assets.generateUploadUrl)
  const register = useMutation(api.assets.register)
  async function uploadLogo(file: File) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"]
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".avif"]
    if (!allowedTypes.includes(file.type) || !allowedExtensions.some((extension) => file.name.toLowerCase().endsWith(extension))) {
      throw new Error("Choose a JPEG, PNG, WebP, or AVIF logo.")
    }
    if (file.size > 20_000_000) throw new Error("Logo files must be smaller than 20 MB.")
    const bitmap = await createImageBitmap(file)
    if (bitmap.width < 320 || bitmap.height < 180) {
      bitmap.close()
      throw new Error("Logos must be at least 320 × 180 pixels.")
    }
    bitmap.close()
    const url = await uploadUrl()
    const response = await fetch(url, { method:"POST", headers:{ "Content-Type":file.type }, body:file })
    if (!response.ok) throw new Error("The logo could not be uploaded to Convex.")
    const result = await response.json() as { storageId: Id<"_storage"> }
    const plainName = file.name.replace(/\.[^.]+$/, "").trim()
    await register({
      storageId: result.storageId,
      fileName: file.name,
      mimeType: file.type,
      byteSize: file.size,
      altText: plainName.length >= 3 ? plainName : `Partner logo ${plainName}`,
      category: "logo",
    })
    return result.storageId
  }
  async function saveOrganization(args:Parameters<typeof saveMutation>[0]) {
    try {
      return await saveMutation(args)
    } catch (error) {
      if (!isLegacyOrganizationRoleError(error)) throw error
      const legacySaveMutation = saveMutation as unknown as (
        legacyArgs:Record<string,unknown>
      ) => Promise<Id<"organizations">>
      return await legacySaveMutation(omitOrganizationRole(args))
    }
  }

  const storedLeadershipRows = rows
    ?.filter((row) => resolveOrganizationRole(row) !== "supporting")
  const leadershipRows = ensureLeadershipRecords(storedLeadershipRows ?? [])
  const supportingRows = rows
    ?.filter((row) => resolveOrganizationRole(row) === "supporting")
    .map((row) => ({ ...row, organizationRole:"supporting" as const }))

  return (
    <div className="organization-admin-stack">
      <RecordCards
        title="Organizing & managing organizations"
        copy="Edit the two organizations featured at the top of the public Organizations section. Their official logo, name, activity brief, and website appear directly on the page."
        rows={leadershipRows}
        fields={["slug","name","organizationRole","description","websiteUrl","order","status"]}
        blank={{ slug:"",name:"",organizationRole:"organizing",kind:"partner",tier:"strategic",description:"",websiteUrl:"",logoStorageId:undefined,order:10,status:"draft" }}
        fieldLabels={{ organizationRole:"Responsibility", description:"Short brief / activities", websiteUrl:"Official website" }}
        assetPicker={{ field:"logoStorageId", label:"Official organization logo", assets, onUpload:uploadLogo }}
        onSave={saveOrganization}
        onRemove={remove}
      />
      <SupportingOrganizationsCopyEditor />
      <RecordCards
        title="Supporting organizations"
        copy="Manage the partner and sponsor cards displayed under the supporting-organizations introduction."
        rows={supportingRows}
        fields={["slug","name","kind","tier","description","websiteUrl","order","status"]}
        blank={{ slug:"",name:"",organizationRole:"supporting",kind:"partner",tier:"community",description:"",websiteUrl:"",logoStorageId:undefined,order:50,status:"draft" }}
        fieldLabels={{ description:"Short brief / activities", websiteUrl:"Official website" }}
        assetPicker={{ field:"logoStorageId", label:"Official organization logo", assets, onUpload:uploadLogo }}
        onSave={saveOrganization}
        onRemove={remove}
      />
    </div>
  )
}

function SupportingOrganizationsCopyEditor() {
  const entries = useQuery(api.cms.listForAdmin, { category:"sectionCopy" })
  const save = useMutation(api.cms.save)
  const existing = entries?.find(
    (entry) => entry.slug === "supporting-organizations-heading"
  )
  const [eyebrow, setEyebrow] = useState("Regional network")
  const [title, setTitle] = useState("Supporting Organisations")
  const [summary, setSummary] = useState(
    "Our partners from India, Bangladesh, Pakistan and Nepal help extend policy impact, strengthen research, deepen community connections, improve access, and provide practical support—all in one visible and valued network."
  )

  useEffect(() => {
    if (!existing) return
    setEyebrow(existing.eyebrow)
    setTitle(existing.title)
    setSummary(existing.summary)
  }, [existing])

  return (
    <section className="admin-panel organization-copy-editor">
      <PanelTitle
        eyebrow="Public section introduction"
        title="Supporting-section text"
        copy="This heading and paragraph appear immediately above the supporting organization cards."
      />
      <div className="admin-form-grid">
        <Field label="Small section label" value={eyebrow} onValueChange={setEyebrow} />
        <Field label="Section heading" value={title} onValueChange={setTitle} />
        <Field label="Introduction" multiline value={summary} onValueChange={setSummary} />
      </div>
      <div className="admin-editor-actions">
        <Button onClick={async () => {
          if (!title.trim() || !summary.trim()) {
            toast.error("Enter both the supporting-section heading and introduction.")
            return
          }
          try {
            await save({
              ...(existing ? { id:existing._id } : {}),
              category:"sectionCopy",
              slug:"supporting-organizations-heading",
              title:title.trim(),
              eyebrow:eyebrow.trim(),
              summary:summary.trim(),
              body:existing?.body ?? "",
              secondaryText:existing?.secondaryText ?? "",
              country:existing?.country ?? "",
              role:existing?.role ?? "",
              email:existing?.email ?? "",
              phone:existing?.phone ?? "",
              linkLabel:existing?.linkLabel ?? "",
              linkUrl:existing?.linkUrl ?? "",
              dateLabel:existing?.dateLabel ?? "",
              timeLabel:existing?.timeLabel ?? "",
              parentSlug:"partners",
              imageStorageId:existing?.imageStorageId,
              order:existing?.order ?? 31,
              status:"published",
              featured:false,
            })
            toast.success("Supporting-section text published.")
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "The supporting-section text could not be saved.")
          }
        }}><SaveIcon /> Save section text</Button>
      </div>
    </section>
  )
}

type RecordAssetPicker = {
  field: string
  label: string
  assets: Array<{ _id: string; storageId: Id<"_storage">; fileName: string; mimeType: string; altText: string; url: string | null }> | undefined
  onUpload: (file: File) => Promise<Id<"_storage">>
}

function RecordCards({ title, copy, rows, fields, blank, fieldLabels, assetPicker, onSave, onRemove }: { title:string; copy:string; rows: any[] | undefined; fields:string[]; blank:Record<string,any>; fieldLabels?:Record<string,string>; assetPicker?:RecordAssetPicker; onSave:(args:any)=>Promise<any>; onRemove:(args:any)=>Promise<any> }) {
  const [draft, setDraft] = useState<Record<string,any>>(blank)
  const [selected, setSelected] = useState<string>("new")
  const [assetBusy, setAssetBusy] = useState(false)
  useEffect(() => { setDraft(selected === "new" ? blank : rows?.find((row) => row._id === selected) ?? blank) }, [selected, rows, blank])
  const imageAssets = assetPicker?.assets?.filter((asset) => asset.mimeType.startsWith("image/"))
  const selectedAsset = imageAssets?.find((asset) => asset.storageId === draft[assetPicker?.field ?? ""])
  return (
    <section className="admin-panel">
      <PanelTitle eyebrow="Directory editor" title={title} copy={copy} />
      <AdminRecordSelect
        label="Record to edit"
        value={selected}
        createLabel="+ Create a new record"
        records={rows?.map((row) => ({ value:row._id, label:row.name || row.title || row.slug })) ?? []}
        onChange={setSelected}
      />
      <div className="admin-form-grid">
        {fields.map((key) => key === "status" || key === "kind" || key === "tier" || key === "organizationRole"
          ? <label className="admin-field" key={key}><span>{fieldLabels?.[key] ?? humanize(key)}</span><select value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}>
              {(key === "status" ? ["draft","published"] : key === "kind" ? ["partner","sponsor"] : key === "organizationRole" ? ["organizing","managing","supporting"] : ["strategic","knowledge","community","supporting"]).map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
            </select></label>
          : <Field key={key} label={fieldLabels?.[key] ?? humanize(key)} type={["order","value"].includes(key) ? "number" : "text"} multiline={["summary","detail","description","body","secondaryText"].includes(key)} value={String(draft[key] ?? "")} onValueChange={(value) => setDraft({ ...draft, [key]: ["order","value"].includes(key) ? Number(value) : value })} />)}
        {assetPicker && (
          <div className="admin-asset-picker">
            <label className="admin-field">
              <span>{assetPicker.label}</span>
              <select value={draft[assetPicker.field] ?? ""} onChange={(event) => setDraft({ ...draft, [assetPicker.field]:event.target.value ? event.target.value as Id<"_storage"> : undefined })}>
                <option value="">No logo attached</option>
                {imageAssets?.map((asset) => <option key={asset._id} value={asset.storageId}>{asset.fileName}</option>)}
              </select>
            </label>
            <div className="admin-asset-preview">
              {selectedAsset?.url ? <img src={selectedAsset.url} alt={selectedAsset.altText} /> : <div><ImageIcon /><span>No logo selected</span></div>}
              <AdminFileUpload
                accept="image/jpeg,image/png,image/webp,image/avif"
                title="Upload a new logo"
                description="JPEG, PNG, WebP or AVIF · maximum 20 MB"
                disabled={assetBusy}
                onUpload={async (file) => {
                  setAssetBusy(true)
                  try {
                    const storageId = await assetPicker.onUpload(file)
                    setDraft((current) => ({ ...current, [assetPicker.field]:storageId }))
                    toast.success("Logo uploaded and selected. Save the partner to publish it.")
                  } finally {
                    setAssetBusy(false)
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
      <div className="admin-editor-actions">
        <Button onClick={async () => {
          const value = prepareAdminRecordSave(draft, fields, selected)
          try {
            await onSave(value)
            setSelected("new")
            toast.success(`${title} updated.`)
          } catch (error) {
            toast.error(error instanceof Error ? error.message : `${title} could not be saved.`)
          }
        }}><SaveIcon /> Save</Button>
        {selected !== "new" && <ConfirmDelete label={String(draft.name ?? draft.title ?? "record")} onConfirm={async () => { await onRemove({ id:selected }); setSelected("new") }} />}
      </div>
    </section>
  )
}

function InboxPanel() {
  const rows = useQuery(api.admin.listSubmissions)
  const update = useMutation(api.admin.updateSubmission)
  return (
    <section className="admin-panel">
      <PanelTitle eyebrow="Human contact" title="Support, registration and enquiries." copy="Every public form arrives here with a reference, status and private editorial note." />
      <Button variant="outline" onClick={() => {
        if (!rows) return
        const header = ["type","firstName","lastName","email","phone","organization","subject","status","createdAt"]
        const csv = [header.join(","), ...rows.map((row) => header.map((key) => JSON.stringify(String(row[key as keyof typeof row] ?? ""))).join(","))].join("\n")
        const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type:"text/csv" })); link.download = `paris-summit-submissions-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(link.href)
      }}>Export CSV</Button>
      <div className="admin-inbox">
        {rows?.length === 0 && <EmptyCopy text="The inbox is quiet. Public forms are live and ready." />}
        {rows?.map((row) => <article key={row._id}>
          <header><Badge>{row.type}</Badge><span>{new Date(row.createdAt).toLocaleDateString()}</span></header>
          <h3>{row.firstName} {row.lastName}</h3><a href={`mailto:${row.email}`}>{row.email}</a>
          <p>{row.subject || row.message || "No message supplied."}</p>
          <div><select defaultValue={row.status} onChange={(event) => update({ id:row._id, status:event.target.value as SubmissionStatus, adminNote:row.adminNote })}><option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="archived">Archived</option></select></div>
        </article>)}
      </div>
    </section>
  )
}

function MailDeskPanel() {
  const messages = useQuery(api.mail.listMessages)
  const localAllowance = useQuery(api.mail.dailyAllowance)
  const contacts = useQuery(api.mail.listContacts)
  const markRead = useMutation(api.mail.markRead)
  const deleteMessage = useMutation(api.mail.deleteMessage)
  const saveContact = useMutation(api.mail.saveContact)
  const removeContact = useMutation(api.mail.removeContact)
  const [selectedId, setSelectedId] = useState<Id<"mailMessages"> | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [contactBookOpen, setContactBookOpen] = useState(false)
  const [recipientBookOpen, setRecipientBookOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState("")
  const [providerAllowance, setProviderAllowance] = useState<null | { limit:number; used:number; remaining:number; resetsAt:number; providerRemaining:number | null; source:"brevo" | "local" }>(null)
  const [contactDraft, setContactDraft] = useState({ name:"", email:"", organization:"", notes:"" })
  const [draft, setDraft] = useState({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    text: "",
    inReplyTo: "",
    references: "",
    mode: "single" as "single" | "bulk",
    consentConfirmed: false,
    attachments: [] as Array<{ fileName: string; mimeType: string; byteSize: number; contentBase64: string }>,
  })
  const filteredMessages = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return messages ?? []
    return (messages ?? []).filter((message) => [
      message.subject,
      message.textBody,
      message.fromName,
      message.fromAddress,
      ...message.toAddresses,
      ...message.ccAddresses,
      ...(message.bccAddresses ?? []),
    ].some((value) => value.toLowerCase().includes(needle)))
  }, [messages, search])
  const selected = filteredMessages.find((message) => message._id === selectedId) ?? filteredMessages[0]
  const allowance = providerAllowance ?? localAllowance
  const recipientCount = draft.to.split(/[;,\n]/).map((item) => item.trim()).filter(Boolean).length
  const usagePercent = allowance ? Math.min(100, ((allowance.limit - allowance.remaining) / allowance.limit) * 100) : 0

  useEffect(() => {
    let active = true
    void fetch("/api/admin/mail/allowance", { cache:"no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Allowance unavailable")
        return await response.json() as { limit:number; used:number; remaining:number; resetsAt:number; providerRemaining:number | null; source:"brevo" | "local" }
      })
      .then((result) => { if (active) setProviderAllowance(result) })
      .catch(() => { if (active) setProviderAllowance(null) })
    return () => { active = false }
  }, [localAllowance?.used])

  useEffect(() => {
    if (!selectedId && messages?.[0]) setSelectedId(messages[0]._id)
  }, [messages, selectedId])

  useEffect(() => {
    if (selected?.direction === "incoming" && !selected.isRead) void markRead({ id: selected._id })
  }, [markRead, selected])

  function openCompose() {
    setDraft({ to: "", cc: "", bcc:"", subject: "", text: "", inReplyTo: "", references: "", mode: "single", consentConfirmed:false, attachments: [] })
    setRecipientBookOpen(false)
    setComposeOpen(true)
  }

  function openCampaign() {
    setDraft({ to: "", cc: "", bcc:"", subject: "", text: "", inReplyTo: "", references: "", mode: "bulk", consentConfirmed:false, attachments: [] })
    setRecipientBookOpen(false)
    setComposeOpen(true)
  }

  function openReply() {
    if (!selected) return
    const replySubject = selected.subject.toLowerCase().startsWith("re:")
      ? selected.subject
      : `Re: ${selected.subject}`
    setDraft({
      to: selected.direction === "incoming" ? selected.fromAddress : selected.toAddresses[0] ?? "",
      cc: "",
      bcc: "",
      subject: replySubject,
      text: "",
      inReplyTo: selected.messageId,
      references: [selected.references, selected.messageId].filter(Boolean).join(" "),
      mode: "single",
      consentConfirmed: false,
      attachments: [],
    })
    setRecipientBookOpen(false)
    setComposeOpen(true)
  }

  function addRecipient(field: "to" | "cc" | "bcc", email: string) {
    setDraft((current) => {
      const existing = current[field].split(/[;,\n]/).map((item) => item.trim()).filter(Boolean)
      return existing.includes(email) ? current : { ...current, [field]:[...existing, email].join(", ") }
    })
  }

  async function addAttachments(files: FileList | File[] | null) {
    if (!files) return
    const allowedExtensions = new Set(["pdf", "doc", "docx", "jpg", "jpeg", "png"])
    const incoming = Array.from(files)
    const rejected = incoming.filter((file) => !allowedExtensions.has(file.name.split(".").pop()?.toLowerCase() ?? ""))
    if (rejected.length > 0) {
      toast.error("Attachments must be PDF, DOC, DOCX, JPEG, or PNG files.")
      return
    }
    const available = 5 - draft.attachments.length
    if (available <= 0) {
      toast.error("You can attach up to 5 files.")
      return
    }
    const chosen = incoming.slice(0, available)
    if (incoming.length > available) toast.error(`Only ${available} more attachment${available === 1 ? "" : "s"} can be added.`)
    const next = await Promise.all(chosen.map(async (file) => ({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      byteSize: file.size,
      contentBase64: await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "")
        reader.readAsDataURL(file)
      }),
    })))
    const combined = [...draft.attachments, ...next]
    if (combined.reduce((total, file) => total + file.byteSize, 0) > 3_000_000) {
      toast.error("Attachments must total 3 MB or less.")
      return
    }
    setDraft((current) => ({ ...current, attachments: combined }))
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true)
    try {
      const response = await fetch("/api/admin/mail/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      })
      const result = (await response.json()) as { error?: string; status?: string; recipientCount?: number }
      if (!response.ok) throw new Error(result.error || "The message could not be sent.")
      setComposeOpen(false)
      toast.success(`Queued for ${result.recipientCount ?? 1} recipient${(result.recipientCount ?? 1) === 1 ? "" : "s"}. Delivery status will appear in Mail Desk.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The message could not be sent.")
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="admin-panel mail-desk">
      <div className="mail-desk-heading">
        <PanelTitle
          eyebrow="Correspondence ledger"
          title="One desk for summit email."
          copy="Incoming messages are archived here and forwarded by Cloudflare. Replies leave as info@parishindusummit.org through Brevo."
        />
        <div className="mail-desk-actions">
          <Button variant="outline" onClick={() => setContactBookOpen(true)}><BookUserIcon /> Contacts · {contacts?.length ?? 0}</Button>
          <Button variant="outline" onClick={openCampaign}><MegaphoneIcon /> Bulk campaign</Button>
          <Button onClick={openCompose}><MailIcon /> New message</Button>
        </div>
      </div>
      <div className="mail-command-strip">
        <label className="mail-search">
          <SearchIcon />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search sender, recipient, subject or message…" />
        </label>
        <div className="mail-allowance" aria-label={`${allowance?.remaining ?? 300} of 300 recipients remaining today`}>
          <div><span>Daily dispatch allowance</span><strong>{allowance?.remaining ?? "—"} <small>of {allowance?.limit ?? 300} left</small></strong></div>
          <div className="mail-allowance-track"><span style={{ width:`${usagePercent}%` }} /></div>
          <small>{providerAllowance?.source === "brevo" ? "Live Brevo balance" : "Local dispatch ledger"} · resets {allowance ? new Date(allowance.resetsAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) : "at midnight UTC"}</small>
        </div>
      </div>
      <div className="mail-desk-grid">
        <aside className="mail-message-list" aria-label="Email messages">
          <div className="mail-list-stamp">
            <span>{messages?.filter((message) => !message.isRead).length ?? 0} unread</span>
            <b>{filteredMessages.length}{search ? ` of ${messages?.length ?? 0}` : ""} filed</b>
          </div>
          {!messages && <PanelLoading />}
          {messages?.length === 0 && <EmptyCopy text="No routed email has arrived yet. New messages will appear here automatically." />}
          {messages && messages.length > 0 && filteredMessages.length === 0 && <EmptyCopy text="No message matches this search." />}
          {filteredMessages.map((message) => (
            <button
              key={message._id}
              data-active={selected?._id === message._id}
              data-unread={!message.isRead}
              onClick={() => setSelectedId(message._id)}
            >
              <span>{message.direction === "incoming" ? message.fromName || message.fromAddress : `To: ${message.toAddresses.join(", ")}`}</span>
              <strong>{message.subject}</strong>
              <small>{new Date(message.createdAt).toLocaleString()}</small><i className="mail-status-chip" data-status={message.deliveryStatus}>{message.deliveryStatus}</i>
            </button>
          ))}
        </aside>
        <article className="mail-reading-pane">
          {!selected && <EmptyCopy text="Select a message to read it, or start a new conversation." />}
          {selected && (
            <>
              <header>
                <div>
                  <div className="mail-message-flags"><span className="mail-direction">{selected.direction}</span><i className="mail-status-chip" data-status={selected.deliveryStatus}>{selected.deliveryStatus}</i></div>
                  <h2>{selected.subject}</h2>
                  <p>
                    <b>{selected.direction === "incoming" ? "From" : "To"}</b>{" "}
                    {selected.direction === "incoming" ? selected.fromAddress : selected.toAddresses.join(", ")}
                  </p>
                  {selected.ccAddresses.length > 0 && <p><b>Cc</b> {selected.ccAddresses.join(", ")}</p>}
                  {(selected.bccAddresses?.length ?? 0) > 0 && <p><b>Bcc</b> {selected.bccAddresses?.join(", ")}</p>}
                </div>
                <div className="mail-reading-actions">
                  {selected.direction === "incoming" && <Button variant="outline" onClick={() => { setContactDraft({ name:selected.fromName, email:selected.fromAddress, organization:"", notes:`Saved from “${selected.subject}”` }); setContactBookOpen(true) }}><BookUserIcon /> Save contact</Button>}
                  <Button variant="outline" onClick={openReply}><SendIcon /> Reply</Button>
                  <ConfirmDelete label={`mail “${selected.subject}”`} onConfirm={async () => { await deleteMessage({ id:selected._id }); setSelectedId(null); toast.success("Mail history deleted.") }} />
                </div>
              </header>
              <div className="mail-paper-body">{selected.textBody || "This message has no plain-text body."}</div>
              {selected.attachments.length > 0 && (
                <div className="mail-attachments">
                  <b><PaperclipIcon /> Attachments</b>
                  {selected.attachments.map((item) => (
                    <span key={`${item.fileName}-${item.byteSize}`}>{item.fileName} · {Math.ceil(item.byteSize / 1024)} KB</span>
                  ))}
                  <small>Attachment metadata is retained; forwarded copies remain available at the destination inbox.</small>
                </div>
              )}
              <footer>
                <span>Delivery</span>
                <strong className="mail-delivery-status">{selected.deliveryStatus}</strong>
                {selected.direction === "outgoing" && <div className="mail-delivery-breakdown"><span>{selected.deliveredAddresses?.length ?? 0} delivered</span><span>{selected.deferredAddresses?.length ?? 0} deferred</span><span>{selected.failedAddresses?.length ?? 0} failed</span></div>}
                <span>Message ID</span>
                <code>{selected.messageId}</code>
                {(selected.failedAddresses?.length ?? 0) > 0 && <p className="mail-failed-addresses"><b>Failed recipients</b>{selected.failedAddresses?.join(", ")}</p>}
                {selected.deliveryStatus === "failed" && selected.providerResponse && <p className="mail-failure-detail"><b>Failure reason</b>{selected.providerResponse}</p>}
                {selected.sentByEmail && <small>Sent by {selected.sentByEmail}</small>}
              </footer>
            </>
          )}
        </article>
      </div>
      {composeOpen && (
        <div className="mail-compose-layer" role="dialog" aria-modal="true" aria-labelledby="mail-compose-title">
          <form className="mail-compose" onSubmit={sendMessage}>
            <header>
              <div><span>Outbound · Paris Hindu Summit 2026</span><h2 id="mail-compose-title">{draft.mode === "bulk" ? "Prepare bulk campaign" : "Write message"}</h2></div>
              <button type="button" onClick={() => setComposeOpen(false)} aria-label="Close composer">×</button>
            </header>
            <div className="mail-recipient-toolbar"><button type="button" onClick={() => setRecipientBookOpen((value) => !value)}><BookUserIcon /> Choose saved contacts</button><span>{contacts?.length ?? 0} available</span></div>
            {recipientBookOpen && <div className="mail-recipient-book">{contacts?.length === 0 && <small>No contacts saved yet.</small>}{contacts?.map((contact) => <div key={contact._id}><span><strong>{contact.name || contact.email}</strong><small>{contact.email}{contact.organization ? ` · ${contact.organization}` : ""}</small></span><span>{draft.mode === "bulk" ? <button type="button" onClick={() => addRecipient("to", contact.email)}>Add</button> : <><button type="button" onClick={() => addRecipient("to", contact.email)}>To</button><button type="button" onClick={() => addRecipient("cc", contact.email)}>Cc</button><button type="button" onClick={() => addRecipient("bcc", contact.email)}>Bcc</button></>}</span></div>)}</div>}
            <label><span>{draft.mode === "bulk" ? "Recipients" : "To"}</span><Textarea className={draft.mode === "bulk" ? "mail-recipient-field" : ""} value={draft.to} onChange={(event) => setDraft({ ...draft, to:event.target.value })} placeholder={draft.mode === "bulk" ? "Paste emails separated by commas, semicolons or new lines" : "name@example.com"} required /></label>
            {draft.mode === "bulk"
              ? <><div className="mail-recipient-note"><ShieldCheckIcon /> {recipientCount} recipients · addresses are hidden with BCC · {allowance?.remaining ?? 300} available today</div><label className="mail-consent-check"><Checkbox checked={draft.consentConfirmed} onCheckedChange={(value) => setDraft({ ...draft, consentConfirmed:Boolean(value) })} /><span>I confirm these recipients consented to receive summit email.</span></label></>
              : <div className="mail-copy-fields"><label><span>Cc · visible to recipients</span><Textarea value={draft.cc} onChange={(event) => setDraft({ ...draft, cc:event.target.value })} placeholder="One or more addresses" /></label><label><span>Bcc · hidden from recipients</span><Textarea value={draft.bcc} onChange={(event) => setDraft({ ...draft, bcc:event.target.value })} placeholder="One or more addresses" /></label></div>}
            <label><span>Subject</span><Input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject:event.target.value })} required /></label>
            <label className="mail-compose-body"><span>Message</span><Textarea value={draft.text} onChange={(event) => setDraft({ ...draft, text:event.target.value })} onPaste={(event) => { const files = Array.from(event.clipboardData.files); if (files.length > 0) { event.preventDefault(); void addAttachments(files) } }} required /></label>
            <div className="mail-compose-attachments">
              <label className="mail-file-trigger"><PaperclipIcon /><span>Add attachments</span><input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => void addAttachments(event.target.files)} /></label>
              <small>PDF, DOC, DOCX, JPEG, or PNG · up to 5 files and 3 MB total · paste files into the message area.</small>
              {draft.attachments.map((file, index) => <span className="mail-attachment-chip" key={`${file.fileName}-${index}`}>{file.fileName} <small>{Math.ceil(file.byteSize / 1024)} KB</small><button type="button" aria-label={`Remove ${file.fileName}`} onClick={() => setDraft((current) => ({ ...current, attachments:current.attachments.filter((_, itemIndex) => itemIndex !== index) }))}><XIcon /></button></span>)}
            </div>
            <footer><Button type="button" variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button><Button type="submit" disabled={sending || (draft.mode === "bulk" && (recipientCount < 2 || !draft.consentConfirmed))}>{sending ? <Loader2Icon className="animate-spin" /> : draft.mode === "bulk" ? <MegaphoneIcon /> : <SendIcon />} {draft.mode === "bulk" ? `Queue campaign${recipientCount ? ` · ${recipientCount}` : ""}` : "Send message"}</Button></footer>
          </form>
        </div>
      )}
      {contactBookOpen && (
        <div className="mail-compose-layer" role="dialog" aria-modal="true" aria-labelledby="contact-book-title">
          <div className="mail-contact-book">
            <header><div><span>Reusable recipients</span><h2 id="contact-book-title">Contact book</h2></div><button type="button" onClick={() => setContactBookOpen(false)} aria-label="Close contact book">×</button></header>
            <form onSubmit={async (event) => { event.preventDefault(); try { await saveContact(contactDraft); setContactDraft({ name:"", email:"", organization:"", notes:"" }); toast.success("Contact saved.") } catch (error) { toast.error(error instanceof Error ? error.message : "Contact could not be saved.") } }}>
              <Input value={contactDraft.name} onChange={(event) => setContactDraft({ ...contactDraft, name:event.target.value })} placeholder="Name" />
              <Input value={contactDraft.email} onChange={(event) => setContactDraft({ ...contactDraft, email:event.target.value })} placeholder="Email address" type="email" required />
              <Input value={contactDraft.organization} onChange={(event) => setContactDraft({ ...contactDraft, organization:event.target.value })} placeholder="Organization (optional)" />
              <Input value={contactDraft.notes} onChange={(event) => setContactDraft({ ...contactDraft, notes:event.target.value })} placeholder="Private note (optional)" />
              <Button type="submit"><SaveIcon /> Save contact</Button>
            </form>
            <div className="mail-contact-list">
              {contacts?.length === 0 && <EmptyCopy text="Save frequent recipients here for quick access while composing." />}
              {contacts?.map((contact) => <article key={contact._id}><div><strong>{contact.name || contact.email}</strong><span>{contact.email}</span><small>{[contact.organization, contact.notes].filter(Boolean).join(" · ")}</small></div><ConfirmDelete label={contact.name || contact.email} onConfirm={async () => { await removeContact({ id:contact._id }); toast.success("Contact deleted.") }} /></article>)}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function ProgrammeAdmin() {
  const data = useQuery(api.programme.listForAdmin)
  const saveDay = useMutation(api.programme.saveDay)
  const saveSession = useMutation(api.programme.saveSession)
  const publishAllDrafts = useMutation(api.programme.publishAllDrafts)
  const removeDay = useMutation(api.programme.removeDay)
  const removeSession = useMutation(api.programme.removeSession)
  return <section className="admin-panel">
    <PanelTitle eyebrow="Purpose-built schedule" title="Days, sessions and public navigation." copy="Changes update the programme tabs and navigation menu without a frontend deployment. Only records marked published appear on the public site." />
    <Button className="admin-publish-programme" variant="outline" onClick={async () => {
      try {
        const result = await publishAllDrafts()
        toast.success(`Published ${result.daysPublished} days and ${result.sessionsPublished} sessions.`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "The programme could not be published.")
      }
    }}><CheckCircle2Icon /> Publish all programme drafts</Button>
    <RecordCards title="Programme days" copy="Control day labels, dates, summaries, order and publication. Draft days remain private." rows={data?.days.map((row) => ({ ...row, name:row.tabLabel }))} fields={["slug","tabLabel","navigationLabel","dateLabel","summary","order","status"]} blank={{ slug:"",tabLabel:"",navigationLabel:"",dateLabel:"",summary:"",order:50,status:"draft" }} onSave={saveDay} onRemove={removeDay} />
    {data?.days.length === 0 && <EmptyCopy text="Create a programme day before adding sessions." />}
    {data?.days.map((day) => (
      <RecordCards
        key={day._id}
        title={`${day.tabLabel} sessions`}
        copy={`Only sessions assigned to ${day.tabLabel} · ${day.dateLabel} appear here. The day assignment is locked automatically; draft sessions remain private.`}
        rows={data.sessions
          .filter((row) => row.daySlug === day.slug)
          .map((row) => ({ ...row, name:row.title }))}
        fields={["slug","startTime","endTime","title","description","tag","speakers","location","order","status"]}
        blank={{ daySlug:day.slug,slug:"",startTime:"",endTime:"",title:"",description:"",tag:"",speakers:"",location:"",order:50,status:"draft" }}
        onSave={(args) => saveSession({ ...args, daySlug:day.slug })}
        onRemove={removeSession}
      />
    ))}
  </section>
}

function ForumPackagesAdmin() {
  const entries = useQuery(api.cms.listForAdmin, { category:"forumPackage" })
  const save = useMutation(api.cms.save)
  const remove = useMutation(api.cms.remove)
  const rowsFor = (parentSlug:"accommodation" | "sponsorship") => entries
    ?.filter((entry) => entry.parentSlug === parentSlug)
    .map((entry) => ({
      _id:entry._id, parentSlug, slug:entry.slug, title:entry.title,
      dateLabel:entry.dateLabel, summary:entry.summary, body:entry.body,
      secondaryText:entry.secondaryText, order:entry.order, status:entry.status,
      name:entry.title,
    }))
  const savePackage = (parentSlug:"accommodation" | "sponsorship") => async (args:any) => save({
    ...(args.id ? { id:args.id } : {}),
    category:"forumPackage", parentSlug, slug:args.slug, title:args.title,
    eyebrow:parentSlug === "accommodation" ? "Accommodation" : "Partnership & Sponsorship",
    summary:args.summary, body:args.body, secondaryText:args.secondaryText,
    country:"", role:"", email:"", phone:"", linkLabel:"", linkUrl:"",
    dateLabel:args.dateLabel, timeLabel:"", order:args.order,
    status:args.status, featured:false,
  })
  const fields = ["slug","title","dateLabel","summary","body","secondaryText","order","status"]
  return <section className="admin-panel">
    <PanelTitle eyebrow="Package catalogue" title="Accommodation and partnership pricing." copy="Every published package appears immediately on the public Forum Packages pages. Use one line per included or excluded feature." />
    <RecordCards title="Accommodation packages" copy="Edit hotel level, total price, inclusions, exclusions and display order." rows={rowsFor("accommodation")} fields={fields} blank={{ parentSlug:"accommodation",slug:"",title:"",dateLabel:"",summary:"",body:"",secondaryText:"",order:50,status:"draft" }} onSave={savePackage("accommodation")} onRemove={remove} />
    <RecordCards title="Partnership & sponsorship packages" copy="Edit contribution levels, availability, benefits and display order." rows={rowsFor("sponsorship")} fields={fields} blank={{ parentSlug:"sponsorship",slug:"",title:"",dateLabel:"",summary:"",body:"",secondaryText:"",order:50,status:"draft" }} onSave={savePackage("sponsorship")} onRemove={remove} />
  </section>
}

function ChartsAdmin() {
  const data = useQuery(api.charts.listForAdmin)
  const saveSeries = useMutation(api.charts.saveSeries)
  const savePoint = useMutation(api.charts.savePoint)
  const removeSeries = useMutation(api.charts.removeSeries)
  const removePoint = useMutation(api.charts.removePoint)
  return <section className="admin-panel">
    <PanelTitle eyebrow="Accessible evidence" title="Chart series, sources and numeric points." copy="This editor now previews the live Population Share and Displacement charts on the homepage." />
    <RecordCards title="Chart series" copy="Titles, context, units and source citations." rows={data?.series.map((row) => ({ ...row, name:row.title }))} fields={["slug","title","eyebrow","description","sourceLabel","sourceUrl","unit","order","status"]} blank={{ slug:"",title:"",eyebrow:"",description:"",sourceLabel:"",sourceUrl:"",unit:"",order:50,status:"draft" }} onSave={saveSeries} onRemove={removeSeries} />
    <RecordCards title="Chart points" copy="Editable periods and validated non-negative numeric values." rows={data?.points.map((row) => ({ ...row, name:row.label }))} fields={["seriesSlug","label","sublabel","value","order"]} blank={{ seriesSlug:data?.series[0]?.slug ?? "population-share",label:"",sublabel:"",value:0,order:50 }} onSave={savePoint} onRemove={removePoint} />
  </section>
}

function DonationsPanel() {
  const donations = useQuery(api.admin.listDonations)
  const tiers = useQuery(api.donations.listTiersForAdmin)
  const saveTier = useMutation(api.donations.saveTier)
  const total = useMemo(() => donations?.filter((d) => d.status === "paid" || d.status === "demo").reduce((sum, d) => sum + d.amountCents, 0) ?? 0, [donations])
  return (
    <section className="admin-panel">
      <PanelTitle eyebrow="Donation readiness" title="SSLCOMMERZ selected for launch." copy="Contributions remain in demonstration mode while the approved SSLCOMMERZ merchant account and live integration are completed." />
      <div className="donation-total"><span>Recorded volume</span><b>€{(total / 100).toLocaleString()}</b><small>paid + demo</small></div>
      <h3 className="admin-subhead">Donation levels</h3>
      <div className="tier-grid">
        {tiers?.map((tier) => <TierEditor key={tier._id} tier={tier} onSave={saveTier} />)}
      </div>
      <h3 className="admin-subhead">Contribution ledger</h3>
      <div className="admin-list">
        {donations?.length === 0 && <EmptyCopy text="No contributions recorded yet." />}
        {donations?.map((item) => <div key={item._id}><Badge>{item.status}</Badge><b>{item.donorName || "Anonymous"}</b><span>{item.reference}</span><strong>€{(item.amountCents/100).toFixed(2)}</strong></div>)}
      </div>
    </section>
  )
}

function TierEditor({ tier, onSave }: { tier:any; onSave:(args:any)=>Promise<any> }) {
  const [draft, setDraft] = useState(tier)
  return <article>
    <div className="tier-card-top"><Badge variant="outline">{draft.status}</Badge><Switch checked={draft.status === "published"} onCheckedChange={(value) => setDraft({ ...draft, status:value ? "published" : "draft" })} /></div>
    <Field label="Tier label" value={draft.label} onValueChange={(value) => setDraft({ ...draft, label:value })} />
    {!draft.customAmount && <Field label="Euro amount" type="number" value={String((draft.amountCents ?? 0)/100)} onValueChange={(value) => setDraft({ ...draft, amountCents:Math.round(Number(value)*100) })} />}
    <Field label="Description" value={draft.description} multiline onValueChange={(value) => setDraft({ ...draft, description:value })} />
    <Field label="Stripe price ID (optional)" value={draft.stripePriceId ?? ""} onValueChange={(value) => setDraft({ ...draft, stripePriceId:value || undefined })} />
    <Button variant="outline" onClick={async () => { const { _creationTime, updatedAt, ...value } = draft; void _creationTime; void updatedAt; await onSave({ ...value, id:tier._id }); toast.success(`${draft.label} updated.`) }}><SaveIcon /> Save tier</Button>
  </article>
}

function AssetsPanel() {
  const assets = useQuery(api.assets.list)
  const uploadUrl = useMutation(api.assets.generateUploadUrl)
  const register = useMutation(api.assets.register)
  const remove = useMutation(api.assets.remove)
  async function upload(file: File) {
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".pdf"]
    if (!allowedExtensions.some((extension) => file.name.toLowerCase().endsWith(extension))) {
      throw new Error("Choose a JPEG, PNG, WebP, AVIF, or PDF file.")
    }
    if (file.type.startsWith("image/")) {
      const bitmap = await createImageBitmap(file)
      if (bitmap.width < 320 || bitmap.height < 180) {
        bitmap.close()
        throw new Error("Images must be at least 320 × 180 pixels.")
      }
      bitmap.close()
    }
    const url = await uploadUrl()
    const response = await fetch(url, { method:"POST", headers:{ "Content-Type":file.type }, body:file })
    if (!response.ok) throw new Error("Convex rejected the upload. Please try again.")
    const payload = (await response.json()) as { storageId: Id<"_storage"> }
    const { storageId } = payload
    await register({ storageId, fileName:file.name, mimeType:file.type, byteSize:file.size, altText:file.name.replace(/\.[^.]+$/, ""), category:file.type === "application/pdf" ? "document" : "general" })
    toast.success("Asset uploaded to Convex.")
  }
  return (
    <section className="admin-panel">
      <PanelTitle eyebrow="Convex file storage" title="A single source for images and documents." copy="Upload JPEG, PNG, WebP, AVIF or PDF files up to 20 MB. Managed URLs can be attached to content records." />
      <AdminFileUpload
        accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
        title="Drop or choose an approved file"
        description="Images and PDF · maximum 20 MB"
        onUpload={upload}
      />
      <div className="asset-grid">{assets?.map((asset) => <article key={asset._id}>{asset.url && asset.mimeType.startsWith("image/") ? <img src={asset.url} alt={asset.altText} /> : <div><FileTextIcon /></div>}<b>{asset.fileName}</b><small>{(asset.byteSize/1_000_000).toFixed(1)} MB</small><button onClick={() => remove({ id:asset._id })}>Remove</button></article>)}</div>
    </section>
  )
}

function AuditPanel() {
  const rows = useQuery(api.admin.listAuditEvents)
  return <section className="admin-panel"><PanelTitle eyebrow="Accountability" title="Editorial activity log." copy="Important content, file and inbox actions leave a timestamped record." /><div className="audit-timeline">{rows?.map((row) => <article key={row._id}><span /><div><Badge variant="outline">{row.entityType}</Badge><h3>{row.summary}</h3><p>{row.actorEmail} · {new Date(row.createdAt).toLocaleString()}</p></div></article>)}</div></section>
}

function ConfirmDelete({ label, onConfirm }: { label:string; onConfirm:()=>Promise<void> }) {
  return <AlertDialog><AlertDialogTrigger render={<Button variant="destructive" />}>Delete</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {label}?</AlertDialogTitle><AlertDialogDescription>This removes the record from Convex. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep record</AlertDialogCancel><AlertDialogAction onClick={() => void onConfirm()}>Delete permanently</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
}

function Field({ label, multiline, onValueChange, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label:string; multiline?:boolean; onValueChange?:(value:string)=>void }) {
  const shared = { name:props.name, value:props.value, defaultValue:props.defaultValue, required:props.required, placeholder:props.placeholder, onChange:(event:React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onValueChange?.(event.target.value) }
  return <label className={`admin-field ${multiline ? "wide" : ""}`}><span>{label}</span>{multiline ? <Textarea {...shared} /> : <Input {...props} onChange={shared.onChange as React.ChangeEventHandler<HTMLInputElement>} />}</label>
}

function AdminRecordSelect({
  label,
  value,
  createLabel,
  records,
  onChange,
}: {
  label:string
  value:string
  createLabel?:string
  records:Array<{ value:string; label:string }>
  onChange:(value:string)=>void
}) {
  return (
    <label className="admin-field admin-record-select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {createLabel && <option value="new">{createLabel}</option>}
        {records.map((record) => (
          <option value={record.value} key={record.value}>{record.label}</option>
        ))}
      </select>
    </label>
  )
}
function PasswordField({
  id,
  label,
  visible,
  onToggle,
  describedBy,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id:string
  label:string
  visible:boolean
  onToggle:()=>void
  describedBy?:string
}) {
  return (
    <div className="admin-field admin-password-field">
      <label htmlFor={id}>{label}</label>
      <div className="admin-password-control">
        <Input
          {...props}
          id={id}
          type={visible ? "text" : "password"}
          minLength={10}
          required
          aria-describedby={describedBy}
        />
        <button
          type="button"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={onToggle}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  )
}
function PanelTitle({ eyebrow, title, copy }: { eyebrow:string; title:string; copy?:string }) { return <header className="admin-panel-title"><p className="admin-kicker">{eyebrow}</p><h2>{title}</h2>{copy && <p>{copy}</p>}</header> }
function PanelLoading() { return <div className="admin-loading"><Spinner /> Reading the live workspace…</div> }
function FullScreenStatus({ label }: { label:string }) { return <main className="admin-auth"><div className="admin-loading"><Spinner />{label}</div></main> }
function EmptyCopy({ text }: { text:string }) { return <div className="admin-empty"><CheckCircle2Icon /><p>{text}</p></div> }
function humanize(value:string) { return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()) }

export function AdminPortal() {
  return (
    <>
      <ThemeToggle className="admin-global-theme-toggle" />
      <AuthGate />
    </>
  )
}
