"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { apiFetch } from "@/lib/api"

type DashboardUser = {
  user_id: number
  username: string
  email: string
  currency_preference?: string
}

type DashboardUserContextValue = {
  user: DashboardUser | null
  currencyPreference: string
  isLoadingUser: boolean
  refreshUser: () => Promise<void>
}

const DashboardUserContext = React.createContext<DashboardUserContextValue>({
  user: null,
  currencyPreference: "INR",
  isLoadingUser: true,
  refreshUser: async () => {},
})

export function DashboardUserProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [user, setUser] = React.useState<DashboardUser | null>(null)
  const [isLoadingUser, setIsLoadingUser] = React.useState(true)

  const refreshUser = React.useCallback(async () => {
    setIsLoadingUser(true)

    try {
      const response = await apiFetch("/auth/me", {
        redirectOnUnauthorized: false,
      })
      const data = await response.json()

      if (!response.ok) {
        setUser(null)
        return
      }

      setUser(data.user as DashboardUser)
    } catch {
      setUser(null)
    } finally {
      setIsLoadingUser(false)
    }
  }, [])

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshUser()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [pathname, refreshUser])

  React.useEffect(() => {
    function handleFocus() {
      void refreshUser()
    }

    function handleCurrencyUpdated() {
      void refreshUser()
    }

    window.addEventListener("focus", handleFocus)
    window.addEventListener("currency-preference-updated", handleCurrencyUpdated)

    return () => {
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("currency-preference-updated", handleCurrencyUpdated)
    }
  }, [refreshUser])

  return (
    <DashboardUserContext.Provider
      value={{
        user,
        currencyPreference: user?.currency_preference ?? "INR",
        isLoadingUser,
        refreshUser,
      }}
    >
      {children}
    </DashboardUserContext.Provider>
  )
}

export function useDashboardUser() {
  return React.useContext(DashboardUserContext)
}
