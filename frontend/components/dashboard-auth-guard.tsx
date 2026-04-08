"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { useDashboardUser } from "@/components/dashboard-user-provider"

export function DashboardAuthGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isLoadingUser } = useDashboardUser()

  React.useEffect(() => {
    if (!isLoadingUser && !user) {
        router.replace("/auth/login")
    }
  }, [isLoadingUser, router, user])

  if (isLoadingUser) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Checking your session...
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
