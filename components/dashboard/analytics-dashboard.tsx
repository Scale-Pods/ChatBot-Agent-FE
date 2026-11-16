"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  Globe,
  Instagram,
  Mail,
  MessageCircle,
  TrendingUp,
  Users,
} from "lucide-react"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import type {
  ChatChannel,
  Conversation,
  ConversationStatus,
  DashboardMetrics,
} from "@/lib/chat/types"
import { MetricsOverview } from "./metrics-overview"

const numberFormatter = new Intl.NumberFormat("en-US")

function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

const channelMeta: Record<
  ChatChannel,
  { label: string; icon: typeof Globe; color: string; bar: string }
> = {
  website: {
    label: "Website",
    icon: Globe,
    color: "text-blue-600 dark:text-blue-400",
    bar: "bg-blue-500",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    color: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    color: "text-pink-600 dark:text-pink-400",
    bar: "bg-pink-500",
  },
  gmail: {
    label: "Gmail",
    icon: Mail,
    color: "text-red-600 dark:text-red-400",
    bar: "bg-red-500",
  },
}

const statusMeta: Record<
  ConversationStatus,
  { label: string; dot: string; bar: string }
> = {
  active: { label: "Active", dot: "bg-emerald-400", bar: "bg-emerald-500" },
  pending: { label: "Pending", dot: "bg-amber-400", bar: "bg-amber-500" },
  resolved: { label: "Resolved", dot: "bg-subtle", bar: "bg-subtle" },
}

const volumeConfig = {
  conversations: { label: "Conversations", color: "#3B82F6" },
  messages: { label: "Messages", color: "#8B5CF6" },
} satisfies ChartConfig

const messageSplitConfig = {
  incoming: { label: "Incoming", color: "#3B82F6" },
  outgoing: { label: "Outgoing", color: "#8B5CF6" },
} satisfies ChartConfig

interface PanelProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}

function Panel({
  title,
  description,
  children,
  className,
  action,
}: PanelProps) {
  return (
    <section
      className={cn(
        "glass-panel flex flex-col rounded-[24px] p-5 lg:p-6",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-subtle">
              {description}
            </p>
          )}
        </div>
        {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
      </div>
      <div className="flex-1">{children}</div>
    </section>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 text-[10px] font-medium uppercase tracking-[0.18em] text-subtle/80">
      {children}
    </p>
  )
}

interface AnalyticsDashboardProps {
  metrics: DashboardMetrics
  conversations: Conversation[]
  dayLabels: string[]
}

export function AnalyticsDashboard({
  metrics,
  conversations,
  dayLabels,
}: AnalyticsDashboardProps) {
  const activityData = dayLabels.map((day, index) => ({
    day,
    conversations: metrics.conversationSparkline[index] ?? 0,
    messages: metrics.messageSparkline[index] ?? 0,
  }))

  const channelCounts = conversations.reduce(
    (counts, conversation) => {
      counts[conversation.channel] += 1
      return counts
    },
    { website: 0, whatsapp: 0, instagram: 0, gmail: 0 } as Record<
      ChatChannel,
      number
    >
  )

  const channelRows = (Object.keys(channelMeta) as ChatChannel[])
    .map((channel) => ({
      channel,
      count: channelCounts[channel],
      ...channelMeta[channel],
    }))
    .sort((a, b) => b.count - a.count)

  const maxChannelCount = Math.max(...channelRows.map((row) => row.count), 1)

  const statusCounts = conversations.reduce(
    (counts, conversation) => {
      counts[conversation.status] += 1
      return counts
    },
    { active: 0, pending: 0, resolved: 0 } as Record<
      ConversationStatus,
      number
    >
  )

  const totalRecent = conversations.length || 1

  const messageSplit = [
    { name: "Incoming", key: "incoming", value: metrics.incomingMessages },
    { name: "Outgoing", key: "outgoing", value: metrics.outgoingMessages },
  ]

  const totalBookings = metrics.meetings + metrics.calls

  const funnelRows = [
    {
      label: "Total conversations",
      value: metrics.totalConversations,
      bar: "bg-blue-500",
    },
    {
      label: "Booked conversions",
      value: metrics.meetingsBooked,
      bar: "bg-emerald-500",
    },
    {
      label: "Meetings",
      value: metrics.meetings,
      bar: "bg-purple-500",
    },
    {
      label: "Calls",
      value: metrics.calls,
      bar: "bg-amber-500",
    },
  ]

  const maxFunnelValue = Math.max(
    ...funnelRows.map((row) => row.value),
    1
  )

  return (
    <div className="space-y-6">
      <MetricsOverview metrics={metrics} />

      <div className="space-y-3">
        <SectionLabel>Performance</SectionLabel>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel
          title="Conversation activity"
          description="Messages and conversations over the last 12 days"
          className="lg:col-span-2"
          action={
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Conversations
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                Messages
              </span>
            </div>
          }
        >
          <ChartContainer
            config={volumeConfig}
            className="mt-6 h-[250px] w-full"
            style={{ aspectRatio: "auto" }}
          >
            <AreaChart
              data={activityData}
              margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
            >
              <defs>
                <linearGradient id="fillConversations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillMessages" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={16}
                tick={{ fill: "hsl(var(--subtle))", fontSize: 10 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={36}
                tick={{ fill: "hsl(var(--subtle))", fontSize: 10 }}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Area
                dataKey="messages"
                type="monotone"
                stroke="#8B5CF6"
                strokeWidth={1.5}
                fill="url(#fillMessages)"
              />
              <Area
                dataKey="conversations"
                type="monotone"
                stroke="#3B82F6"
                strokeWidth={1.5}
                fill="url(#fillConversations)"
              />
            </AreaChart>
          </ChartContainer>
        </Panel>

        <Panel
          title="Message split"
          description="Incoming vs outgoing volume"
        >
          <div className="relative mt-4 h-[180px]">
            <ChartContainer
              config={messageSplitConfig}
              className="h-[180px] w-full"
              style={{ aspectRatio: "auto" }}
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" hideLabel />}
                />
                <Pie
                  data={messageSplit}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={54}
                  outerRadius={78}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  <Cell fill="#3B82F6" />
                  <Cell fill="#8B5CF6" />
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-foreground">
                {formatNumber(metrics.totalMessages)}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-subtle">
                messages
              </span>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {messageSplit.map((row) => {
              const share =
                metrics.totalMessages > 0
                  ? (row.value / metrics.totalMessages) * 100
                  : 0
              return (
                <div
                  key={row.key}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        row.key === "incoming" ? "bg-blue-500" : "bg-purple-500"
                      )}
                    />
                    {row.name}
                  </span>
                  <span className="text-muted-foreground">
                    {formatNumber(row.value)}
                    <span className="ml-1 text-subtle/70">
                      ({share.toFixed(0)}%)
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>
      </div>

      <div className="space-y-3">
        <SectionLabel>Distribution</SectionLabel>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel
          title="Channel breakdown"
          description="Recent conversations by channel"
        >
          <div className="mt-6 space-y-3">
            {channelRows.map((row) => {
              const Icon = row.icon
              const share = (row.count / totalRecent) * 100
              return (
                <div key={row.channel} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Icon className={cn("h-3.5 w-3.5", row.color)} />
                      {row.label}
                    </span>
                    <span className="text-muted-foreground">
                      {row.count}
                      <span className="ml-1 text-subtle/70">
                        ({share.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
                    <div
                      className={cn("h-full rounded-full", row.bar)}
                      style={{
                        width: `${(row.count / maxChannelCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
            {conversations.length === 0 && (
              <p className="py-6 text-center text-xs text-subtle">
                No recent conversations to analyse
              </p>
            )}
          </div>
        </Panel>

        <Panel
          title="Conversation status"
          description="Where recent chats stand today"
        >
          <div className="mt-6 flex h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
            {(Object.keys(statusMeta) as ConversationStatus[]).map((status) => (
              <div
                key={status}
                className={statusMeta[status].bar}
                style={{
                  width: `${(statusCounts[status] / totalRecent) * 100}%`,
                }}
              />
            ))}
          </div>

          <div className="mt-5 space-y-2.5">
            {(Object.keys(statusMeta) as ConversationStatus[]).map((status) => {
              const meta = statusMeta[status]
              const share = (statusCounts[status] / totalRecent) * 100
              return (
                <div
                  key={status}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <span
                      className={cn("h-1.5 w-1.5 rounded-full", meta.dot)}
                    />
                    {meta.label}
                  </span>
                  <span className="text-muted-foreground">
                    {statusCounts[status]}
                    <span className="ml-1 text-subtle/70">
                      ({share.toFixed(0)}%)
                    </span>
                  </span>
                </div>
              )
            })}
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-xl bg-foreground/[0.03] px-3.5 py-2.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">
              {formatNumber(metrics.conversationsThisMonth)} unique users this
              month
            </span>
          </div>
        </Panel>

        <Panel
          title="Conversion funnel"
          description="Conversations that became bookings"
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              {metrics.conversionRate.toFixed(2)}%
            </span>
          }
        >
          <div className="mt-6 space-y-3">
            {funnelRows.map((row) => (
              <div key={row.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium text-foreground">
                    {formatNumber(row.value)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
                  <div
                    className={cn("h-full rounded-full", row.bar)}
                    style={{
                      width: `${(row.value / maxFunnelValue) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-foreground/[0.03] px-3.5 py-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-subtle">
                Meetings
              </p>
              <p className="mt-1 text-[15px] font-semibold tabular-nums text-foreground">
                {formatNumber(metrics.meetings)}
              </p>
            </div>
            <div className="rounded-xl bg-foreground/[0.03] px-3.5 py-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-subtle">
                Calls
              </p>
              <p className="mt-1 text-[15px] font-semibold tabular-nums text-foreground">
                {formatNumber(metrics.calls)}
              </p>
            </div>
          </div>

          <p className="mt-4 text-[10px] leading-relaxed text-subtle/70">
            {formatNumber(totalBookings)} total bookings inferred from AI
            summaries
          </p>
        </Panel>
        </div>
      </div>
    </div>
  )
}
