import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth/session"
import { getChatUpdates } from "@/lib/chat/data"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  const afterId = Number(searchParams.get("afterId") ?? 0)
  const limit = Number(searchParams.get("limit") ?? 200)
  const sessionId = searchParams.get("sessionId") ?? undefined

  if (sessionId && !/^[0-9a-f-]{36}$/i.test(sessionId)) {
    return NextResponse.json(
      { rows: [], cursor: 0, hasMore: false, error: "Invalid session id" },
      { status: 400 }
    )
  }

  const result = await getChatUpdates({
    afterId: Number.isFinite(afterId) ? afterId : 0,
    limit: Number.isFinite(limit) ? limit : 200,
    sessionId,
  })

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  })
}
