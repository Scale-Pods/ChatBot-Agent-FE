import "server-only"

import { selectChatRows } from "./rest"
import {
  createConversation,
  deriveAgentConnected,
  isDisconnectNotice,
  normalizeRole,
  rowToMessage,
  timeValue,
} from "./merge"
import type { ChatMessage, ChatRowDTO, Conversation } from "./types"

interface RawChatRow {
  id: number | string | null
  session_id: string | null
  role: string | null
  content: string | null
  created_at: string | null
  Name: string | null
  Phone: string | null
  Email: string | null
  Status: string | null
  Agent: string | null
}

const COLUMNS = "id,session_id,role,content,created_at,Name,Phone,Email,Status,Agent"

const DEFAULT_LIMIT = 30
const DEFAULT_PAGE_SIZE = 200
const DEFAULT_MAX_PAGES = 3
const MAX_MESSAGES = 60
const MAX_DELTA_ROWS = 200

export interface ConversationListResult {
  conversations: Conversation[]
  /** Highest row id included in the payload — used as the realtime cursor. */
  cursor: number
  error?: string
}

export interface SessionMessagesResult {
  messages: ChatMessage[]
  hasMore: boolean
  /** True while a human agent owns the chat, checked against the whole session. */
  agentConnected: boolean
  /** Latest `role = summary` row, used as the chat context header. */
  summary?: string
  error?: string
}

export interface ChatUpdatesResult {
  rows: ChatRowDTO[]
  cursor: number
  hasMore: boolean
  error?: string
}

function toRowDTO(row: RawChatRow): ChatRowDTO | null {
  const id = Number(row.id)

  if (!Number.isFinite(id) || !row.session_id) return null

  return {
    id,
    sessionId: row.session_id,
    role: normalizeRole(row.role),
    content: row.content ?? "",
    createdAt: row.created_at ?? new Date(0).toISOString(),
    name: row.Name,
    phone: row.Phone,
    email: row.Email,
    status: row.Status,
    agent: row.Agent,
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error while reading chat data"
}

/**
 * Whether a human agent currently owns the chat.
 *
 * The dashboard writes an `AGENT` row when an agent connects and a `To AI`
 * row (content `Disconnect`) when they hand the chat back. Comparing the
 * newest of those rows means the state survives reloads and is shared between
 * agents instead of living only in the browser.
 */
async function getAgentConnected(
  sessionId: string
): Promise<boolean | undefined> {
  try {
    const baseQuery: Record<string, string> = {
      select: COLUMNS,
      session_id: `eq.${sessionId}`,
      order: "created_at.desc,id.desc",
      limit: "1",
    }

    const [agentRows, disconnectRows] = await Promise.all([
      selectChatRows<RawChatRow>({ ...baseQuery, role: "ilike.*agent*" }),
      selectChatRows<RawChatRow>({
        ...baseQuery,
        content: "ilike.*disconnect*",
        limit: "100",
      }),
    ])

    const latestAgent = agentRows[0]
    if (!latestAgent) return false

    // Ignore a customer message that happens to contain "disconnect".
    const latestDisconnect = disconnectRows
      .map(toRowDTO)
      .filter((row): row is ChatRowDTO => row !== null && isDisconnectNotice(row))
      .sort(
        (a, b) => timeValue(b.createdAt) - timeValue(a.createdAt) || b.id - a.id
      )[0]

    if (!latestDisconnect) return true

    const agentTime = timeValue(latestAgent.created_at)
    const disconnectTime = timeValue(latestDisconnect.createdAt)

    if (agentTime !== disconnectTime) return agentTime > disconnectTime

    return Number(latestAgent.id) > latestDisconnect.id
  } catch {
    // A failed probe should not break the thread; the caller falls back to
    // deriving the state from the loaded page.
    return undefined
  }
}

/**
 * Conversation list.
 *
 * Instead of selecting every row in the table we scan a bounded window of the
 * newest messages (newest first) and group them by `session_id`. The window is
 * capped so a chatty session can never make the initial load slow, while the
 * page count heuristic keeps enough distinct sessions available to fill the
 * sidebar.
 */
export async function getConversations({
  limit = DEFAULT_LIMIT,
  pageSize = DEFAULT_PAGE_SIZE,
  maxPages = DEFAULT_MAX_PAGES,
}: {
  limit?: number
  pageSize?: number
  maxPages?: number
} = {}): Promise<ConversationListResult> {
  try {
    const rows: RawChatRow[] = []

    for (let page = 0; page < maxPages; page += 1) {
      const batch = await selectChatRows<RawChatRow>({
        select: COLUMNS,
        order: "created_at.desc,id.desc",
        limit: String(pageSize),
        offset: String(page * pageSize),
      })

      rows.push(...batch)

      if (batch.length < pageSize) break

      const distinctSessions = new Set(rows.map((row) => row.session_id)).size
      if (page > 0 && distinctSessions >= limit && rows.length >= limit * 3) break
    }

    if (rows.length === 0) return { conversations: [], cursor: 0 }

    const grouped = new Map<string, ChatRowDTO[]>()
    let cursor = 0

    for (const raw of rows) {
      const row = toRowDTO(raw)
      if (!row) continue

      cursor = Math.max(cursor, row.id)
      const bucket = grouped.get(row.sessionId)
      if (bucket) bucket.push(row)
      else grouped.set(row.sessionId, [row])
    }

    const conversations = [...grouped.entries()]
      .map(([sessionId, sessionRows]) => createConversation(sessionId, sessionRows))
      .sort((a, b) => timeValue(b.lastActivity) - timeValue(a.lastActivity))
      .slice(0, limit)

    return { conversations, cursor }
  } catch (error) {
    return { conversations: [], cursor: 0, error: errorMessage(error) }
  }
}

/**
 * Messages for a single session, newest page first, returned in ascending
 * order for rendering. Pass `beforeId` to fetch the previous page.
 */
export async function getSessionMessages(
  sessionId: string,
  { limit = MAX_MESSAGES, beforeId }: { limit?: number; beforeId?: number } = {}
): Promise<SessionMessagesResult> {
  try {
    const pageQuery: Record<string, string> = {
      select: COLUMNS,
      session_id: `eq.${sessionId}`,
      order: "id.desc",
      limit: String(limit + 1),
    }

    if (beforeId && Number.isFinite(beforeId)) pageQuery.id = `lt.${beforeId}`

    const summaryQuery: Record<string, string> = {
      select: COLUMNS,
      session_id: `eq.${sessionId}`,
      role: "ilike.*summary*",
      order: "created_at.desc",
      limit: "1",
    }

    const [pageRows, summaryRows, agentState] = await Promise.all([
      selectChatRows<RawChatRow>(pageQuery),
      selectChatRows<RawChatRow>(summaryQuery),
      getAgentConnected(sessionId),
    ])

    const summary = summaryRows
      .map(toRowDTO)
      .find((row): row is ChatRowDTO => row !== null && row.role === "summary")
      ?.content.trim()

    // Summary rows are context, not messages.
    const rowsDesc = pageRows
      .map(toRowDTO)
      .filter((row): row is ChatRowDTO => row !== null && row.role !== "summary")

    const hasMore = rowsDesc.length > limit
    const page = hasMore ? rowsDesc.slice(0, limit) : rowsDesc

    const messages = page
      .map(rowToMessage)
      .sort((a, b) => a.id - b.id)

    // The dedicated probe covers the whole session; the page is a safe
    // fallback when that extra request fails.
    const agentConnected = agentState ?? deriveAgentConnected(page)

    return { messages, hasMore, agentConnected, summary: summary || undefined }
  } catch (error) {
    return {
      messages: [],
      hasMore: false,
      agentConnected: false,
      error: errorMessage(error),
    }
  }
}

/**
 * Incremental updates: only rows whose identity id is greater than the cursor
 * are returned. This keeps polling cheap (a few hundred bytes when nothing
 * changed) and guarantees that every new message is picked up at least once.
 */
export async function getChatUpdates({
  afterId,
  limit = MAX_DELTA_ROWS,
  sessionId,
}: {
  afterId: number
  limit?: number
  sessionId?: string
}): Promise<ChatUpdatesResult> {
  const safeAfterId = Number.isFinite(afterId) && afterId > 0 ? Math.floor(afterId) : 0
  const safeLimit = Math.min(Math.max(Math.floor(limit) || MAX_DELTA_ROWS, 1), 500)

  try {
    const query: Record<string, string> = {
      select: COLUMNS,
      order: "id.asc",
      limit: String(safeLimit),
    }

    if (safeAfterId > 0) query.id = `gt.${safeAfterId}`
    if (sessionId) query.session_id = `eq.${sessionId}`

    const rawRows = await selectChatRows<RawChatRow>(query)
    const rows = rawRows
      .map(toRowDTO)
      .filter((row): row is ChatRowDTO => row !== null)

    const cursor = rows.reduce((max, row) => Math.max(max, row.id), safeAfterId)

    return { rows, cursor, hasMore: rawRows.length === safeLimit }
  } catch (error) {
    return { rows: [], cursor: safeAfterId, hasMore: false, error: errorMessage(error) }
  }
}
