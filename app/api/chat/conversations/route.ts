import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth/session"
import { getConversations } from "@/lib/chat/data"

export const dynamic = "force-dynamic"

const MAX_LIMIT = 100

export async function GET(request: Request) {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const requested = Number(searchParams.get("limit") ?? 30)
  const limit = Math.min(
    Math.max(Number.isFinite(requested) ? Math.floor(requested) : 30, 1),
    MAX_LIMIT
  )

  const result = await getConversations({ limit })

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  })
}
