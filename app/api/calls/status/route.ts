import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth/session"
import { updateChatRows } from "@/lib/chat/rest"
import { getCallsTable } from "@/lib/meetings/data"
import { syncCallStatusToSheets } from "@/lib/meetings/sheets"

export const dynamic = "force-dynamic"

interface CallStatusBody {
  phone?: unknown
  name?: unknown
  email?: unknown
  reason?: unknown
  timeReceived?: unknown
  status?: unknown
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

/**
 * Persist a scheduled call's status and mirror it to Google Sheets.
 *
 * `Phone_Chatbot` has no primary key, so the row is identified by its own
 * values. `time_received` is the strongest identifier, with phone/email as a
 * fallback for older rows that are missing it.
 */
export async function PATCH(request: Request) {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as CallStatusBody | null
  const requested = text(body?.status)?.toLowerCase()

  if (requested !== "resolved" && requested !== "pending") {
    return NextResponse.json(
      { error: "status must be either 'resolved' or 'pending'" },
      { status: 400 }
    )
  }

  const phone = text(body?.phone)
  const email = text(body?.email)
  const name = text(body?.name)
  const reason = text(body?.reason)
  const timeReceived = text(body?.timeReceived)

  const filters: Record<string, string> = {}

  if (timeReceived) filters.time_received = `eq.${timeReceived}`
  if (phone) filters.phone = `eq.${phone}`
  if (Object.keys(filters).length === 0 && email) filters.email = `eq.${email}`

  if (Object.keys(filters).length === 0) {
    return NextResponse.json(
      { error: "Not enough information to identify the scheduled call" },
      { status: 400 }
    )
  }

  // `null` clears the status, which the dashboard reads as "not contacted yet".
  const nextStatus = requested === "resolved" ? "Resolved" : null

  try {
    const updated = await updateChatRows(
      filters,
      { status: nextStatus },
      getCallsTable()
    )

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "The scheduled call could not be found" },
        { status: 404 }
      )
    }

    const sheets = await syncCallStatusToSheets({
      phone,
      name,
      email,
      reason,
      timeReceived,
      status: nextStatus,
    })

    return NextResponse.json({
      ok: true,
      status: requested,
      updated: updated.length,
      sheets,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not update the call status in Supabase",
      },
      { status: 502 }
    )
  }
}
