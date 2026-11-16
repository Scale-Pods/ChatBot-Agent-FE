"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Search,
  Settings,
  Moon,
  Sun,
  ChevronRight,
  LogOut,
  UserRound,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { SessionUser } from "@/lib/auth/types"

interface TopNavProps {
  section: string
  user: SessionUser | null
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return "SP"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function TopNav({ section, user }: TopNavProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)

    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      router.replace("/login")
      router.refresh()
    }
  }

  const initials = user ? getInitials(user.name) : "SP"

  return (
    <header className="sticky top-0 z-50 px-4 pt-3 lg:px-6">
      <div className="flex h-13 items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-3 shadow-[0_1px_2px_hsl(240_10%_3%/0.06),0_18px_40px_-30px_hsl(240_10%_3%/0.45)] backdrop-blur-2xl lg:px-4">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-2.5">
          <SidebarTrigger className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground" />
          <div className="hidden items-center gap-1.5 text-sm sm:flex">
            <span className="text-muted-foreground">Command Center</span>
            <ChevronRight className="h-3.5 w-3.5 text-subtle/70" />
            <span className="font-medium text-foreground">{section}</span>
          </div>
          <span className="truncate text-sm font-medium text-foreground sm:hidden">
            {section}
          </span>
          <span className="hidden rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20 md:inline-flex">
            Production
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors"
          >
            <Search className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 ring-1 ring-background" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Toggle color theme"
            title="Toggle light / dark mode"
          >
            <Moon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Sun className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <div className="mx-1.5 h-4 w-px bg-foreground/10" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-1 outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-blue-500/40"
                aria-label="Account menu"
              >
                <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground sm:block">
                  {user?.name ?? "Guest"}
                </span>
                <Avatar className="h-7 w-7 ring-1 ring-border transition-all hover:ring-foreground/20">
                  <AvatarFallback className="bg-blue-500/15 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 glass-panel border-border text-foreground"
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{user?.name ?? "Guest"}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user?.email ?? "Not signed in"}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-foreground/10" />
              <DropdownMenuItem
                className="gap-2 text-muted-foreground focus:bg-foreground/[0.05] focus:text-foreground"
                onSelect={() => router.push("/users")}
              >
                <UserRound className="h-4 w-4" />
                Manage users
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 text-red-600 dark:text-red-400 focus:bg-red-500/10 focus:text-red-700 dark:text-red-300"
                disabled={signingOut}
                onSelect={() => void handleSignOut()}
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? "Signing outâ€¦" : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
