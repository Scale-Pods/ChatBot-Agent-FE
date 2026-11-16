import type { CallState, MeetingState } from "./types"

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

/**
 * Formats an ISO timestamp using the wall-clock time written in the string
 * instead of converting it to the viewer's timezone.
 *
 * `Meetings_Chatbot.on_date` and `Phone_Chatbot.time_received` are stored with
 * the offset the customer picked (for example `2026-11-12T12:00:00+05:30`).
 * Showing 12:00 PM is what the customer and the agent expect, and keeping the
 * output timezone-independent also avoids server/client hydration mismatches.
 */
export function formatWallClock(
  value: string | null | undefined,
  { withWeekday = false, withYear = false }: { withWeekday?: boolean; withYear?: boolean } = {}
): string {
  const raw = (value ?? "").trim()
  if (!raw) return "—"

  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(raw)

  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const hour = match[4] === undefined ? null : Number(match[4])
    const minute = match[5] === undefined ? null : Number(match[5])

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
      const dateLabel = withYear
        ? `${MONTHS[month - 1]} ${day}, ${year}`
        : `${MONTHS[month - 1]} ${day}`

      if (hour === null || minute === null) {
        return withWeekday ? `${weekday}, ${dateLabel}` : dateLabel
      }

      if (hour <= 23 && minute <= 59) {
        const hour12 = hour % 12 || 12
        const time = `${hour12}:${pad(minute)} ${hour < 12 ? "AM" : "PM"}`
        const prefix = withWeekday ? `${weekday}, ` : ""

        return `${prefix}${dateLabel} · ${time}`
      }
    }
  }

  const parsed = Date.parse(raw)
  if (!Number.isFinite(parsed)) return raw

  return new Date(parsed).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/** `scheduled` while `on_date` is in the future, `completed` once it has passed. */
export function getMeetingState(
  onDate: string | null | undefined,
  now: number = Date.now()
): MeetingState {
  if (!onDate) return "unknown"

  const parsed = Date.parse(onDate)
  if (!Number.isFinite(parsed)) return "unknown"

  return parsed >= now ? "scheduled" : "completed"
}

/**
 * The `Phone_Chatbot.status` column is empty until an agent communicates with
 * the customer. Any value means the call has been handled.
 */
export function getCallState(status: string | null | undefined): CallState {
  return (status ?? "").trim() ? "resolved" : "pending"
}

export function isCallResolved(status: string | null | undefined): boolean {
  return getCallState(status) === "resolved"
}

export function callStatusLabel(status: string | null | undefined): string {
  const value = (status ?? "").trim()
  if (!value) return "Not contacted"
  if (value.toLowerCase() === "resolved") return "Resolved"
  if (value.toLowerCase() === "pending") return "Not contacted"

  return value
}

/** Only allow real http(s) links in `meeting_link`. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim()
  if (!raw) return null

  try {
    const url = new URL(raw)
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}
