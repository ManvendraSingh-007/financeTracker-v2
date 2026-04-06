"use client"

import * as React from "react"
import {
  PencilIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"

import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

const monthOptions = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const budgetCategories = [
  "Food & Dining",
  "Groceries",
  "Housing & Rent",
  "Utilities",
  "Transportation",
  "Shopping",
  "Health & Fitness",
  "Entertainment",
  "Travel",
  "Education",
  "Insurance",
  "Subscriptions",
  "Investments",
  "Savings",
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function getProgressWidth(currentSpent: number, amountLimit: number) {
  if (amountLimit <= 0) {
    return 0
  }

  return Math.min((currentSpent / amountLimit) * 100, 100)
}

function getProgressTone(percent: number) {
  if (percent > 90) {
    return "bg-rose-500"
  }
  if (percent >= 70) {
    return "bg-amber-500"
  }
  return "bg-emerald-500"
}

export function BudgetsManager() {
  const now = React.useMemo(() => new Date(), [])
  const [budgets, setBudgets] = React.useState<Budget[]>([])
  const [month, setMonth] = React.useState(String(now.getMonth() + 1))
  const [year, setYear] = React.useState(String(now.getFullYear()))
  const [category, setCategory] = React.useState("")
  const [amountLimit, setAmountLimit] = React.useState("")
  const [editingBudgetId, setEditingBudgetId] = React.useState<number | null>(null)
  const [error, setError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)

  const yearOptions = React.useMemo(
    () => Array.from({ length: 5 }, (_, index) => String(now.getFullYear() - 1 + index)),
    [now]
  )

  const loadBudgets = React.useCallback(async () => {
    setIsLoading(true)
    setError("")

    try {
      const response = await apiFetch(`/budgets?month=${month}&year=${year}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Could not fetch budgets")
        return
      }

      setBudgets(data.budgets as Budget[])
    } catch {
      setError("Could not fetch budgets")
    } finally {
      setIsLoading(false)
    }
  }, [month, year])

  React.useEffect(() => {
    void loadBudgets()
  }, [loadBudgets])

  const usedCategories = React.useMemo(
    () =>
      new Set(
        budgets
          .filter((budget) => budget.budget_id !== editingBudgetId)
          .map((budget) => budget.category)
      ),
    [budgets, editingBudgetId]
  )

  const availableCategories = React.useMemo(
    () =>
      budgetCategories.filter(
        (item) => !usedCategories.has(item) || item === category
      ),
    [usedCategories, category]
  )

  React.useEffect(() => {
    if (!category && availableCategories.length > 0) {
      setCategory(availableCategories[0])
    }
  }, [availableCategories, category])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    const numericLimit = Number(amountLimit)
    if (!category || !Number.isFinite(numericLimit) || numericLimit <= 0) {
      setError("Choose a category and enter a valid amount limit")
      return
    }

    setIsSaving(true)

    try {
      const response = editingBudgetId
        ? await apiFetch(`/budgets/${editingBudgetId}`, {
            method: "PUT",
            body: JSON.stringify({
              category,
              amount_limit: numericLimit,
              month: Number(month),
              year: Number(year),
            }),
          })
        : await apiFetch("/budgets", {
            method: "POST",
            body: JSON.stringify({
              category,
              amount_limit: numericLimit,
              month: Number(month),
              year: Number(year),
            }),
          })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Could not save budget")
        return
      }

      setAmountLimit("")
      setEditingBudgetId(null)
      setCategory(availableCategories[0] ?? budgetCategories[0] ?? "")
      await loadBudgets()
    } catch {
      setError("Could not save budget")
    } finally {
      setIsSaving(false)
    }
  }

  function startEdit(budget: Budget) {
    setEditingBudgetId(budget.budget_id)
    setCategory(budget.category)
    setAmountLimit(String(budget.amount_limit))
  }

  function cancelEdit() {
    setEditingBudgetId(null)
    setAmountLimit("")
    setCategory(availableCategories[0] ?? budgetCategories[0] ?? "")
    setError("")
  }

  async function handleDelete(budgetId: number) {
    setError("")

    try {
      const response = await apiFetch(`/budgets/${budgetId}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Could not delete budget")
        return
      }

      if (editingBudgetId === budgetId) {
        cancelEdit()
      }

      await loadBudgets()
    } catch {
      setError("Could not delete budget")
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-2xl">Budgets</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Set category-based monthly limits and track how much is left.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="budget-month">Month</Label>
                  <Select
                    value={month}
                    onValueChange={(value) => value && setMonth(value)}
                    items={monthOptions.map((label, index) => ({
                      label,
                      value: String(index + 1),
                    }))}
                  >
                    <SelectTrigger id="budget-month" className="w-full min-w-40">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {monthOptions.map((label, index) => (
                          <SelectItem key={label} value={String(index + 1)}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="budget-year">Year</Label>
                  <Select
                    value={year}
                    onValueChange={(value) => value && setYear(value)}
                    items={yearOptions.map((item) => ({
                      label: item,
                      value: item,
                    }))}
                  >
                    <SelectTrigger id="budget-year" className="w-full min-w-32">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {yearOptions.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_auto]"
              onSubmit={handleSubmit}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="budget-category">Category</Label>
                <Select
                  value={category}
                  onValueChange={(value) => value && setCategory(value)}
                  items={availableCategories.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                >
                  <SelectTrigger id="budget-category" className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {availableCategories.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="budget-limit">Monthly Limit</Label>
                <Input
                  id="budget-limit"
                  type="number"
                  value={amountLimit}
                  onChange={(event) => setAmountLimit(event.target.value)}
                  placeholder="5000"
                />
              </div>

              <div className="flex items-end gap-2">
                {editingBudgetId ? (
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    <XIcon />
                    Cancel
                  </Button>
                ) : null}
                <Button type="submit" disabled={isSaving}>
                  {isSaving
                    ? "Saving..."
                    : editingBudgetId
                      ? "Update Budget"
                      : "Set Budget"}
                </Button>
              </div>
            </form>

            {error ? (
              <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        {isLoading ? (
          <Card>
            <CardContent className="py-10 text-sm text-muted-foreground">
              Loading budgets...
            </CardContent>
          </Card>
        ) : budgets.length === 0 ? (
          <Card>
            <CardContent className="py-10">
              <p className="text-sm text-muted-foreground">
                No budgets yet for {monthOptions[Number(month) - 1]} {year}. Set
                your first budget above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {budgets.map((budget) => {
              const percent = getProgressWidth(
                budget.current_spent,
                budget.amount_limit
              )

              return (
                <Card key={budget.budget_id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {monthOptions[budget.month - 1]} {budget.year}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold">
                          {budget.category}
                        </h3>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          budget.over_budget
                            ? "bg-rose-500/10 text-rose-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {budget.over_budget ? "Over Budget" : "On Track"}
                      </span>
                    </div>

                    <p className="mt-5 text-sm text-muted-foreground">
                      {formatCurrency(budget.current_spent)} /{" "}
                      {formatCurrency(budget.amount_limit)}
                    </p>

                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${getProgressTone(
                          percent
                        )}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {Math.round(percent)}% spent
                      </span>
                      <span
                        className={
                          budget.remaining >= 0
                            ? "text-foreground"
                            : "text-rose-400"
                        }
                      >
                        {budget.remaining >= 0
                          ? `${formatCurrency(budget.remaining)} left`
                          : `${formatCurrency(Math.abs(budget.remaining))} over`}
                      </span>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => startEdit(budget)}
                      >
                        <PencilIcon />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleDelete(budget.budget_id)}
                      >
                        <Trash2Icon />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
