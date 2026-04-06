"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { apiFetch } from "@/lib/api"

export function DashboardAuthGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [status, setStatus] = React.useState<"checking" | "authorized" | "unauthorized">(
    "checking"
  )

  React.useEffect(() => {
    let isMounted = true

    async function verifySession() {
      try {
        const response = await apiFetch("/auth/me", {
          redirectOnUnauthorized: false,
        })

        if (!isMounted) {
          return
        }

        if (response.ok) {
          setStatus("authorized")
          return
        }

        setStatus("unauthorized")
        router.replace("/auth/login")
      } catch {
        if (!isMounted) {
          return
        }

        setStatus("unauthorized")
        router.replace("/auth/login")
      }
    }

    void verifySession()

    return () => {
      isMounted = false
    }
  }, [router])

  if (status !== "authorized") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Checking your session...
      </div>
    )
  }

  return <>{children}</>
}
