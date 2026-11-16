import { writeFileSync, mkdirSync } from "fs"
import { dirname } from "path"

function write(filePath, content) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, content, "utf8")
  console.log("wrote:", filePath)
}

// ─── metrics-overview.tsx ────────────────────────────────────────────────────
write("components/dashboard/metrics-overview.tsx", `"use client"

import { Users, MessageSquare, CalendarCheck, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { conversationSparkline, messageSparkline, conversionSparkline } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import type React from "react"

function Sparkline({ data, color = "#3B82F6" }: { data: number[]; color?: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 80
  const h = 28
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return x.toFixed(1) + "," + y.toFixed(1)
    })
    .join(" ")
  return (
    <svg width={w} height={h} viewBox={"0 0 " + w + " " + h} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.8} />
    </svg>
  )
}

interface MetricCardProps {
  label: string
  value: string
  subtext?: string
  icon: React.ReactNode
  trend?: { value: string; positive: boolean }
  sparkline?: number[]
  sparklineColor?: string
  extra?: React.ReactNode
}

function MetricCard({ label, value, subtext, icon, trend, sparkline, sparklineColor, extra }: MetricCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-[18px] border border-white/[0.06] bg-white/[0.025] p-4 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-[#71717A] uppercase tracking-wider">{label}</p>
          <p className="mt-1.5 text-[26px] font-semibold tracking-tight text-[#FAFAFA] leading-none">{value}</p>
          {subtext && <p className="mt-1 text-xs text-[#52525B]">{subtext}</p>}
          {trend && (
            <div className={"mt-2 inline-flex items-center gap-1 text-xs font-medium " + (trend.positive ? "text-emerald-400" : "text-red-400")}>
              {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              <span>{trend.value} vs last period</span>
            </div>
          )}
          {extra}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="rounded-xl bg-white/[0.05] p-2 text-[#71717A] ring-1 ring-white/[0.06]">{icon}</div>
          {sparkline && <Sparkline data={sparkline} color={sparklineColor} />}
        </div>
      </div>
    </div>
  )
}

export function MetricsOverview() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard
        label="Total Conversations"
        value="2,684"
        subtext="Unique users this month"
        icon={<Users className="h-4 w-4" />}
        trend={{ value: "+12.4%", positive: true }}
        sparkline={conversationSparkline}
        sparklineColor="#3B82F6"
      />
      <MetricCard
        label="Total Messages"
        value="18,492"
        subtext="11.2k incoming / 7.3k outgoing"
        icon={<MessageSquare className="h-4 w-4" />}
        sparkline={messageSparkline}
        sparklineColor="#8B5CF6"
        trend={{ value: "+8.1%", positive: true }}
      />
      <MetricCard
        label="Meetings Booked"
        value="147"
        icon={<CalendarCheck className="h-4 w-4" />}
        trend={{ value: "+22.3%", positive: true }}
        extra={
          <div className="mt-2 flex items-center gap-3">
            <div className="flex flex-col"><span className="text-[10px] text-[#52525B]">Calls</span><span className="text-xs font-medium text-[#A1A1AA]">89</span></div>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex flex-col"><span className="text-[10px] text-[#52525B]">Meetings</span><span className="text-xs font-medium text-[#A1A1AA]">58</span></div>
          </div>
        }
      />
      <MetricCard
        label="Conversion Rate"
        value="5.47%"
        subtext="Conversations to meetings"
        icon={<TrendingUp className="h-4 w-4" />}
        trend={{ value: "+1.2%", positive: true }}
        sparkline={conversionSparkline}
        sparklineColor="#10B981"
      />
    </div>
  )
}
`)

// ─── connected-channels.tsx ──────────────────────────────────────────────────
write("components/dashboard/connected-channels.tsx", `"use client"

import { Globe, MessageCircle, Instagram, Mail, CheckCircle2, ExternalLink, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { mockChannels } from "@/lib/mock-data"
import type { Channel_ } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const channelConfig = {
  website: { icon: Globe, color: "text-blue-400", bg: "bg-blue-500/10", ring: "ring-blue-500/20" },
  whatsapp: { icon: MessageCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" },
  instagram: { icon: Instagram, color: "text-pink-400", bg: "bg-pink-500/10", ring: "ring-pink-500/20" },
  gmail: { icon: Mail, color: "text-red-400", bg: "bg-red-500/10", ring: "ring-red-500/20" },
}

function ChannelCard({ channel }: { channel: Channel_ }) {
  const cfg = channelConfig[channel.type]
  const Icon = cfg.icon
  const isConnected = channel.status === "connected"
  return (
    <div className="group flex flex-1 min-w-0 items-center gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 transition-all hover:border-white/[0.1] hover:bg-white/[0.04]">
      <div className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 " + cfg.bg + " " + cfg.ring}>
        <Icon className={"h-4 w-4 " + cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-[#FAFAFA]">{channel.name}</span>
          {isConnected ? (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          ) : (
            <WifiOff className="h-3 w-3 text-[#71717A]" />
          )}
        </div>
        <p className="text-xs text-[#52525B]">{channel.conversations.toLocaleString()} convs</p>
        <p className="text-[10px] text-[#3F3F46]">{channel.lastActivity}</p>
      </div>
    </div>
  )
}

export function ConnectedChannels() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-[#FAFAFA]">Connected Channels</h2>
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-emerald-500/20">
            <CheckCircle2 className="h-2.5 w-2.5" />
            All connected
          </span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-lg px-2.5 text-xs text-[#71717A] hover:bg-white/5 hover:text-[#FAFAFA]">
          <ExternalLink className="h-3 w-3" />
          Manage integrations
        </Button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-0.5">
        {mockChannels.map((ch) => (
          <ChannelCard key={ch.id} channel={ch} />
        ))}
      </div>
    </div>
  )
}
`)

// ─── call-assistance.tsx ─────────────────────────────────────────────────────
write("components/dashboard/call-assistance.tsx", `"use client"

import { useState } from "react"
import { Phone, Clock, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { mockCallbacks } from "@/lib/mock-data"
import type { CallbackRequest } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

const statusConfig = {
  pending: { label: "Pending", class: "bg-amber-500/10 text-amber-400 ring-amber-500/20" },
  attended: { label: "Attended", class: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" },
  not_attended: { label: "Not attended", class: "bg-red-500/10 text-red-400 ring-red-500/20" },
}

export function CallAssistance() {
  const [callbacks, setCallbacks] = useState<CallbackRequest[]>(mockCallbacks)
  const { toast } = useToast()

  const updateStatus = (id: string, status: CallbackRequest["status"]) => {
    setCallbacks((prev) => prev.map((cb) => cb.id === id ? { ...cb, status } : cb))
    toast({ description: status === "attended" ? "Marked as attended." : "Marked as not attended.", duration: 2000 })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-[#FAFAFA]">Call Assistance</h2>
          <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 ring-1 ring-amber-500/20">
            {callbacks.filter((c) => c.status === "pending").length} pending
          </span>
        </div>
      </div>
      <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.025] overflow-hidden">
        <div className="divide-y divide-white/[0.04]">
          {callbacks.map((cb) => {
            const sc = statusConfig[cb.status]
            return (
              <div key={cb.id} className="flex items-start gap-3 p-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]">
                  <Phone className="h-3.5 w-3.5 text-[#71717A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[#FAFAFA]">{cb.customer}</p>
                      <p className="text-xs text-[#71717A]">{cb.phone}</p>
                      <p className="mt-0.5 text-xs text-[#52525B] line-clamp-1">{cb.reason}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={"rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 " + sc.class}>{sc.label}</span>
                      <div className="flex items-center gap-0.5 text-[10px] text-[#3F3F46]">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{cb.requestTime}</span>
                      </div>
                    </div>
                  </div>
                  {cb.status === "pending" && (
                    <div className="mt-2 flex gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 rounded-md px-2 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => updateStatus(cb.id, "attended")}
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Attended
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 rounded-md px-2 text-[10px] font-medium text-red-400 hover:bg-red-500/10"
                        onClick={() => updateStatus(cb.id, "not_attended")}
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Not attended
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
`)

// ─── meetings-scheduled.tsx ──────────────────────────────────────────────────
write("components/dashboard/meetings-scheduled.tsx", `"use client"

import { useState } from "react"
import { CalendarDays, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { mockMeetings } from "@/lib/mock-data"
import type { Meeting } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const statusConfig = {
  scheduled: { label: "Scheduled", class: "bg-blue-500/10 text-blue-400 ring-blue-500/20" },
  completed: { label: "Completed", class: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" },
  cancelled: { label: "Cancelled", class: "bg-[#52525B]/20 text-[#71717A] ring-white/10" },
  no_show: { label: "No-show", class: "bg-red-500/10 text-red-400 ring-red-500/20" },
}

const statusFilters: Array<{ label: string; value: Meeting["status"] | "all" }> = [
  { label: "All", value: "all" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "No-show", value: "no_show" },
]

export function MeetingsScheduled() {
  const [filter, setFilter] = useState<Meeting["status"] | "all">("all")
  const filtered = filter === "all" ? mockMeetings : mockMeetings.filter((m) => m.status === filter)
  const isEmail = (s: string) => s.includes("@")

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-[#FAFAFA]">Meetings Scheduled</h2>
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {statusFilters.map((f) => (
          <Button
            key={f.value}
            variant="ghost"
            size="sm"
            onClick={() => setFilter(f.value)}
            className={cn(
              "h-6 rounded-md px-2.5 text-xs capitalize whitespace-nowrap",
              filter === f.value ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/15" : "text-[#71717A] hover:bg-white/5 hover:text-[#FAFAFA]"
            )}
          >
            {f.label}
          </Button>
        ))}
      </div>
      <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.025] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CalendarDays className="h-8 w-8 text-[#3F3F46] mb-2" />
            <p className="text-xs text-[#52525B]">No meetings for this filter</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((m) => {
              const sc = statusConfig[m.status]
              return (
                <div key={m.id} className="flex items-start gap-3 p-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]">
                    <CalendarDays className="h-3.5 w-3.5 text-[#71717A]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-[#FAFAFA]">{m.customer}</p>
                        <div className="flex items-center gap-1 text-xs text-[#71717A]">
                          {isEmail(m.contactInfo) ? <Mail className="h-2.5 w-2.5" /> : <Phone className="h-2.5 w-2.5" />}
                          <span>{m.contactInfo}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#52525B] line-clamp-1">{m.reason}</p>
                      </div>
                      <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 " + sc.class}>{sc.label}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-[#3F3F46]">{m.dateTime}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
`)

// ─── conversation-explorer/conversation-list.tsx ─────────────────────────────
write("components/dashboard/conversation-explorer/conversation-list.tsx", `"use client"

import { Search, RefreshCw, Filter } from "lucide-react"
import { Globe, MessageCircle, Instagram, Mail } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/lib/mock-data"

const channelIcons = {
  website: Globe,
  whatsapp: MessageCircle,
  instagram: Instagram,
  gmail: Mail,
}

const channelColors = {
  website: "text-blue-400",
  whatsapp: "text-emerald-400",
  instagram: "text-pink-400",
  gmail: "text-red-400",
}

const statusDot = {
  active: "bg-emerald-400",
  pending: "bg-amber-400",
  resolved: "bg-[#52525B]",
}

const filters = ["all", "website", "whatsapp", "instagram", "gmail"] as const

interface ConversationListProps {
  conversations: Conversation[]
  selectedConversation: Conversation | null
  onSelectConversation: (c: Conversation) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  activeFilter: string
  onFilterChange: (f: string) => void
}

export function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
}: ConversationListProps) {
  const filtered = conversations.filter((c) => {
    const q = searchQuery.toLowerCase()
    const matchSearch =
      c.user.name.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q) ||
      (c.user.email?.toLowerCase().includes(q) ?? false)
    const matchFilter = activeFilter === "all" || c.channel === activeFilter
    return matchSearch && matchFilter
  })

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-white/[0.06] p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-[#FAFAFA]">Conversations</h3>
            <span className="rounded-full bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-[#71717A]">
              {filtered.length}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-[#71717A] hover:bg-white/5 hover:text-[#FAFAFA]">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#52525B]" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 rounded-lg border-white/[0.06] bg-white/[0.025] pl-8 text-xs text-[#FAFAFA] placeholder:text-[#52525B] focus-visible:ring-blue-500/30"
          />
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
                  ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/15"
                  : "text-[#71717A] hover:bg-white/5 hover:text-[#FAFAFA]"
              )}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Search className="h-8 w-8 text-[#3F3F46] mb-3" />
              <p className="text-sm font-medium text-[#52525B]">No conversations found</p>
              <p className="text-xs text-[#3F3F46] mt-1">Try adjusting your search or filter</p>
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
                      : "hover:bg-white/[0.03]"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="relative shrink-0">
                      <Avatar className="h-8 w-8 ring-1 ring-white/[0.08]">
                        <AvatarFallback className="bg-white/[0.05] text-[10px] font-semibold text-[#FAFAFA]">
                          {conv.user.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className={"absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-[#09090B] " + (statusDot[conv.status] || "bg-[#52525B]")} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="truncate text-[13px] font-medium text-[#FAFAFA]">{conv.user.name}</p>
                          <Icon className={"h-3 w-3 shrink-0 " + channelColors[conv.channel]} />
                        </div>
                        <span className="shrink-0 text-[10px] text-[#3F3F46]">{conv.lastActivity}</span>
                      </div>
                      <p className="truncate text-xs text-[#71717A]">{conv.lastMessage}</p>
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
`)

// ─── conversation-explorer/chat-workspace.tsx ────────────────────────────────
write("components/dashboard/conversation-explorer/chat-workspace.tsx", `"use client"

import { useState, useRef, useEffect } from "react"
import {
  Globe, MessageCircle, Instagram, Mail,
  ChevronDown, ChevronRight, Bot, User, UserCircle2,
  MoreHorizontal, Search as SearchIcon, UserCheck,
  PhoneOff, PhoneMissed, CheckCheck, Info, MessagesSquare
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/lib/mock-data"
import { useToast } from "@/components/ui/use-toast"

const channelConfig = {
  website: { icon: Globe, label: "Website", color: "text-blue-400", bg: "bg-blue-500/10", ring: "ring-blue-500/20" },
  whatsapp: { icon: MessageCircle, label: "WhatsApp", color: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" },
  instagram: { icon: Instagram, label: "Instagram", color: "text-pink-400", bg: "bg-pink-500/10", ring: "ring-pink-500/20" },
  gmail: { icon: Mail, label: "Gmail", color: "text-red-400", bg: "bg-red-500/10", ring: "ring-red-500/20" },
}

const sessionStatusConfig = {
  active: { label: "Active", class: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" },
  pending: { label: "Pending", class: "bg-amber-500/10 text-amber-400 ring-amber-500/20" },
  resolved: { label: "Resolved", class: "bg-[#27272A]/60 text-[#71717A] ring-white/10" },
}

const meetingStatusMap = {
  none: "None",
  requested: "Requested",
  booked: "Booked",
}

const handoffStatusMap = {
  none: "None",
  requested: "Requested",
  completed: "Completed",
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] mb-4">
        <MessagesSquare className="h-6 w-6 text-[#3F3F46]" />
      </div>
      <p className="text-sm font-medium text-[#52525B]">Select a conversation</p>
      <p className="mt-1 text-xs text-[#3F3F46]">Choose a conversation from the list to view messages</p>
    </div>
  )
}

interface ChatWorkspaceProps {
  conversation: Conversation | null
}

export function ChatWorkspace({ conversation }: ChatWorkspaceProps) {
  const [summaryOpen, setSummaryOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversation?.id])

  const handleAction = (label: string) => {
    toast({ description: label + " — action triggered (demo mode).", duration: 2500 })
  }

  if (!conversation) return <EmptyState />

  const ch = channelConfig[conversation.channel]
  const ChIcon = ch.icon
  const sc = sessionStatusConfig[conversation.status]

  // Group messages with date separators
  const grouped: Array<{ date: string | null; messages: typeof conversation.messages }> = []
  let currentDate = ""
  for (const msg of conversation.messages) {
    const dateStr = msg.timestamp.includes("·") ? msg.timestamp.split("·")[0].trim() : null
    if (dateStr && dateStr !== currentDate) {
      currentDate = dateStr
      grouped.push({ date: dateStr, messages: [] })
    }
    if (grouped.length === 0) grouped.push({ date: null, messages: [] })
    grouped[grouped.length - 1].messages.push(msg)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 shrink-0 ring-1 ring-white/[0.1]">
              <AvatarFallback className="bg-white/[0.05] text-xs font-semibold text-[#FAFAFA]">
                {conversation.user.avatar}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[#FAFAFA]">{conversation.user.name}</p>
                <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 " + ch.bg + " " + ch.color + " " + ch.ring}>
                  <ChIcon className="h-2.5 w-2.5" />
                  {ch.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#52525B]">
                {conversation.user.email && <span>{conversation.user.email}</span>}
                {conversation.user.phone && <span>{conversation.user.phone}</span>}
                <span className="text-[#3F3F46]">·</span>
                <span className="font-mono">{conversation.sessionId}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-[#71717A] hover:bg-white/5 hover:text-[#FAFAFA]">
              <SearchIcon className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-[#71717A] hover:bg-white/5 hover:text-[#FAFAFA]">
              <Info className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-[#71717A] hover:bg-white/5 hover:text-[#FAFAFA]">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Info pills */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className={"rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 " + sc.class}>{sc.label}</span>
          <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-[#71717A] ring-1 ring-white/[0.06]">
            First: {conversation.firstContacted}
          </span>
          <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-[#71717A] ring-1 ring-white/[0.06]">
            Last: {conversation.lastActivity}
          </span>
          {conversation.assignedAgent && (
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-400 ring-1 ring-blue-500/20">
              Agent: {conversation.assignedAgent}
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      {conversation.summary && (
        <div className="border-b border-white/[0.06]">
          <button
            onClick={() => setSummaryOpen(!summaryOpen)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Bot className="h-3.5 w-3.5 text-[#71717A]" />
              <span className="text-xs font-medium text-[#A1A1AA]">AI Conversation Summary</span>
            </div>
            {summaryOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-[#52525B]" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-[#52525B]" />
            )}
          </button>
          {summaryOpen && (
            <div className="px-4 pb-3 space-y-2.5">
              <p className="text-xs text-[#A1A1AA] leading-relaxed">{conversation.summary.text}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-[#52525B] uppercase tracking-wider mb-1">Intent</p>
                  <p className="text-xs text-[#A1A1AA]">{conversation.summary.intent}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#52525B] uppercase tracking-wider mb-1">Meeting</p>
                  <p className="text-xs text-[#A1A1AA]">{meetingStatusMap[conversation.summary.meetingStatus]}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-[#52525B] uppercase tracking-wider mb-1">Requirements</p>
                  <div className="flex flex-wrap gap-1">
                    {conversation.summary.requirements.map((r) => (
                      <span key={r} className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[#71717A] ring-1 ring-white/[0.06]">{r}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-3">
          {grouped.map((group, gi) => (
            <div key={gi} className="space-y-3">
              {group.date && (
                <div className="flex items-center gap-2 py-1">
                  <div className="h-px flex-1 bg-white/[0.04]" />
                  <span className="text-[10px] text-[#3F3F46] px-2">{group.date}</span>
                  <div className="h-px flex-1 bg-white/[0.04]" />
                </div>
              )}
              {group.messages.map((msg) => {
                if (msg.role === "system") {
                  return (
                    <div key={msg.id} className="flex items-center justify-center gap-2">
                      <div className="h-px flex-1 bg-white/[0.04]" />
                      <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] text-[#52525B] ring-1 ring-white/[0.06]">
                        {msg.content}
                      </span>
                      <div className="h-px flex-1 bg-white/[0.04]" />
                    </div>
                  )
                }
                if (msg.role === "user") {
                  return (
                    <div key={msg.id} className="flex flex-col items-end gap-1">
                      <div className="max-w-[72%] rounded-[16px] rounded-br-[4px] bg-blue-500/[0.15] px-3.5 py-2.5 text-sm text-[#FAFAFA] ring-1 ring-blue-500/[0.15]">
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-[#3F3F46]">{msg.timestamp.split("·").pop()?.trim() ?? msg.timestamp}</span>
                    </div>
                  )
                }
                if (msg.role === "agent") {
                  return (
                    <div key={msg.id} className="flex items-start gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
                        <UserCheck className="h-3.5 w-3.5 text-amber-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium text-amber-400">{msg.senderName ?? "Agent"}</p>
                        <div className="max-w-[72%] rounded-[16px] rounded-bl-[4px] bg-amber-500/[0.08] px-3.5 py-2.5 text-sm text-[#FAFAFA] ring-1 ring-amber-500/[0.12]">
                          {msg.content}
                        </div>
                        <span className="block text-[10px] text-[#3F3F46]">{msg.timestamp.split("·").pop()?.trim() ?? msg.timestamp}</span>
                      </div>
                    </div>
                  )
                }
                // ai / bot
                return (
                  <div key={msg.id} className="flex items-start gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/10 ring-1 ring-blue-500/20">
                      <Bot className="h-3.5 w-3.5 text-blue-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-blue-400">AI Bot</p>
                      <div className="max-w-[72%] rounded-[16px] rounded-bl-[4px] bg-white/[0.04] px-3.5 py-2.5 text-sm text-[#FAFAFA] ring-1 ring-white/[0.06]">
                        {msg.content}
                      </div>
                      <span className="block text-[10px] text-[#3F3F46]">{msg.timestamp.split("·").pop()?.trim() ?? msg.timestamp}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Action bar */}
      <div className="border-t border-white/[0.06] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-lg px-3 text-xs text-[#71717A] hover:bg-white/5 hover:text-[#FAFAFA]"
            onClick={() => handleAction("Connect to chat")}
          >
            <UserCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Connect to chat
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-lg px-3 text-xs text-[#71717A] hover:bg-white/5 hover:text-[#FAFAFA]"
            onClick={() => handleAction("Disconnect AI")}
          >
            <PhoneMissed className="mr-1.5 h-3.5 w-3.5" />
            Disconnect AI
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-lg px-3 text-xs text-[#71717A] hover:bg-white/5 hover:text-[#FAFAFA]"
            onClick={() => handleAction("Assign agent")}
          >
            <UserCheck className="mr-1.5 h-3.5 w-3.5" />
            Assign agent
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-lg px-3 text-xs text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => handleAction("Mark resolved")}
          >
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
            Mark resolved
          </Button>
        </div>
      </div>
    </div>
  )
}
`)

// ─── conversation-explorer.tsx ───────────────────────────────────────────────
write("components/dashboard/conversation-explorer.tsx", `"use client"

import { useState } from "react"
import { ConversationList } from "./conversation-explorer/conversation-list"
import { ChatWorkspace } from "./conversation-explorer/chat-workspace"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { mockConversations } from "@/lib/mock-data"
import type { Conversation } from "@/lib/mock-data"

// Re-export for backwards compat
export type { Conversation }

export function ConversationExplorer() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(mockConversations[0])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-[#FAFAFA]">Conversation Explorer</h2>
      <div className="overflow-hidden rounded-[18px] border border-white/[0.06] bg-white/[0.025]">
        <ResizablePanelGroup direction="horizontal" className="min-h-[600px]">
          <ResizablePanel defaultSize={33} minSize={28} maxSize={42}>
            <ConversationList
              conversations={mockConversations}
              selectedConversation={selectedConversation}
              onSelectConversation={setSelectedConversation}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />
          </ResizablePanel>
          <ResizableHandle className="w-px bg-white/[0.06]" />
          <ResizablePanel defaultSize={67}>
            <ChatWorkspace conversation={selectedConversation} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
`)

// ─── command-center.tsx ──────────────────────────────────────────────────────
write("components/dashboard/command-center.tsx", `"use client"

import { TopNav } from "./top-nav"
import { MetricsOverview } from "./metrics-overview"
import { ConnectedChannels } from "./connected-channels"
import { ConversationExplorer } from "./conversation-explorer"
import { CallAssistance } from "./call-assistance"
import { MeetingsScheduled } from "./meetings-scheduled"

export function CommandCenter() {
  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA]">
      <TopNav />
      <main className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">
        <div className="space-y-6">
          <MetricsOverview />
          <ConnectedChannels />
          <ConversationExplorer />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <CallAssistance />
            <MeetingsScheduled />
          </div>
        </div>
      </main>
    </div>
  )
}
`)

console.log("\\nAll components written successfully!")
