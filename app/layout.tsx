import type { Metadata } from "next"
import { Bodoni_Moda, Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import "./assembly-theme.css"
import { ConvexClientProvider } from "@/components/convex-client-provider"
import { AnimatedToastProvider } from "@/components/motion/animated-toast-provider"
import { RouteChrome } from "@/components/site/route-chrome"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Analytics } from "@vercel/analytics/next"

const bodyFont = Inter({ subsets: ["latin"], variable: "--font-body-family" })
const displayFont = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-display-family",
})
const utilityFont = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-utility-family",
})

export const metadata: Metadata = {
  title: {
    default: "Paris Hindu Summit · 2026",
    template: "%s · Paris Hindu Summit",
  },
  description:
    "Global Solidarity Summit for Bangladeshi Hindus, 3–4 October 2026 in Paris, France.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        bodyFont.variable,
        displayFont.variable,
        utilityFont.variable
      )}
    >
      <body>
        <ConvexClientProvider>
          <ThemeProvider>
            <TooltipProvider>
              <RouteChrome>{children}</RouteChrome>
              <AnimatedToastProvider />
            </TooltipProvider>
          </ThemeProvider>
        </ConvexClientProvider>
        <Analytics />
      </body>
    </html>
  )
}
