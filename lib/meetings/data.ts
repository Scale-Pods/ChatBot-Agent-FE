import "server-only"

import { selectChatRows } from "@/lib/chat/rest"
import { isCallResolved } from "./format"
import type { MeetingRecord, ScheduledCall } from "./types"

/**
 * The Meetings page reads two tables that are written by the chatbot
 * workflows. They are configurable so a staging deployment can point at
 * different tables without a code change.
 */
const MEETINGS_TABLE = process.env.SUPABASE_MEETINGS_TABLE?.trim() || "Meetings_Chatbot"
const CALLS_TABLE = process.env.SUPABASE_CALLS_TABLE?.trim() || "Phone_Chatbot"

const MAX_ROWS = 500

export function getMeetingsTable(): string {
  return MEETINGS_TABLE
}

export function getCallsTable(): string {
  return CALLS_TABLE
}

interface RawMeetingRow {
  name: string | null
  phone: string | null
  email: string | null
  consulting_for: string | null
  on_date: string | null
  time_received: string | null
  meeting_link: string | null
}

interface RawCallRow {
  phone: string | null
  name: string | null
  time_received: string | null
  reason: string | null
  status: string | null
  email: string | null
}

export interface MeetingsResult {
  meetings: MeetingRecord[]
  error?: string
}

export interface CallsResult {
  calls: ScheduledCall[]
  error?: string
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/**
 * Neither table has a primary key, so build a stable key from the row's own
 * values. Duplicate rows get a numeric suffix to keep React keys unique.
 */
function makeKey(parts: Array<string | null | undefined>, seen: Map<string, number>): string {
  const base = parts
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join("|") || "row"

  const count = seen.get(base) ?? 0
  seen.set(base, count + 1)

  return count === 0 ? base : `${base}#${count}`
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unexpected error while reading meeting data"
}

function timestamp(value: string | null): number {
  const parsed = Date.parse(value ?? "")
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getMeetings(): Promise<MeetingsResult> {
  try {
    const rows = await selectChatRows<RawMeetingRow>(
      {
        select:
          "name,phone,email,consulting_for,on_date,time_received,meeting_link",
        order: "on_date.desc",
        limit: String(MAX_ROWS),
      },
      MEETINGS_TABLE
    )

    const seen = new Map<string, number>()
    const meetings = rows.map((row) => {
      const name = clean(row.name)
      const phone = clean(row.phone)
      const email = clean(row.email)

      return {
        id: makeKey(
          [clean(row.time_received), phone, email, name, clean(row.on_date)],
          seen
        ),
        name: name || email || phone || "Unknown customer",
        phone,
        email,
        consultingFor: clean(row.consulting_for),
        onDate: clean(row.on_date),
        timeReceived: clean(row.time_received),
        meetingLink: clean(row.meeting_link),
      } satisfies MeetingRecord
    })

    // Upcoming meetings first (soonest on top), then past meetings newest first.
    const now = Date.now()
    meetings.sort((a, b) => {
      const aTime = timestamp(a.onDate)
      const bTime = timestamp(b.onDate)

      if (!aTime && !bTime) return 0
      if (!aTime) return 1
      if (!bTime) return -1

      const aUpcoming = aTime >= now
      const bUpcoming = bTime >= now

      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1

      return aUpcoming ? aTime - bTime : bTime - aTime
    })

    return { meetings }
  } catch (error) {
    return { meetings: [], error: errorMessage(error) }
  }
}

export async function getScheduledCalls(): Promise<CallsResult> {
  try {
    const rows = await selectChatRows<RawCallRow>(
      {
        select: "phone,name,time_received,reason,status,email",
        order: "time_received.desc",
        limit: String(MAX_ROWS),
      },
      CALLS_TABLE
    )

    const seen = new Map<string, number>()
    const calls = rows.map((row) => {
      const name = clean(row.name)
      const phone = clean(row.phone)
      const email = clean(row.email)

      return {
        id: makeKey([clean(row.time_received), phone, email, name], seen),
        name: name || phone || email || "Unknown customer",
        phone,
        email,
        reason: clean(row.reason),
        timeReceived: clean(row.time_received),
        status: clean(row.status),
      } satisfies ScheduledCall
    })

    // Calls that still need an agent stay on top.
    calls.sort((a, b) => {
      const aPending = isCallResolved(a.status) ? 1 : 0
      const bPending = isCallResolved(b.status) ? 1 : 0

      if (aPending !== bPending) return aPending - bPending

      return timestamp(b.timeReceived) - timestamp(a.timeReceived)
    })

    return { calls }
  } catch (error) {
    return { calls: [], error: errorMessage(error) }
  }
}
