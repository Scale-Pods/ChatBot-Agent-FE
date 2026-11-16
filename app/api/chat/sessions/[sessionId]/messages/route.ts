import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth/session"
import { getSessionMessages } from "@/lib/chat/data"
import { normalizeRole } from "@/lib/chat/merge"
import { insertChatRow } from "@/lib/chat/rest"

export const dynamic = "force-dynamic"

const MAX_LIMIT = 200
const MAX_MESSAGE_LENGTH = 4_000

// Role values written to `Chat Data`. The bot workflow resumes AI replies when
// it sees the disconnect row.
const AGENT_ROLE = "AGENT"
const BACK_TO_AI_ROLE = "To AI"
const CONNECT_CONTENT = "Connected to chat"
const DISCONNECT_CONTENT = "Disconnect"

interface AgentActionBody {
  action?: "connect" | "message" | "disconnect"
  content?: unknown
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params

  if (!(await getSessionUser())) {
    return NextResponse.json(
      { messages: [], hasMore: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
    return NextResponse.json(
      { messages: [], hasMore: false, error: "Invalid session id" },
      { status: 400 }
    )
  }

  const { searchParams } = new URL(request.url)
  const requested = Number(searchParams.get("limit") ?? 60)
  const limit = Math.min(
    Math.max(Number.isFinite(requested) ? Math.floor(requested) : 60, 1),
    MAX_LIMIT
  )
  const beforeIdRaw = searchParams.get("beforeId")
  const beforeId = beforeIdRaw ? Number(beforeIdRaw) : undefined

  const result = await getSessionMessages(sessionId, {
    limit,
    beforeId: Number.isFinite(beforeId) ? beforeId : undefined,
  })

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  })
}

/**
 * Write an agent reply (or a connect/disconnect marker) to `Chat Data` using
 * the session's existing id. Roles are decided on the server so the browser
 * cannot write arbitrary values.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const agent = await getSessionUser()

  if (!agent) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 })
  }

  const body = (await request.json().catch(() => null)) as AgentActionBody | null
  const action = body?.action

  let role: string
  let content: string

  if (action === "connect") {
    role = AGENT_ROLE
    content = CONNECT_CONTENT
  } else if (action === "disconnect") {
    role = BACK_TO_AI_ROLE
    content = DISCONNECT_CONTENT
  } else if (action === "message") {
    const value = typeof body?.content === "string" ? body.content.trim() : ""

    if (!value) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 })
    }

    role = AGENT_ROLE
    content = value.slice(0, MAX_MESSAGE_LENGTH)
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }

  try {
    const inserted = await insertChatRow({
      session_id: sessionId,
      role,
      content,
      // The agent who clicked "Connect to chat" / sent the reply.
      Agent: agent.name,
    })

    return NextResponse.json(
      {
        id: Number(inserted.id),
        sessionId,
        role: normalizeRole(role),
        content,
        agent: agent.name,
        createdAt: inserted.created_at ?? new Date().toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not save the message to Supabase",
      },
      { status: 502 }
    )
  }
}
