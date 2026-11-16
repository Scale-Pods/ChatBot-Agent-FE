"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  CalendarCheck,
  LayoutDashboard,
  LifeBuoy,
  MessagesSquare,
  SlidersHorizontal,
  Users,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { SessionUser } from "@/lib/auth/types"
import { cn } from "@/lib/utils"

const navSections = [
  {
    label: "Workspace",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "Chats", href: "/chats", icon: MessagesSquare },
      { title: "Meetings", href: "/meetings", icon: CalendarCheck },
    ],
  },
  {
    label: "Manage",
    items: [
      { title: "Customization", href: "/customization", icon: SlidersHorizontal },
      { title: "Users", href: "/users", icon: Users },
    ],
  },
]

// Refined nav item: slightly taller, larger text, smoother transitions.
const navItemClass = cn(
  "h-10 justify-start gap-3 rounded-lg px-3 text-[13.5px] font-medium text-muted-foreground transition-colors duration-150",
  "hover:bg-foreground/[0.06] hover:text-foreground",
  "data-[active=true]:bg-primary/[0.08] data-[active=true]:text-primary data-[active=true]:font-semibold",
  "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center",
  "group-data-[collapsible=icon]:[&>span:last-child]:hidden"
)

// Cleaner section labels: smaller caps, more breathing room.
const groupLabelClass = cn(
  "mb-2 mt-1 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50",
  "group-data-[collapsible=icon]:hidden"
)

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "SP"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function AppSidebar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname()
  const displayName = user?.name ?? "ScalePods"
  const displayDetail = user?.email ?? "Production workspace"

  return (
    <Sidebar variant="floating" collapsible="icon">
      {/* ── Header ── */}
      <SidebarHeader className="shrink-0 px-4 pb-3 pt-8 group-data-[collapsible=icon]:px-2">
        <Link
          href="/"
          className="flex h-9 items-center justify-center gap-3 overflow-hidden"
        >
          <Image
            src="/images/scalepods-logo.png"
            alt="ScalePods"
            width={32}
            height={32}
            priority
            className="hidden h-7 w-7 shrink-0 object-contain group-data-[collapsible=icon]:block"
          />
          <Image
            src="/images/scalepods-wordmark.png"
            alt="ScalePods"
            width={256}
            height={44}
            priority
            className="h-[22px] w-auto select-none invert dark:invert-0 group-data-[collapsible=icon]:hidden"
          />
        </Link>
      </SidebarHeader>

      {/* ── Nav ── */}
      <SidebarContent className="scrollbar-none px-3 py-4">
        {navSections.map((section, sectionIndex) => (
          <SidebarGroup
            key={section.label}
            className={cn("p-0", sectionIndex > 0 && "mt-6")}
          >
            <SidebarGroupLabel className={groupLabelClass}>
              {section.label}
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {section.items.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href)

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={navItemClass}
                      >
                        <Link href={item.href}>
                          <item.icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              isActive
                                ? "text-primary"
                                : "text-muted-foreground/70"
                            )}
                          />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="shrink-0 px-3 pb-5 pt-2 group-data-[collapsible=icon]:px-2">
        {/* Divider */}
        <div className="mb-3 h-px w-full bg-border/60" />

        {/* Help link */}
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Help & support" className={navItemClass}>
              <LifeBuoy className="h-4 w-4 shrink-0 text-muted-foreground/70" />
              <span>Help &amp; support</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* User card */}
        <div className="mt-3 flex items-center gap-2.5 overflow-hidden rounded-lg px-3 py-2 transition-colors hover:bg-foreground/[0.04]">
          {/* Avatar */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
            {getInitials(displayName)}
          </div>
          {/* Text */}
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-[12.5px] font-semibold leading-tight text-foreground">
              {displayName}
            </p>
            <p className="truncate text-[11px] leading-tight text-muted-foreground/60">
              {displayDetail}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
