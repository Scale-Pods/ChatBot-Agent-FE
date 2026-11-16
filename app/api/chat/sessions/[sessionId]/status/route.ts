import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth/session"
import { updateChatRows } from "@/lib/chat/rest"

export const dynamic = "force-dynamic"

const STATUS_VALUES = {
  active: "Active",
  pending: "Pending",
  resolved: "Resolved",
} as const

type StatusKey = keyof typeof STATUS_VALUES

function isStatusKey(value: string): value is StatusKey {
  return value in STATUS_VALUES
}

/**
 * Set the `Status` column for every row of a session. The value is stored in
 * the table's capitalised form (`Resolved`) so the n8n workflow can read it.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params

  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 })
  }

  const body = (await request.json().catch(() => null)) as { status?: unknown } | null
  const requested = typeof body?.status === "string" ? body.status.trim().toLowerCase() : ""

  if (!isStatusKey(requested)) {
    return NextResponse.json(
      { error: "Status must be one of: active, pending, resolved" },
      { status: 400 }
    )
  }

  try {
    const updated = await updateChatRows(
      { session_id: `eq.${sessionId}` },
      { Status: STATUS_VALUES[requested] }
    )

    if (updated.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    return NextResponse.json({
      sessionId,
      status: requested,
      updated: updated.length,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not update the session status in Supabase",
      },
      { status: 502 }
    )
  }
}
