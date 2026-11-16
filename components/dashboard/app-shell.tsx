"use client"

import type React from "react"
import { usePathname } from "next/navigation"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type { SessionUser } from "@/lib/auth/types"
import { AppSidebar } from "./app-sidebar"
import { TopNav } from "./top-nav"

const sectionTitles: Record<string, string> = {
  "/": "Dashboard",
  "/chats": "Chats",
  "/meetings": "Meetings",
  "/customization": "Customization",
  "/users": "Users",
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: SessionUser | null
}) {
  const pathname = usePathname()

  // The sign-in screen is rendered without the dashboard chrome.
  if (pathname === "/login") {
    return <>{children}</>
  }

  const section = sectionTitles[pathname] ?? "Dashboard"

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar user={user} />
      <SidebarInset className="min-w-0 bg-transparent text-foreground">
        <TopNav section={section} user={user} />
        <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 lg:px-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
