"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CircleAlertIcon,
  PiggyBankIcon,
  WalletIcon,
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
import { useDashboardUser } from "@/components/dashboard-user-provider"
import { formatCurrency } from "@/lib/currency"

type OverviewResponse = {
  summary: {
    total_balance: number
    monthly_spending: number
    savings_current: number
    savings_target: number
    savings_progress: number
  }
  cashflow: {
    date: string
    income: number
    expense: number
  }[]
  recent_transactions: {
    id: number
    title: string
    category: string
    transaction_type: string
    amount: number
    description: string
    transaction_date: string
  }[]
  top_goals: {
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
  }[]
  insights: {
    title: string
    message: string
  }[]
  has_data: boolean
}

export function OverviewManager() {
  const { currencyPreference } = useDashboardUser()
  const [data, setData] = React.useState<OverviewResponse | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    async function loadOverview() {
      setIsLoading(true)
      setError("")

      try {
        const response = await apiFetch("/dashboard/overview")
        const payload = await response.json()

        if (!response.ok) {
          setError(payload.error ?? "Could not fetch overview")
          return
        }

        setData(payload as OverviewResponse)
      } catch {
        setError("Could not fetch overview")
      } finally {
        setIsLoading(false)
      }
    }

    void loadOverview()
  }, [])

  if (isLoading) {
    return (
      <div className="px-4 py-6 lg:px-6">
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Loading overview...
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="px-4 py-6 lg:px-6">
        <Card>
          <CardContent className="py-10 text-sm text-rose-400">
            {error || "Could not load overview"}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data.has_data) {
    return (
      <div className="px-4 py-6 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Your dashboard will light up as soon as you start using the app.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Add transactions, budgets, or savings goals to unlock charts, insights, and recent activity here.
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
            <CardDescription>Total Balance</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatCurrency(data.summary.total_balance, currencyPreference)}
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
              Live financial position <WalletIcon className="size-4" />
            </div>
            <div className="text-muted-foreground">Income minus expense</div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Monthly Spending</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatCurrency(data.summary.monthly_spending, currencyPreference)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <ArrowDownIcon />
                Expense
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2 font-medium">
              This month&apos;s outflow <ArrowDownIcon className="size-4" />
            </div>
            <div className="text-muted-foreground">Tracked from current-month expenses</div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Savings Current</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatCurrency(data.summary.savings_current, currencyPreference)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <PiggyBankIcon />
                Saved
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2 font-medium">
              Saved across all goals <ArrowUpIcon className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Target total {formatCurrency(data.summary.savings_target, currencyPreference)}
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Savings Progress</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {Math.round(data.summary.savings_progress)}%
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
              Goal progress overall <PiggyBankIcon className="size-4" />
            </div>
            <div className="text-muted-foreground">Across active and completed savings goals</div>
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-4 px-4 lg:px-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Cashflow</CardTitle>
            <CardDescription>Income and expense for the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[300px] w-full"
              config={{
                income: { label: "Income", color: "var(--chart-2)" },
                expense: { label: "Expense", color: "var(--primary)" },
              }}
            >
              <AreaChart data={data.cashflow}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
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
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="var(--color-income)"
                  fill="var(--color-income)"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="var(--color-expense)"
                  fill="var(--color-expense)"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
            <CardDescription>What stands out right now</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.insights.map((insight) => (
              <div key={insight.title} className="rounded-lg border px-4 py-3">
                <div className="flex items-center gap-2 font-medium">
                  <CircleAlertIcon className="size-4 text-amber-500" />
                  {insight.title}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {insight.message}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 px-4 lg:px-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recent_transactions.length > 0 ? (
              data.recent_transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{transaction.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {transaction.category} · {transaction.transaction_date}
                    </div>
                  </div>
                  <div
                    className={
                      transaction.transaction_type === "income"
                        ? "font-medium text-emerald-500"
                        : "font-medium text-rose-400"
                    }
                  >
                    {transaction.transaction_type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount, currencyPreference)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No recent transactions.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Savings Goals</CardTitle>
            <CardDescription>The goals closest to completion</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.top_goals.length > 0 ? (
              data.top_goals.map((goal) => (
                <div key={goal.goal_id} className="rounded-lg border px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{goal.goal_name}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {formatCurrency(goal.current_amount, currencyPreference)} / {formatCurrency(goal.target_amount, currencyPreference)}
                      </div>
                    </div>
                    <Badge variant="outline">{Math.round(goal.progress_percent)}%</Badge>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(goal.progress_percent, 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {goal.days_remaining > 0
                      ? `${goal.days_remaining} days remaining`
                      : goal.target_date
                        ? "Target date reached"
                        : "No target date"}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No savings goals yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
