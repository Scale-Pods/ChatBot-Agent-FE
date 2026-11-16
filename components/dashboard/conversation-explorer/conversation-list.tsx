"use client"

import { Search, RefreshCw } from "lucide-react"
import { Globe, MessageCircle, Instagram, Mail } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/chat/format"
import type { Conversation } from "@/lib/chat/types"

const channelIcons = {
  website: Globe,
  whatsapp: MessageCircle,
  instagram: Instagram,
  gmail: Mail,
}

const channelColors = {
  website: "text-blue-600 dark:text-blue-400",
  whatsapp: "text-emerald-600 dark:text-emerald-400",
  instagram: "text-pink-600 dark:text-pink-400",
  gmail: "text-red-600 dark:text-red-400",
}

const statusDot = {
  active: "bg-emerald-400",
  pending: "bg-amber-400",
  resolved: "bg-subtle",
}

const filters = ["all", "active", "pending", "resolved"] as const

const channelFilters = [
  { value: "all", label: "All channels", icon: null },
  { value: "website", label: "Website", icon: Globe },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "gmail", label: "Gmail", icon: Mail },
] as const

interface ConversationListProps {
  conversations: Conversation[]
  selectedConversation: Conversation | null
  onSelectConversation: (c: Conversation) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  activeFilter: string
  onFilterChange: (f: string) => void
  activeChannel: string
  onChannelChange: (c: string) => void
  onRefresh: () => void
  isRefreshing?: boolean
}

export function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  activeChannel,
  onChannelChange,
  onRefresh,
  isRefreshing = false,
}: ConversationListProps) {
  const filtered = conversations.filter((c) => {
    const q = searchQuery.toLowerCase()
    const matchSearch =
      c.user.name.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q) ||
      (c.user.email?.toLowerCase().includes(q) ?? false) ||
      (c.user.phone?.toLowerCase().includes(q) ?? false) ||
      c.sessionId.toLowerCase().includes(q)
    const matchFilter = activeFilter === "all" || c.status === activeFilter
    const matchChannel = activeChannel === "all" || c.channel === activeChannel
    return matchSearch && matchFilter && matchChannel
  })

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 space-y-2 border-b border-border p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">Conversations</h3>
            <span className="rounded-full bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {filtered.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh conversations"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 rounded-lg border-border bg-foreground/[0.03] pl-8 text-xs text-foreground placeholder:text-subtle focus-visible:ring-blue-500/30"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {channelFilters.map((channel) => {
            const Icon = channel.icon
            const isActive = activeChannel === channel.value
            return (
              <Button
                key={channel.value}
                variant="ghost"
                size="sm"
                onClick={() => onChannelChange(channel.value)}
                className={cn(
                  "h-6 shrink-0 gap-1 rounded-md px-2 text-[11px]",
                  isActive
                    ? "bg-foreground/[0.07] text-foreground ring-1 ring-border hover:bg-foreground/10"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                )}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {channel.label}
              </Button>
            )
          })}
        </div>
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {filters.map((f) => (
            <Button
              key={f}
              variant="ghost"
              size="sm"
              onClick={() => onFilterChange(f)}
              className={cn(
                "h-6 shrink-0 rounded-md px-2 text-[11px] capitalize",
                activeFilter === f
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/15"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              )}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-1.5 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Search className="h-8 w-8 text-subtle/70 mb-3" />
              <p className="text-sm font-medium text-subtle">No conversations found</p>
              <p className="text-xs text-subtle/70 mt-1">Try adjusting your search or filter</p>
            </div>
          ) : (
            filtered.map((conv) => {
              const Icon = channelIcons[conv.channel]
              const isSelected = selectedConversation?.id === conv.id
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  className={cn(
                    "group relative w-full rounded-[12px] p-2.5 text-left transition-all duration-150",
                    isSelected
                      ? "bg-blue-500/[0.08] before:absolute before:left-0 before:top-3 before:bottom-3 before:w-[2px] before:rounded-full before:bg-blue-500"
                      : "hover:bg-foreground/[0.03]"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="relative shrink-0">
                      <Avatar className="h-8 w-8 ring-1 ring-border">
                        <AvatarFallback className="bg-foreground/[0.05] text-[10px] font-semibold text-foreground">
                          {conv.user.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className={"absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-background " + (statusDot[conv.status] || "bg-subtle")} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="truncate text-[13px] font-medium text-foreground">{conv.user.name}</p>
                          <Icon className={"h-3 w-3 shrink-0 " + channelColors[conv.channel]} />
                        </div>
                        <span className="shrink-0 text-[10px] text-subtle/70" suppressHydrationWarning>
                          {formatRelativeTime(conv.lastActivity)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{conv.lastMessage}</p>
                    </div>
                    {conv.unread && (
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
