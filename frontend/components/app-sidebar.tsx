"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { useDashboardUser } from "@/components/dashboard-user-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  ArrowLeftRightIcon,
  ChartBarIcon,
  LayoutDashboardIcon,
  PiggyBankIcon,
  WalletIcon,
  Settings2Icon,
  CircleHelpIcon,
  HandCoinsIcon,
} from "lucide-react"

const data = {
  navMain: [
    {
      title: "Overview",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Transactions",
      url: "/dashboard/transactions",
      icon: <ArrowLeftRightIcon />,
    },
    {
      title: "Budgets",
      url: "/dashboard/budgets",
      icon: <WalletIcon />,
    },
    {
      title: "Saving",
      url: "/dashboard/saving",
      icon: <PiggyBankIcon />,
    },
    {
      title: "Analytics",
      url: "/dashboard/analytics",
      icon: <ChartBarIcon />,
    }
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: <Settings2Icon />,
    },
    {
      title: "Get Help",
      url: "#",
      icon: <CircleHelpIcon />,
    }
  ],
}
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { user, isLoadingUser } = useDashboardUser()

  const navUser = React.useMemo(
    () => ({
      name: isLoadingUser
        ? "Loading user..."
        : user?.username || user?.email || "Finance Tracker",
      email: isLoadingUser
        ? "Loading session"
        : user?.email || "Session unavailable",
      avatar: "/avatars/shadcn.jpg",
    }),
    [isLoadingUser, user]
  )

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/dashboard" className="cursor-pointer" />}
            >
              <HandCoinsIcon className="size-5!" />
              <span className="text-base font-semibold">Finance Tracker</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={data.navMain.map((item) => ({
            ...item,
            isActive:
              item.url === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.url),
          }))}
        />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={navUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
