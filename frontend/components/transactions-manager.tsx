"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { z } from "zod"
import {
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"

import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const transactionSchema = z.object({
  id: z.number(),
  title: z.string(),
  amount: z.number(),
  type: z.enum(["Credited", "Debited"]),
  category: z.string(),
  date: z.string(),
  description: z.string(),
})

export type Transaction = z.infer<typeof transactionSchema>

type BackendTransaction = {
  id: number
  user_id: number
  title: string
  category: string
  transaction_type: "income" | "expense"
  amount: number
  description: string
  transaction_date: string
  created_at: string
}

type TransactionDraft = {
  title: string
  amount: string
  type: Transaction["type"]
  category: string
  date: string
  description: string
}

const transactionCategories = [
  "Income",
  "Side Income",
  "Food & Dining",
  "Groceries",
  "Housing & Rent",
  "Utilities",
  "Transportation",
  "Shopping",
  "Health & Fitness",
  "Entertainment",
  "Investments",
  "Savings",
]

const emptyDraft: TransactionDraft = {
  title: "",
  amount: "",
  type: "Debited",
  category: "Food & Dining",
  date: "",
  description: "",
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatTransactionId(id: number) {
  return `T${String(id).padStart(3, "0")}`
}

function mapTransaction(transaction: BackendTransaction): Transaction {
  return {
    id: transaction.id,
    title: transaction.title,
    amount: transaction.amount,
    type: transaction.transaction_type === "income" ? "Credited" : "Debited",
    category: transaction.category,
    date: transaction.transaction_date.slice(0, 10),
    description: transaction.description ?? "",
  }
}

function toRequestPayload(draft: TransactionDraft) {
  return {
    title: draft.title.trim(),
    amount: Number(draft.amount),
    category: draft.category.trim(),
    transaction_type: draft.type === "Credited" ? "income" : "expense",
    transaction_date: draft.date,
    description: draft.description.trim(),
  }
}

export function TransactionsManager() {
  const router = useRouter()
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [selectedId, setSelectedId] = React.useState<number | null>(null)
  const [search, setSearch] = React.useState("")
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const [mode, setMode] = React.useState<"create" | "edit">("create")
  const [draft, setDraft] = React.useState<TransactionDraft>(emptyDraft)
  const [error, setError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)

  const selectedTransaction = React.useMemo(
    () => transactions.find((transaction) => transaction.id === selectedId) ?? null,
    [transactions, selectedId]
  )

  React.useEffect(() => {
    async function loadTransactions() {
      setIsLoading(true)
      setError("")

      try {
        const response = await apiFetch("/transactions")
        const data = await response.json()

        if (!response.ok) {
          setError(data.error ?? "Could not fetch transactions")
          return
        }

        const nextTransactions = (data.transactions as BackendTransaction[]).map(mapTransaction)
        setTransactions(nextTransactions)
        setSelectedId(nextTransactions[0]?.id ?? null)
      } catch {
        setError("Could not fetch transactions")
      } finally {
        setIsLoading(false)
      }
    }

    void loadTransactions()
  }, [])

  const columns = React.useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Transaction ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {formatTransactionId(row.original.id)}
          </span>
        ),
      },
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {row.original.description}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <span
            className={
              row.original.type === "Credited"
                ? "font-medium text-emerald-400"
                : "font-medium text-rose-400"
            }
          >
            {row.original.type}
          </span>
        ),
      },
      {
        accessorKey: "date",
        header: "Date",
      },
      {
        accessorKey: "amount",
        header: () => <div className="text-right">Amount</div>,
        cell: ({ row }) => (
          <div
            className={`text-right font-semibold ${
              row.original.type === "Credited"
                ? "text-emerald-400"
                : "text-rose-400"
            }`}
          >
            {row.original.type === "Credited" ? "+" : "-"}
            {formatCurrency(row.original.amount)}
          </div>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: transactions,
    columns,
    state: {
      sorting,
      globalFilter: search,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, _columnId, value) => {
      const term = String(value).toLowerCase()
      return [
        formatTransactionId(row.original.id),
        row.original.title,
        row.original.category,
        row.original.type,
        row.original.date,
      ].some((field) => field.toLowerCase().includes(term))
    },
  })

  function openCreate() {
    setMode("create")
    setError("")
    setDraft({
      ...emptyDraft,
      date: new Date().toISOString().slice(0, 10),
    })
    setIsSheetOpen(true)
  }

  function openEdit() {
    if (!selectedTransaction) {
      return
    }

    setMode("edit")
    setError("")
    setDraft({
      title: selectedTransaction.title,
      amount: String(selectedTransaction.amount),
      type: selectedTransaction.type,
      category: selectedTransaction.category,
      date: selectedTransaction.date,
      description: selectedTransaction.description,
    })
    setIsSheetOpen(true)
  }

  function closeSheet() {
    setIsSheetOpen(false)
    setDraft(emptyDraft)
    setError("")
  }

  async function saveTransaction() {
    const parsedAmount = Number(draft.amount)
    if (
      !draft.title.trim() ||
      !draft.category.trim() ||
      !draft.date.trim() ||
      !Number.isFinite(parsedAmount)
    ) {
      setError("Title, amount, category, and date are required.")
      return
    }

    setIsSaving(true)
    setError("")

    try {
      if (mode === "create") {
        const response = await apiFetch("/transactions", {
          method: "POST",
          body: JSON.stringify(toRequestPayload(draft)),
        })
        const data = await response.json()

        if (!response.ok) {
          setError(data.error ?? "Could not create transaction")
          return
        }

        const nextTransaction = mapTransaction(data.transaction as BackendTransaction)
        setTransactions((current) => [nextTransaction, ...current])
        setSelectedId(nextTransaction.id)
      } else if (selectedId !== null) {
        const response = await apiFetch(`/transactions/${selectedId}`, {
          method: "PUT",
          body: JSON.stringify(toRequestPayload(draft)),
        })
        const data = await response.json()

        if (!response.ok) {
          setError(data.error ?? "Could not update transaction")
          return
        }

        const nextTransaction = mapTransaction(data.transaction as BackendTransaction)
        setTransactions((current) =>
          current.map((transaction) =>
            transaction.id === nextTransaction.id ? nextTransaction : transaction
          )
        )
        setSelectedId(nextTransaction.id)
      }
    } catch {
      setError(
        mode === "create"
          ? "Could not create transaction"
          : "Could not update transaction"
      )
      return
    } finally {
      setIsSaving(false)
    }

    closeSheet()
  }

  async function deleteTransaction() {
    if (!selectedId) {
      return
    }

    setError("")

    try {
      const response = await apiFetch(`/transactions/${selectedId}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Could not delete transaction")
        return
      }
    } catch {
      setError("Could not delete transaction")
      return
    }

    const nextTransactions = transactions.filter(
      (transaction) => transaction.id !== selectedId
    )
    setTransactions(nextTransactions)
    setSelectedId(nextTransactions[0]?.id ?? null)
  }

  return (
    <>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold">Transactions</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage credits and debits with the same dashboard table style.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={openCreate}>
                  <PlusIcon />
                  Add Transaction
                </Button>
                <Button
                  variant="outline"
                  onClick={openEdit}
                  disabled={!selectedTransaction}
                >
                  <PencilIcon />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={deleteTransaction}
                  disabled={!selectedTransaction}
                >
                  <Trash2Icon />
                  Delete
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full max-w-sm">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search transactions..."
                  className="pl-9"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {transactions.length} transaction(s)
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="px-4 lg:px-6">
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader className="bg-muted/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="first:pl-6 last:pr-6"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      Loading transactions...
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => {
                    const isSelected = row.original.id === selectedId

                    return (
                      <TableRow
                        key={row.id}
                        onClick={() => setSelectedId(row.original.id)}
                        className={`cursor-pointer ${
                          isSelected ? "bg-white text-black hover:bg-white" : ""
                        }`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="first:pl-6 last:pr-6"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 lg:px-6">
          <div className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      </div>

      {isSheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#18181b] p-6 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                  Transaction Form
                </p>
                <h2 className="text-2xl font-semibold">
                  {mode === "create" ? "Add Transaction" : "Edit Transaction"}
                </h2>
                <p className="text-sm text-white/55">
                  This form now saves directly to your backend transactions API.
                </p>
              </div>
              <button
                type="button"
                onClick={closeSheet}
                className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2 text-sm">
                <Label htmlFor="transaction-title" className="text-white/70">
                  Title
                </Label>
                <Input
                  id="transaction-title"
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Netflix subscription"
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                />
              </div>

              <div className="flex flex-col gap-2 text-sm">
                <Label htmlFor="transaction-amount" className="text-white/70">
                  Amount
                </Label>
                <Input
                  id="transaction-amount"
                  type="number"
                  value={draft.amount}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                />
              </div>

              <div className="flex flex-col gap-2 text-sm">
                <Label htmlFor="transaction-category" className="text-white/70">
                  Category
                </Label>
                <Select
                  value={draft.category}
                  onValueChange={(value) =>
                    value
                      ? setDraft((current) => ({
                          ...current,
                          category: value,
                        }))
                      : undefined
                  }
                  items={transactionCategories.map((category) => ({
                    label: category,
                    value: category,
                  }))}
                >
                  <SelectTrigger
                    id="transaction-category"
                    className="w-full border-white/10 bg-white/5 text-white"
                  >
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#18181b] text-white">
                    <SelectGroup>
                      {transactionCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2 text-sm">
                <Label htmlFor="transaction-date" className="text-white/70">
                  Date
                </Label>
                <Input
                  id="transaction-date"
                  type="date"
                  value={draft.date}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  className="border-white/10 bg-white/5 text-white"
                />
              </div>

              <div className="flex flex-col gap-2 text-sm">
                <Label htmlFor="transaction-type" className="text-white/70">
                  Type
                </Label>
                <div className="flex gap-3">
                  {(["Debited", "Credited"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          type,
                        }))
                      }
                      className={`rounded-xl px-4 py-2.5 text-sm transition ${
                        draft.type === type
                          ? "bg-white text-black"
                          : "border border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 text-sm md:col-span-2">
                <Label
                  htmlFor="transaction-description"
                  className="text-white/70"
                >
                  Description
                </Label>
                <textarea
                  id="transaction-description"
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  className="min-h-24 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-white/30"
                  placeholder="Optional note for this transaction"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 md:col-span-2">
                <Button
                  variant="outline"
                  onClick={closeSheet}
                  className="border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveTransaction}
                  disabled={isSaving}
                  className="bg-white text-black hover:bg-white/90"
                >
                  {isSaving
                    ? "Saving..."
                    : mode === "create"
                      ? "Create Transaction"
                      : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
