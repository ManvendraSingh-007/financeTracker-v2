"use client"

import * as React from "react"
import {
  PencilIcon,
  PiggyBankIcon,
  PlusIcon,
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
import { useDashboardUser } from "@/components/dashboard-user-provider"
import { formatCurrency } from "@/lib/currency"

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

const goalIcons = ["Piggy Bank", "Laptop", "Car", "Home", "Travel", "Education"]

const iconMap: Record<string, string> = {
  "Piggy Bank": "PP",
  Laptop: "LP",
  Car: "CR",
  Home: "HM",
  Travel: "TR",
  Education: "ED",
}

export function SavingsManager() {
  const { currencyPreference } = useDashboardUser()
  const [goals, setGoals] = React.useState<SavingsGoal[]>([])
  const [goalName, setGoalName] = React.useState("")
  const [targetAmount, setTargetAmount] = React.useState("")
  const [targetDate, setTargetDate] = React.useState("")
  const [icon, setIcon] = React.useState(goalIcons[0])
  const [editingGoalId, setEditingGoalId] = React.useState<number | null>(null)
  const [contributionAmounts, setContributionAmounts] = React.useState<Record<number, string>>({})
  const [error, setError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)

  const loadGoals = React.useCallback(async () => {
    setIsLoading(true)
    setError("")

    try {
      const response = await apiFetch("/savings")
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Could not fetch savings goals")
        return
      }

      setGoals(data.goals as SavingsGoal[])
    } catch {
      setError("Could not fetch savings goals")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadGoals()
  }, [loadGoals])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    const numericTarget = Number(targetAmount)
    if (!goalName.trim() || !Number.isFinite(numericTarget) || numericTarget <= 0) {
      setError("Enter a goal name and valid target amount")
      return
    }

    setIsSaving(true)

    try {
      const response = editingGoalId
        ? await apiFetch(`/savings/${editingGoalId}`, {
            method: "PUT",
            body: JSON.stringify({
              goal_name: goalName.trim(),
              target_amount: numericTarget,
              target_date: targetDate,
              icon,
            }),
          })
        : await apiFetch("/savings", {
            method: "POST",
            body: JSON.stringify({
              goal_name: goalName.trim(),
              target_amount: numericTarget,
              target_date: targetDate,
              icon,
            }),
          })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Could not save savings goal")
        return
      }

      cancelEdit()
      await loadGoals()
    } catch {
      setError("Could not save savings goal")
    } finally {
      setIsSaving(false)
    }
  }

  function startEdit(goal: SavingsGoal) {
    setEditingGoalId(goal.goal_id)
    setGoalName(goal.goal_name)
    setTargetAmount(String(goal.target_amount))
    setTargetDate(goal.target_date ?? "")
    setIcon(goal.icon || goalIcons[0])
  }

  function cancelEdit() {
    setEditingGoalId(null)
    setGoalName("")
    setTargetAmount("")
    setTargetDate("")
    setIcon(goalIcons[0])
    setError("")
  }

  async function handleAdd(goalId: number) {
    const amount = Number(contributionAmounts[goalId] ?? "")
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid contribution amount")
      return
    }

    setError("")

    try {
      const response = await apiFetch(`/savings/${goalId}/add`, {
        method: "PATCH",
        body: JSON.stringify({ amount }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Could not add contribution")
        return
      }

      setContributionAmounts((current) => ({
        ...current,
        [goalId]: "",
      }))
      await loadGoals()
    } catch {
      setError("Could not add contribution")
    }
  }

  async function handleDelete(goalId: number) {
    setError("")

    try {
      const response = await apiFetch(`/savings/${goalId}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Could not delete savings goal")
        return
      }

      if (editingGoalId === goalId) {
        cancelEdit()
      }

      await loadGoals()
    } catch {
      setError("Could not delete savings goal")
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Saving</CardTitle>
            <p className="text-sm text-muted-foreground">
              Create savings goals, track progress, and add contributions over time.
            </p>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr_auto]"
              onSubmit={handleSubmit}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="goal-name">Goal Name</Label>
                <Input
                  id="goal-name"
                  value={goalName}
                  onChange={(event) => setGoalName(event.target.value)}
                  placeholder="Emergency Fund"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="goal-target">Target Amount</Label>
                <Input
                  id="goal-target"
                  type="number"
                  value={targetAmount}
                  onChange={(event) => setTargetAmount(event.target.value)}
                  placeholder="50000"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="goal-date">Target Date</Label>
                  <Input
                    id="goal-date"
                    type="date"
                    value={targetDate}
                    onChange={(event) => setTargetDate(event.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="goal-icon">Icon</Label>
                  <Select
                    value={icon}
                    onValueChange={(value) => value && setIcon(value)}
                    items={goalIcons.map((item) => ({ label: item, value: item }))}
                  >
                    <SelectTrigger id="goal-icon" className="w-full">
                      <SelectValue placeholder="Select icon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {goalIcons.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-end gap-2">
                {editingGoalId ? (
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    <XIcon />
                    Cancel
                  </Button>
                ) : null}
                <Button type="submit" disabled={isSaving}>
                  {isSaving
                    ? "Saving..."
                    : editingGoalId
                      ? "Update Goal"
                      : "Create Goal"}
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
              Loading savings goals...
            </CardContent>
          </Card>
        ) : goals.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-sm text-muted-foreground">
              No savings goals yet. Create your first goal above.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {goals.map((goal) => (
              <Card key={goal.goal_id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-xs font-semibold text-muted-foreground">
                        {iconMap[goal.icon] ?? <PiggyBankIcon className="size-5" />}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {goal.status}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold">
                          {goal.goal_name}
                        </h3>
                      </div>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      {Math.round(goal.progress_percent)}%
                    </span>
                  </div>

                  <div className="mt-5 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(goal.current_amount, currencyPreference)} /{" "}
                      {formatCurrency(goal.target_amount, currencyPreference)}
                    </p>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${
                          goal.progress_percent >= 100 ? "bg-emerald-500" : "bg-primary"
                        }`}
                        style={{ width: `${Math.min(goal.progress_percent, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {goal.days_remaining > 0
                          ? `${goal.days_remaining} days remaining`
                          : goal.target_date
                            ? "Target date reached"
                            : "No target date"}
                      </span>
                      <span className="text-foreground">
                        {formatCurrency(goal.monthly_requirement, currencyPreference)} / month
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <Input
                      type="number"
                      value={contributionAmounts[goal.goal_id] ?? ""}
                      onChange={(event) =>
                        setContributionAmounts((current) => ({
                          ...current,
                          [goal.goal_id]: event.target.value,
                        }))
                      }
                      placeholder="5000"
                    />
                    <Button type="button" onClick={() => void handleAdd(goal.goal_id)}>
                      <PlusIcon />
                      Add
                    </Button>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => startEdit(goal)}
                    >
                      <PencilIcon />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleDelete(goal.goal_id)}
                    >
                      <Trash2Icon />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
