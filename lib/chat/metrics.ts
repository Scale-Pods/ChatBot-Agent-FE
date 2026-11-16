import "server-only"

import { countChatRows, selectChatRows } from "./rest"
import { normalizeRole, timeValue } from "./merge"
import type { DashboardMetrics, MetricTrend } from "./types"

const PAGE_SIZE = 1_000
const MAX_PAGES = 100
const CACHE_TTL_MS = 30_000
const SPARKLINE_DAYS = 12

interface RawMetricRow {
  id: number | string
  session_id: string | null
  role: string | null
  created_at: string | null
}

interface RawSummaryRow {
  id: number | string
  session_id: string | null
  content: string | null
  created_at: string | null
}

type ConversionKind = "meeting" | "call"

const MEETING_TERMS =
  /\b(meeting|demo|appointment|discovery call|kickoff|onboarding call)\b/i
const BOOKED_TERMS =
  /\b(booked|booking|scheduled|schedule|confirmed|confirm|arranged|reserved|fixed)\b/i
const CALL_TERMS = /\b(call|phone|callback|call back|dial)\b/i
const NEGATED_BOOKING =
  /(\b(no|not|never|without)\b[^.]{0,40}\b(meeting|call|demo|appointment|booking)\b)|(\b(meeting|call|demo|appointment|booking)\b[^.]{0,20}\b(not|wasn't|isn't|never)\b)/i

let cache: { value: DashboardMetrics; expiresAt: number } | null = null

export function emptyMetrics(): DashboardMetrics {
  return {
    totalConversations: 0,
    conversationsThisMonth: 0,
    totalMessages: 0,
    incomingMessages: 0,
    outgoingMessages: 0,
    meetingsBooked: 0,
    calls: 0,
    meetings: 0,
    conversionRate: 0,
    conversationSparkline: Array.from({ length: SPARKLINE_DAYS }, () => 0),
    messageSparkline: Array.from({ length: SPARKLINE_DAYS }, () => 0),
    conversionSparkline: Array.from({ length: SPARKLINE_DAYS }, () => 0),
    trends: {},
  }
}

/**
 * The `Chat Data` table has no meeting/call column, so bookings are inferred
 * from the AI summary rows: a summary that mentions a meeting (or call) which
 * was booked/scheduled/confirmed counts as one conversion for that session.
 */
function classifySummary(text: string | null): ConversionKind | null {
  const value = (text ?? "").trim()
  if (!value) return null
  if (NEGATED_BOOKING.test(value)) return null
  if (!BOOKED_TERMS.test(value)) return null
  if (MEETING_TERMS.test(value)) return "meeting"
  if (CALL_TERMS.test(value)) return "call"

  return null
}

function makeTrend(current: number, previous: number): MetricTrend | undefined {
  if (previous <= 0) return undefined

  const change = ((current - previous) / previous) * 100
  if (!Number.isFinite(change) || Math.abs(change) < 0.05) return undefined

  return {
    value: `${change > 0 ? "+" : ""}${change.toFixed(1)}%`,
    positive: change >= 0,
  }
}

function monthBounds(now: Date) {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()

  return {
    currentStart: Date.UTC(year, month, 1),
    nextStart: Date.UTC(year, month + 1, 1),
    previousStart: Date.UTC(year, month - 1, 1),
  }
}

function dayBuckets(now: Date) {
  const keys: string[] = []

  for (let offset = SPARKLINE_DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset)
    )
    keys.push(date.toISOString().slice(0, 10))
  }

  return {
    index: new Map(keys.map((key, position) => [key, position])),
    size: keys.length,
  }
}

async function fetchAllRows<T>(
  select: string,
  filter: Record<string, string>,
  total: number
): Promise<T[]> {
  const pages = Math.min(Math.max(Math.ceil(total / PAGE_SIZE), 1), MAX_PAGES)

  const batches = await Promise.all(
    Array.from({ length: pages }, (_, page) =>
      selectChatRows<T>({
        select,
        ...filter,
        order: "id.asc",
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      })
    )
  )

  return batches.flat()
}

function trackConversion(
  target: Map<string, ConversionKind>,
  sessionId: string,
  kind: ConversionKind
) {
  const existing = target.get(sessionId)
  if (existing === "meeting") return
  if (kind === "meeting" || !existing) target.set(sessionId, kind)
}

async function computeMetrics(): Promise<DashboardMetrics> {
  const now = new Date()

  const [rowCount, summaryCount] = await Promise.all([
    countChatRows({ select: "id" }),
    countChatRows({ select: "id", role: "ilike.*summary*" }),
  ])

  const [rows, summaryRows] = await Promise.all([
    fetchAllRows<RawMetricRow>(
      "id,session_id,role,created_at",
      {},
      rowCount
    ),
    fetchAllRows<RawSummaryRow>(
      "id,session_id,content,created_at",
      { role: "ilike.*summary*" },
      summaryCount
    ),
  ])

  const { currentStart, nextStart, previousStart } = monthBounds(now)
  const buckets = dayBuckets(now)

  const allSessions = new Set<string>()
  const sessionsThisMonth = new Set<string>()
  const sessionsPreviousMonth = new Set<string>()
  const conversationsByDay = Array.from({ length: buckets.size }, () => new Set<string>())
  const messagesByDay = Array.from({ length: buckets.size }, () => 0)

  let incomingMessages = 0
  let outgoingMessages = 0
  let totalMessages = 0
  let messagesThisMonth = 0
  let messagesPreviousMonth = 0

  for (const row of rows) {
    if (!row.session_id) continue

    allSessions.add(row.session_id)

    const createdAt = timeValue(row.created_at)
    const role = normalizeRole(row.role)
    const day = buckets.index.get((row.created_at ?? "").slice(0, 10))

    if (createdAt >= currentStart && createdAt < nextStart) {
      sessionsThisMonth.add(row.session_id)
    } else if (createdAt >= previousStart && createdAt < currentStart) {
      sessionsPreviousMonth.add(row.session_id)
    }

    if (role === "summary") continue

    totalMessages += 1
    if (role === "user") incomingMessages += 1
    if (role === "ai" || role === "agent") outgoingMessages += 1

    if (createdAt >= currentStart && createdAt < nextStart) messagesThisMonth += 1
    else if (createdAt >= previousStart && createdAt < currentStart) messagesPreviousMonth += 1

    if (day !== undefined) {
      conversationsByDay[day].add(row.session_id)
      messagesByDay[day] += 1
    }
  }

  const conversions = new Map<string, ConversionKind>()
  const conversionsThisMonth = new Map<string, ConversionKind>()
  const conversionsPreviousMonth = new Map<string, ConversionKind>()
  const conversionsByDay = Array.from({ length: buckets.size }, () => new Set<string>())

  const orderedSummaries = [...summaryRows].sort(
    (a, b) => timeValue(a.created_at) - timeValue(b.created_at)
  )

  for (const summary of orderedSummaries) {
    if (!summary.session_id) continue

    const kind = classifySummary(summary.content)
    if (!kind) continue

    trackConversion(conversions, summary.session_id, kind)

    const createdAt = timeValue(summary.created_at)
    if (createdAt >= currentStart && createdAt < nextStart) {
      trackConversion(conversionsThisMonth, summary.session_id, kind)
    } else if (createdAt >= previousStart && createdAt < currentStart) {
      trackConversion(conversionsPreviousMonth, summary.session_id, kind)
    }

    const day = buckets.index.get((summary.created_at ?? "").slice(0, 10))
    if (day !== undefined) conversionsByDay[day].add(summary.session_id)
  }

  let calls = 0
  let meetings = 0
  for (const kind of conversions.values()) {
    if (kind === "meeting") meetings += 1
    else calls += 1
  }

  const totalConversations = allSessions.size
  const meetingsBooked = conversions.size
  const conversionRate =
    totalConversations > 0 ? (meetingsBooked / totalConversations) * 100 : 0

  const conversionRateThisMonth =
    sessionsThisMonth.size > 0
      ? (conversionsThisMonth.size / sessionsThisMonth.size) * 100
      : 0
  const conversionRatePreviousMonth =
    sessionsPreviousMonth.size > 0
      ? (conversionsPreviousMonth.size / sessionsPreviousMonth.size) * 100
      : 0

  return {
    totalConversations,
    conversationsThisMonth: sessionsThisMonth.size,
    totalMessages,
    incomingMessages,
    outgoingMessages,
    meetingsBooked,
    calls,
    meetings,
    conversionRate,
    conversationSparkline: conversationsByDay.map((day) => day.size),
    messageSparkline: messagesByDay,
    conversionSparkline: conversionsByDay.map((day) => day.size),
    trends: {
      conversations: makeTrend(sessionsThisMonth.size, sessionsPreviousMonth.size),
      messages: makeTrend(messagesThisMonth, messagesPreviousMonth),
      meetings: makeTrend(conversionsThisMonth.size, conversionsPreviousMonth.size),
      conversion: makeTrend(conversionRateThisMonth, conversionRatePreviousMonth),
    },
  }
}

/**
 * Dashboard totals for the `Chat Data` table. Cached briefly so the chart
 * cards don't re-scan the table on every request.
 */
export async function getChatMetrics(): Promise<DashboardMetrics> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache.value

  try {
    const value = await computeMetrics()
    cache = { value, expiresAt: now + CACHE_TTL_MS }
    return value
  } catch {
    return emptyMetrics()
  }
}
