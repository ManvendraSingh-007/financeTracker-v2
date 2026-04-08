"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
} from "recharts"
import {
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
  TargetIcon,
  PiggyBankIcon,
  CircleAlertIcon,
} from "lucide-react"

import { apiFetch } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

type AnalyticsResponse = {
  summary: {
    total_income: number
    total_expense: number
    balance: number
    burn_rate: number
  }
  category_breakdown: {
    category: string
    value: number
  }[]
  daily_cashflow: {
    date: string
    daily_net: number
  }[]
}

type Budget = {
  budget_id: number
  category: string
  amount_limit: number
  current_spent: number
  remaining: number
  over_budget: boolean
  month: number
  year: number
}

type SavingsGoal = {
  goal_id: number
  goal_name: string
  target_amount: number
  current_amount: number
  target_date: string
  icon: string
  status: string
  progress_percent: number
  days_remaining: number
  monthly_requirement: number
}

const pieColors = [
  "var(--color-pie_1)",
  "var(--color-pie_2)",
  "var(--color-pie_3)",
  "var(--color-pie_4)",
  "var(--color-pie_5)",
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function AnalyticsManager() {
  const [analytics, setAnalytics] = React.useState<AnalyticsResponse | null>(null)
  const [budgets, setBudgets] = React.useState<Budget[]>([])
  const [goals, setGoals] = React.useState<SavingsGoal[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    async function loadAnalytics() {
      setIsLoading(true)
      setError("")

      try {
        const now = new Date()
        const month = now.getMonth() + 1
        const year = now.getFullYear()

        const [analyticsResponse, budgetsResponse, savingsResponse] = await Promise.all([
          apiFetch("/analytics/summary"),
          apiFetch(`/budgets?month=${month}&year=${year}`),
          apiFetch("/savings"),
        ])

        const analyticsPayload = await analyticsResponse.json()
        const budgetsPayload = await budgetsResponse.json()
        const savingsPayload = await savingsResponse.json()

        if (!analyticsResponse.ok) {
          setError(analyticsPayload.error ?? "Could not fetch analytics")
          return
        }
        if (!budgetsResponse.ok) {
          setError(budgetsPayload.error ?? "Could not fetch budgets")
          return
        }
        if (!savingsResponse.ok) {
          setError(savingsPayload.error ?? "Could not fetch savings goals")
          return
        }

        setAnalytics(analyticsPayload as AnalyticsResponse)
        setBudgets((budgetsPayload.budgets as Budget[]) ?? [])
        setGoals((savingsPayload.goals as SavingsGoal[]) ?? [])
      } catch {
        setError("Could not fetch analytics")
      } finally {
        setIsLoading(false)
      }
    }

    void loadAnalytics()
  }, [])

  const topCategories = React.useMemo(
    () => analytics?.category_breakdown.slice(0, 5) ?? [],
    [analytics]
  )

  const chartData = React.useMemo(
    () =>
      (analytics?.daily_cashflow ?? []).map((item) => ({
        ...item,
        shortDate: new Date(item.date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        }),
      })),
    [analytics]
  )

  const budgetPerformance = React.useMemo(
    () =>
      budgets.slice(0, 6).map((budget) => ({
        category: budget.category.length > 10 ? `${budget.category.slice(0, 10)}...` : budget.category,
        spent: budget.current_spent,
        limit: budget.amount_limit,
      })),
    [budgets]
  )

  const savingsSummary = React.useMemo(() => {
    const totalTarget = goals.reduce((sum, goal) => sum + goal.target_amount, 0)
    const totalCurrent = goals.reduce((sum, goal) => sum + goal.current_amount, 0)
    const completedGoals = goals.filter((goal) => goal.status === "completed").length
    const averageProgress =
      goals.length > 0
        ? goals.reduce((sum, goal) => sum + goal.progress_percent, 0) / goals.length
        : 0

    return {
      totalTarget,
      totalCurrent,
      completedGoals,
      averageProgress,
    }
  }, [goals])

  const insights = React.useMemo(() => {
    const overBudgetCount = budgets.filter((budget) => budget.over_budget).length
    const topSpendingCategory = topCategories[0]
    const closestGoal = goals
      .filter((goal) => goal.progress_percent < 100)
      .sort((a, b) => b.progress_percent - a.progress_percent)[0]

    return [
      topSpendingCategory
        ? {
          title: "Top expense category",
          message: `${topSpendingCategory.category} is your highest spend at ${formatCurrency(
            topSpendingCategory.value
          )}.`,
          tone: "neutral",
        }
        : null,
      overBudgetCount > 0
        ? {
          title: "Budget attention needed",
          message: `${overBudgetCount} budget ${overBudgetCount === 1 ? "is" : "are"} over limit this month.`,
          tone: "warning",
        }
        : {
          title: "Budgets on track",
          message: "No budget has crossed its limit this month.",
          tone: "positive",
        },
      closestGoal
        ? {
          title: "Closest savings goal",
          message: `${closestGoal.goal_name} is ${Math.round(
            closestGoal.progress_percent
          )}% complete.`,
          tone: "positive",
        }
        : null,
    ].filter(Boolean) as { title: string; message: string; tone: string }[]
  }, [budgets, goals, topCategories])

  if (isLoading) {
    return (
      <div className="px-4 py-6 lg:px-6">
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Loading analytics...
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="px-4 py-6 lg:px-6">
        <Card>
          <CardContent className="py-10 text-sm text-rose-400">
            {error || "Could not load analytics"}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Monthly Income</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatCurrency(analytics.summary.total_income)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUpIcon />
                Inflow
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2 font-medium">
              Cash received this month <TrendingUpIcon className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Based on income transactions
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Monthly Expense</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatCurrency(analytics.summary.total_expense)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingDownIcon />
                Outflow
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2 font-medium">
              Outgoing spend this month <TrendingDownIcon className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Includes all expense transactions
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Net Balance</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatCurrency(analytics.summary.balance)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <WalletIcon />
                Net
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2 font-medium">
              Income minus expense <WalletIcon className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Current month position
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Savings Progress</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {Math.round(savingsSummary.averageProgress)}%
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <PiggyBankIcon />
                Goals
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2 font-medium">
              {savingsSummary.completedGoals} completed goals <TargetIcon className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Across {goals.length} active and completed goals
            </div>
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-4 px-4 lg:px-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>30-Day Cashflow Trend</CardTitle>
            <CardDescription>Daily net movement from the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[320px] w-full"
              config={{
                daily_net: {
                  label: "Net Cashflow",
                  color: "#e5e7eb",
                },
              }}
            >
              <AreaChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="shortDate"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                  type="monotone"
                  dataKey="daily_net"
                  stroke="var(--color-daily_net)"
                  fill="var(--color-daily_net)"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending Mix</CardTitle>
            <CardDescription>Top expense categories by value</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ChartContainer
              className="mx-auto h-[240px] max-w-[280px]"
              config={{
                pie_1: { label: "One", color: "var(--primary)" },
                pie_2: { label: "Two", color: "var(--chart-2)" },
                pie_3: { label: "Three", color: "var(--chart-3)" },
                pie_4: { label: "Four", color: "var(--chart-4)" },
                pie_5: { label: "Five", color: "var(--chart-5)" },
              }}
            >
              <PieChart>
                <Pie
                  data={topCategories}
                  dataKey="value"
                  nameKey="category"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                >
                  {topCategories.map((entry, index) => (
                    <Cell key={entry.category} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
              </PieChart>
            </ChartContainer>

            <div className="space-y-3">
              {topCategories.map((item, index) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: pieColors[index % pieColors.length] }}
                    />
                    <span className="text-sm">{item.category}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 px-4 lg:px-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Budget Performance</CardTitle>
            <CardDescription>Compare spending against monthly limits</CardDescription>
          </CardHeader>
          <CardContent>
            {budgetPerformance.length > 0 ? (
              <ChartContainer
                className="h-[320px] w-full"
                config={{
                  spent: {
                    label: "Spent",
                    color: "#9ca3af",
                  },
                  limit: {
                    label: "Limit",
                    color: "#f3f4f6",
                  },
                }}
              >
                <BarChart data={budgetPerformance}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="category"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                  <Bar dataKey="spent" fill="var(--color-spent)" radius={4} />
                  <Bar dataKey="limit" fill="var(--color-limit)" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="py-10 text-sm text-muted-foreground">
                No budgets available yet for comparison.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
            <CardDescription>Quick reads from your financial activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.title}
                className="rounded-lg border px-4 py-3"
              >
                <div className="flex items-center gap-2 font-medium">
                  {insight.tone === "warning" ? (
                    <CircleAlertIcon className="size-4 text-amber-500" />
                  ) : insight.tone === "positive" ? (
                    <TrendingUpIcon className="size-4 text-emerald-500" />
                  ) : (
                    <WalletIcon className="size-4 text-muted-foreground" />
                  )}
                  {insight.title}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {insight.message}
                </p>
              </div>
            ))}

            <div className="rounded-lg border px-4 py-3">
              <div className="font-medium">Savings Snapshot</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatCurrency(savingsSummary.totalCurrent)} saved out of{" "}
                {formatCurrency(savingsSummary.totalTarget)} total goal targets.
              </p>
            </div>

            <div className="rounded-lg border px-4 py-3">
              <div className="font-medium">Burn Rate</div>
              <p className="mt-1 text-sm text-muted-foreground">
                You are spending {Math.round(analytics.summary.burn_rate)}% of this
                month&apos;s income.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
