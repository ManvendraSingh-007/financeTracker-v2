import Link from "next/link"
import {
  ArrowRightIcon,
  ChartColumnIncreasingIcon,
  DotIcon,
  PiggyBankIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const highlights = [
  {
    title: "Track every transaction",
    description:
      "Log income and expenses, keep descriptions, and maintain a clean searchable history.",
    icon: ChartColumnIncreasingIcon,
  },
  {
    title: "See patterns clearly",
    description:
      "Turn raw numbers into analytics, category breakdowns, and a useful financial pulse.",
    icon: ChartColumnIncreasingIcon,
  },
  {
    title: "Build goals with intent",
    description:
      "Use budgets and savings targets to make your monthly plan feel concrete and actionable.",
    icon: PiggyBankIcon,
  },
]

const quickStats = [
  { label: "Monthly Income", value: "$4,800", tone: "text-emerald-500" },
  { label: "Monthly Expense", value: "$2,940", tone: "text-foreground" },
  { label: "Saved This Month", value: "$1,150", tone: "text-primary" },
]

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-background">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(120,119,198,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.10),transparent_24%),linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_25%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.12),transparent_22%),linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_28%)]" />

      <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div className="flex items-center gap-3">
            <div className="relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-emerald-500 text-primary-foreground shadow-sm ring-1 ring-primary/20">
              <ChartColumnIncreasingIcon className="size-5" />
              <DotIcon className="absolute -right-1 -top-1 size-5 text-emerald-300" />
            </div>
            <div>
              <p className="text-sm font-semibold">Finance Tracker</p>
              <p className="text-xs text-muted-foreground">
                Personal money control without the clutter
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Create account</Link>
            </Button>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
          <div className="space-y-8">
            <div className="space-y-5">
              <Badge variant="outline" className="gap-2 px-3 py-1">
                <ShieldCheckIcon className="size-3.5" />
                Built for daily budgeting, saving, and review
              </Badge>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                  Know where your money goes, and where it should go next.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  A focused finance dashboard for tracking transactions,
                  setting budgets, growing savings goals, and understanding
                  your cashflow without spreadsheet chaos.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <span>Get Started</span>
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/auth/login">I already have an account</Link>
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {highlights.map(({ title, description, icon: Icon }) => (
                <Card key={title} className="border-border/70 bg-card/70 backdrop-blur">
                  <CardHeader className="pb-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
                      <Icon className="size-5 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base">{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm leading-6 text-muted-foreground">
                    {description}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-primary/10 via-transparent to-emerald-500/10 blur-2xl" />
            <Card className="relative overflow-hidden rounded-[2rem] border-border/70 bg-card/85 shadow-2xl backdrop-blur">
              <CardHeader className="border-b border-border/60 pb-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Dashboard Preview</p>
                    <CardTitle className="mt-2 text-2xl">
                      Financial Pulse
                    </CardTitle>
                  </div>
                  <Badge className="rounded-full px-3 py-1">Live View</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 p-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  {quickStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-border/70 bg-background/70 p-4"
                    >
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className={`mt-3 text-2xl font-semibold ${stat.tone}`}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/70 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Savings Goal</p>
                      <p className="text-sm text-muted-foreground">
                        Emergency Fund
                      </p>
                    </div>
                    <Badge variant="outline">68%</Badge>
                  </div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[68%] rounded-full bg-primary" />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                    <span>$3,400 saved</span>
                    <span>$5,000 target</span>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-border/70 bg-background/70 p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Recent Activity</p>
                    <span className="text-sm text-muted-foreground">
                      This Week
                    </span>
                  </div>

                  {[
                    ["Salary credited", "+$2,800", "text-emerald-500"],
                    ["Groceries", "-$92", "text-foreground"],
                    ["Savings contribution", "-$300", "text-primary"],
                  ].map(([label, value, tone]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-3"
                    >
                      <span className="text-sm">{label}</span>
                      <span className={`text-sm font-medium ${tone}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  )
}
