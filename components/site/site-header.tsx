"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MenuIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { useApi } from "@/lib/api"
import { useEditorialRecord } from "@/components/site/managed-editorial"
import { ThemeToggle } from "@/components/site/theme-toggle"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"

function Brand({
  name = "Paris Hindu Summit",
  logoUrl,
}: {
  name?: string
  logoUrl?: string | null
}) {
  const copy = useEditorialRecord("global-brand", {
    title:"Global Forum on Religious Freedom and Hindu Minority Rights",
  })
  return (
    <span className="brand-lockup">
      <Image
        className="brand-mark"
        src={logoUrl || "/images/witness-flame-logo.png"}
        alt=""
        width={44}
        height={44}
        aria-hidden="true"
      />
      <span>
        <b>{name}</b>
        <small>{copy.title}</small>
      </span>
    </span>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const settings = useApi("/settings")
  const programme = useApi("/programme")
  const engage = useApi("/cms/published", { category: "engage" })
  const media = useApi("/media")
  const brandCopy = useEditorialRecord("global-brand", {
    title:"Global Forum on Religious Freedom and Hindu Minority Rights",
  })
  useEffect(() => {
    if (!settings?.faviconUrl) return
    const links = document.querySelectorAll<HTMLLinkElement>(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
    )
    links.forEach((link) => {
      link.href = settings.faviconUrl || link.href
    })
  }, [settings?.faviconUrl])
  const chromeLoading =
    settings === undefined ||
    programme === undefined ||
    engage === undefined ||
    media === undefined ||
    brandCopy.isLoading

  if (chromeLoading) {
    return (
      <>
        <div className="announcement-strip chrome-loading" aria-hidden="true">
          <span className="content-skeleton" />
        </div>
        <header className="site-header has-announcement chrome-loading" aria-busy="true">
          <span className="content-skeleton chrome-loading-brand" />
          <span className="content-skeleton chrome-loading-nav" />
          <span className="content-skeleton chrome-loading-action" />
        </header>
      </>
    )
  }
  const aboutLinks = [
    ["/about", "Overview"], ["/committee", "Organising Committee"],
    ["/advisory-board", "Advisory Board"],
    ["/agenda", "Proposed agenda"], ["/resolution", "Paris Resolution 2026"],
    ["/strategy", "Five-year strategy"], ["/partnership-framework", "International partnerships"],
  ]
  const programmeLinks = [
    ...(programme?.map((item) => [`/programme#${item.slug}`, `${item.tabLabel} · ${item.navigationLabel}`]) ?? [["/programme", "Full programme"]]),
    ["/programme/honor-the-victims", "Oct 5 - Honor the Victims"],
  ]
  const navGroups = [
    ["About", aboutLinks],
    ["Programme", programmeLinks],
    [settings?.forumPackagesMenuLabel || "Forum Packages", [["/forum-packages/accommodation", "Accommodation Package"], ["/forum-packages/partnership-sponsorship", "Partnership & Sponsorship"]]],
    ["Media & Publication", [
      ["/media#statements", "Statements"],
      ...(media
        ?.filter((section) => section.slug !== "statements")
        .map((section) => [`/media#${section.slug}`, section.name]) ?? []),
    ]],
    ["Attend and Support", engage?.map((item) => [item.linkUrl || "/engage", item.title]) ?? [["/engage", "Ways to attend and support"]]],
  ] as const

  return (
    <>
    {settings?.announcementEnabled !== false && <div className="announcement-strip"><span>{settings?.announcement || "Registration is open now."}</span>{settings?.registrationOpen !== false && <Link href="/participate">Register now</Link>}</div>}
    <header className={cn("site-header", settings?.announcementEnabled !== false && "has-announcement")}>
      <Link href="/" aria-label="Paris Hindu Summit home">
        <Brand name={settings?.shortName} logoUrl={settings?.logoUrl} />
      </Link>
      <NavigationMenu className="desktop-nav" aria-label="Main navigation">
        <NavigationMenuList>
          {navGroups.map(([label, links]) => <NavigationMenuItem key={label}>
            <NavigationMenuTrigger>{label}</NavigationMenuTrigger>
            <NavigationMenuContent><ul className="summit-nav-panel">{links.map(([href,title]) => <li key={`${href}-${title}`}><NavigationMenuLink render={<Link href={href} />}><b>{title}</b></NavigationMenuLink></li>)}</ul></NavigationMenuContent>
          </NavigationMenuItem>)}
          <NavigationMenuItem><NavigationMenuLink render={<Link href="/speakers" />} className={cn(pathname === "/speakers" && "active")}>Speakers</NavigationMenuLink></NavigationMenuItem>
          <NavigationMenuItem><NavigationMenuLink render={<Link href="/regional" />} className={cn(pathname === "/regional" && "active")}>Regional</NavigationMenuLink></NavigationMenuItem>
          <NavigationMenuItem><NavigationMenuLink render={<Link href="/faq" />} className={cn(pathname === "/faq" && "active")}>FAQ</NavigationMenuLink></NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
      <ThemeToggle />
      {settings?.registrationOpen !== false && (
        <Button nativeButton={false} variant="outline" render={<Link href="/participate" />} className="header-secondary-action">
          Register
        </Button>
      )}
      {settings?.donationsEnabled !== false && (
        <Button nativeButton={false} render={<Link href="/donate" />} className="header-action">
          Donate
        </Button>
      )}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className="mobile-menu"
              aria-label="Open navigation"
            />
          }
        >
          <MenuIcon />
        </SheetTrigger>
        <SheetContent className="mobile-sheet">
          <SheetHeader>
            <SheetTitle><Brand name={settings?.shortName} logoUrl={settings?.logoUrl} /></SheetTitle>
            <SheetDescription>{brandCopy.title}</SheetDescription>
          </SheetHeader>
          <nav aria-label="Mobile navigation">
            {[
              { href: "/", label: "Home" },
              { href:"/about", label:"Overview" },
              { href:"/programme", label:"Programme" },
              { href:"/programme/honor-the-victims", label:"Oct 5 - Honor the Victims" },
              { href:"/forum-packages/accommodation", label:"Accommodation Package" },
              { href:"/forum-packages/partnership-sponsorship", label:"Partnership & Sponsorship" },
              ...aboutLinks.slice(1).map(([href,label]) => ({ href,label })),
              { href:"/speakers",label:"Speakers" },
              { href:"/regional",label:"Regional" },
              { href:"/partners",label:"Partners" },
              { href:"/media",label:"Media & Publication" },
              { href:"/media#statements",label:"Statements" },
              { href:"/engage",label:"Attend and Support" },
              { href:"/faq",label:"FAQ" },
              ...(settings?.registrationOpen !== false ? [{ href: "/participate", label: "Reserve a place" }] : []),
              ...(settings?.donationsEnabled !== false ? [{ href: "/donate", label: "Donate" }] : []),
            ].map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
    </>
  )
}
