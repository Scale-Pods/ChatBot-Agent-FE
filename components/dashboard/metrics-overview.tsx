"use client"

import { useId } from "react"
import {
  CalendarCheck,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react"

import type { DashboardMetrics } from "@/lib/chat/types"
import { StatStrip, type StatStripItem } from "./stat-strip"

const numberFormatter = new Intl.NumberFormat("en-US")

function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

function Sparkline({
  data,
  color,
}: {
  data: number[]
  color: string
}) {
  const gradientId = useId().replace(/:/g, "")

  if (data.length < 2) return null

  const width = 84
  const height = 30
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - 1 - ((value - min) / range) * (height - 4)
    return { x, y }
  })

  const line = points.map((point) => `${point.x},${point.y}`).join(" ")
  const area = `M0,${height} L${points
    .map((point) => `${point.x},${point.y}`)
    .join(" L")} L${width},${height} Z`
  const last = points[points.length - 1]

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r="2" fill={color} />
    </svg>
  )
}

interface MetricsOverviewProps {
  metrics: DashboardMetrics
}

export function MetricsOverview({ metrics }: MetricsOverviewProps) {
  const items: StatStripItem[] = [
    {
      label: "Conversations",
      value: formatNumber(metrics.totalConversations),
      hint: `${formatNumber(metrics.conversationsThisMonth)} unique users this month`,
      tone: "blue",
      icon: <Users className="h-3.5 w-3.5" />,
      trend: metrics.trends.conversations,
      chart: (
        <Sparkline data={metrics.conversationSparkline} color="#3B82F6" />
      ),
    },
    {
      label: "Messages",
      value: formatNumber(metrics.totalMessages),
      hint: `${formatNumber(metrics.incomingMessages)} in · ${formatNumber(
        metrics.outgoingMessages
      )} out`,
      tone: "violet",
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      trend: metrics.trends.messages,
      chart: <Sparkline data={metrics.messageSparkline} color="#8B5CF6" />,
    },
    {
      label: "Meetings booked",
      value: formatNumber(metrics.meetingsBooked),
      tone: "emerald",
      icon: <CalendarCheck className="h-3.5 w-3.5" />,
      trend: metrics.trends.meetings,
      footer: (
        <p className="flex items-center gap-2 text-[11px] text-subtle">
          <span>
            <span className="font-medium tabular-nums text-muted-foreground">
              {formatNumber(metrics.calls)}
            </span>{" "}
            calls
          </span>
          <span className="h-1 w-1 rounded-full bg-border" aria-hidden="true" />
          <span>
            <span className="font-medium tabular-nums text-muted-foreground">
              {formatNumber(metrics.meetings)}
            </span>{" "}
            meetings
          </span>
        </p>
      ),
    },
    {
      label: "Conversion rate",
      value: `${metrics.conversionRate.toFixed(2)}%`,
      hint: "Conversations to meetings",
      tone: "amber",
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      trend: metrics.trends.conversion,
      chart: <Sparkline data={metrics.conversionSparkline} color="#F59E0B" />,
    },
  ]

  return <StatStrip items={items} />
}
