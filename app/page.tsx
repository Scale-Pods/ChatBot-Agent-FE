import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard"
import { PageHeader } from "@/components/dashboard/page-header"
import { requireUser } from "@/lib/auth/session"
import { getConversations } from "@/lib/chat/data"
import { getChatMetrics } from "@/lib/chat/metrics"

// Chat data changes constantly, so always render with fresh rows.
export const dynamic = "force-dynamic"

const SPARKLINE_DAYS = 12

function lastTwelveDays(): string[] {
  const now = new Date()
  const labels: string[] = []

  for (let offset = SPARKLINE_DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset)
    )
    labels.push(
      date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    )
  }

  return labels
}

export default async function DashboardPage() {
  await requireUser()

  const [chat, metrics] = await Promise.all([
    getConversations({ limit: 40 }),
    getChatMetrics(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Every chatbot metric, channel and conversion in one place."
        action={
          <span className="inline-flex items-center gap-2 rounded-full bg-foreground/[0.04] px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Live · last 12 days
          </span>
        }
      />
      <AnalyticsDashboard
        metrics={metrics}
        conversations={chat.conversations}
        dayLabels={lastTwelveDays()}
      />
    </div>
  )
}
