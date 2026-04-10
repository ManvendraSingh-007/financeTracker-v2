import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Geist_Mono, Inter } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL("https://finance-tracker-v2-five.vercel.app"),
  title: {
    default: "Finance Tracker | Expense Tracking, Budgets, Savings and Analytics",
    template: "%s | Finance Tracker",
  },
  description:
    "Finance Tracker is a personal finance app for tracking expenses, managing budgets, monitoring savings goals, and understanding cashflow in one dashboard.",
  keywords: [
    "finance tracker",
    "expense tracker",
    "personal finance app",
    "budget tracker",
    "budget planner",
    "savings tracker",
    "cashflow dashboard",
    "expense management",
    "money management app",
    "personal budgeting tool",
  ],
  applicationName: "Finance Tracker",
  category: "finance",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://finance-tracker-v2-five.vercel.app",
    title: "Finance Tracker | Expense Tracking, Budgets, Savings and Analytics",
    description:
      "Track expenses, manage budgets, build savings goals, and review analytics from one personal finance dashboard.",
    siteName: "Finance Tracker",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finance Tracker",
    description:
      "Track expenses, budgets, savings goals, and personal cashflow in one clean dashboard.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider>{children}</TooltipProvider>
        <Analytics />
      </body>
    </html>
  )
}
