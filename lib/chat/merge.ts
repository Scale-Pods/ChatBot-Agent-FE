import type {
  ChatMessage,
  ChatRole,
  ChatRowDTO,
  Conversation,
  ConversationStatus,
} from "./types"

export const ACTIVE_WINDOW_MS = 15 * 60 * 1000
export const PENDING_WINDOW_MS = 24 * 60 * 60 * 1000
const UNREAD_WINDOW_MS = 10 * 60 * 1000
const MAX_THREAD_MESSAGES = 400

/**
 * Markers the bot workflow and this dashboard write to `Chat Data` when a
 * human takes over (or hands the chat back to the AI). They are stored as
 * ordinary rows, so they survive reloads and are shared by every agent.
 */
const CONNECT_CONTENTS = new Set([
  "connected to chat",
  "agent connected",
  "an agent just joined",
  "an agent just joined the conversation",
])

const DISCONNECT_CONTENTS = new Set([
  "disconnect",
  "disconnected",
  "agent disconnected",
  "back to ai",
  "to ai",
])

export function normalizeRole(role: string | null | undefined): ChatRole {
  const value = (role ?? "").trim().toLowerCase()

  if (["user", "customer", "visitor", "client"].includes(value)) return "user"
  if (["agent", "admin", "support", "operator", "human_agent"].includes(value)) return "agent"
  if (
    [
      "system",
      "tool",
      "event",
      "info",
      "to ai",
      "to_ai",
      "toai",
      "handoff",
      "handoff_to_ai",
    ].includes(value)
  ) {
    return "system"
  }
  if (["summary", "chat_summary", "context", "conversation_summary"].includes(value)) {
    return "summary"
  }
  if (["assistant", "ai", "bot", "model", "chatbot"].includes(value)) return "ai"

  return value ? "ai" : "system"
}

/**
 * True for the explicit "agent joined" row, which the workspace renders as a
 * centred notice instead of a chat bubble.
 */
export function isConnectNotice(message: {
  role: ChatRole
  content: string
}): boolean {
  const content = message.content.trim().toLowerCase()

  if (!content || DISCONNECT_CONTENTS.has(content)) return false

  return CONNECT_CONTENTS.has(content) && message.role !== "user"
}

/** True for the "back to AI" row written when an agent disconnects. */
export function isDisconnectNotice(message: {
  role: ChatRole
  content: string
}): boolean {
  // A customer typing "disconnect" must not end the takeover.
  return (
    message.role !== "user" &&
    DISCONNECT_CONTENTS.has(message.content.trim().toLowerCase())
  )
}

/**
 * Replay a thread in order and return whether an agent is currently in
 * control. The newest connect/disconnect marker wins.
 */
export function deriveAgentConnected(
  messages: Array<{ role: ChatRole; content: string }>
): boolean {
  let connected = false

  for (const message of messages) {
    if (isDisconnectNotice(message)) connected = false
    // Any agent reply also proves a human is in control.
    else if (isConnectNotice(message) || message.role === "agent") connected = true
  }

  return connected
}

export function timeValue(iso: string | null | undefined): number {
  if (!iso) return 0
  const parsed = Date.parse(iso)
  return Number.isFinite(parsed) ? parsed : 0
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function getConversationStatus(
  iso: string,
  now: number = Date.now()
): ConversationStatus {
  const age = now - timeValue(iso)

  if (age <= ACTIVE_WINDOW_MS) return "active"
  if (age <= PENDING_WINDOW_MS) return "pending"

  return "resolved"
}

/**
 * Normalise the value of the `Status` column. Workflows may write anything
 * from `Resolved` to `closed`, so accept the common spellings.
 */
export function normalizeStatus(
  value: string | null | undefined
): ConversationStatus | undefined {
  const text = (value ?? "").trim().toLowerCase()

  if (!text) return undefined
  if (["resolved", "closed", "done", "complete", "completed"].includes(text)) {
    return "resolved"
  }
  if (["pending", "waiting", "in progress", "in_progress"].includes(text)) {
    return "pending"
  }
  if (["active", "open", "new", "ongoing"].includes(text)) return "active"

  return undefined
}

/** Newest row that carries a value in the `Status` column. */
function latestStoredStatus(rows: ChatRowDTO[]): ConversationStatus | undefined {
  let newest: ChatRowDTO | undefined

  for (const row of rows) {
    if (!normalizeStatus(row.status)) continue

    if (
      !newest ||
      timeValue(row.createdAt) > timeValue(newest.createdAt) ||
      (timeValue(row.createdAt) === timeValue(newest.createdAt) && row.id > newest.id)
    ) {
      newest = row
    }
  }

  return normalizeStatus(newest?.status)
}

function compareRowsAsc(a: ChatRowDTO, b: ChatRowDTO): number {
  return timeValue(a.createdAt) - timeValue(b.createdAt) || a.id - b.id
}

function byRecency(a: Conversation, b: Conversation): number {
  return timeValue(b.lastActivity) - timeValue(a.lastActivity)
}

function hasContact(row: ChatRowDTO): boolean {
  return Boolean(row.name?.trim() || row.phone?.trim() || row.email?.trim())
}

export function rowToMessage(row: ChatRowDTO): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.createdAt,
    agent: row.agent?.trim() || undefined,
  }
}

/**
 * Build a conversation from one or more rows that belong to the same session.
 * Messages are loaded lazily (see `mergeThreadMessages`) so the sidebar stays
 * lightweight no matter how long a conversation is.
 */
export function createConversation(sessionId: string, rows: ChatRowDTO[]): Conversation {
  const summaryRow = [...rows]
    .reverse()
    .find((row) => row.role === "summary" && row.content.trim())

  // `summary` rows are conversation context, not chat messages.
  const messageRows = rows.filter((row) => row.role !== "summary")
  const ordered = [...messageRows].sort(compareRowsAsc)
  const latest = ordered[ordered.length - 1]
  const first = ordered[0]
  const contact = [...rows].reverse().find(hasContact)
  const name = contact?.name?.trim() || "Anonymous visitor"
  const lastActivity =
    latest?.createdAt ?? summaryRow?.createdAt ?? new Date().toISOString()

  return {
    id: sessionId,
    sessionId,
    user: {
      id: sessionId,
      name,
      email: contact?.email?.trim() || undefined,
      phone: contact?.phone?.trim() || undefined,
      avatar: getInitials(name),
    },
    channel: "website",
    lastMessage:
      latest?.content?.trim() || summaryRow?.content.trim() || "(no message)",
    lastActivity,
    firstContacted: first?.createdAt ?? lastActivity,
    status: latestStoredStatus(rows) ?? getConversationStatus(lastActivity),
    unread:
      latest?.role === "user" &&
      Date.now() - timeValue(lastActivity) <= UNREAD_WINDOW_MS,
    messages: [],
    messagesLoaded: false,
    hasMore: false,
    agentConnected: deriveAgentConnected(ordered),
    summary: summaryRow?.content.trim() || undefined,
  }
}

/**
 * Merge a batch of new rows into the existing conversation list.
 *
 * Only the affected conversations are replaced, open threads receive the new
 * messages in place and everything is re-sorted by `created_at` so the newest
 * conversation always stays at the top.
 */
export function applyChatDelta(
  conversations: Conversation[],
  rows: ChatRowDTO[],
  selectedId: string | null
): Conversation[] {
  if (rows.length === 0) return conversations

  const grouped = new Map<string, ChatRowDTO[]>()
  for (const row of rows) {
    const bucket = grouped.get(row.sessionId)
    if (bucket) bucket.push(row)
    else grouped.set(row.sessionId, [row])
  }

  const next = conversations.map((conversation) => ({
    ...conversation,
    user: { ...conversation.user },
  }))
  const index = new Map(next.map((conversation) => [conversation.id, conversation]))

  for (const [sessionId, sessionRows] of grouped) {
    const ordered = [...sessionRows].sort(compareRowsAsc)
    const summaryRow = [...ordered]
      .reverse()
      .find((row) => row.role === "summary" && row.content.trim())
    const messageRows = ordered.filter((row) => row.role !== "summary")
    const latest = messageRows[messageRows.length - 1]
    const storedStatus = latestStoredStatus(ordered)

    let conversation = index.get(sessionId)

    if (!conversation) {
      conversation = createConversation(sessionId, ordered)
      index.set(sessionId, conversation)
      next.push(conversation)
    } else {
      if (summaryRow) conversation.summary = summaryRow.content.trim()

      if (latest && timeValue(latest.createdAt) >= timeValue(conversation.lastActivity)) {
        conversation.lastMessage = latest.content.trim() || conversation.lastMessage
        conversation.lastActivity = latest.createdAt

        // A resolved conversation stays resolved until the status column says
        // otherwise, so new messages don't undo an agent's resolution.
        if (!storedStatus && conversation.status !== "resolved") {
          conversation.status = getConversationStatus(latest.createdAt)
        }
      }

      if (storedStatus) conversation.status = storedStatus

      const contact = [...ordered].reverse().find(hasContact)
      if (contact) {
        const name = contact.name?.trim() || conversation.user.name
        conversation.user.name = name
        conversation.user.avatar = getInitials(name)
        conversation.user.email = contact.email?.trim() || conversation.user.email
        conversation.user.phone = contact.phone?.trim() || conversation.user.phone
      }

      if (
        (conversation.messagesLoaded || sessionId === selectedId) &&
        messageRows.length > 0
      ) {
        const known = new Set(conversation.messages.map((message) => message.id))
        const additions = messageRows
          .filter((row) => !known.has(row.id))
          .map(rowToMessage)

        if (additions.length > 0) {
          conversation.messages = [
            ...conversation.messages,
            ...additions,
          ].slice(-MAX_THREAD_MESSAGES)
        }
      }
    }

    // Keep the human-takeover state in sync as connect/disconnect rows arrive.
    for (const row of ordered) {
      if (isDisconnectNotice(row)) conversation.agentConnected = false
      else if (isConnectNotice(row) || row.role === "agent") {
        conversation.agentConnected = true
      }
    }

    if (latest) {
      conversation.unread = sessionId !== selectedId && latest.role === "user"
    }
  }

  return next.sort(byRecency)
}

/**
 * Merge a page of messages into a conversation thread without dropping any
 * message that arrived through the realtime delta in the meantime.
 */
export function mergeThreadMessages(
  conversation: Conversation,
  incoming: ChatMessage[],
  hasMore: boolean,
  summary?: string,
  agentConnected?: boolean
): Conversation {
  const byId = new Map<number, ChatMessage>()

  for (const message of conversation.messages) byId.set(message.id, message)
  for (const message of incoming) byId.set(message.id, message)

  const messages = [...byId.values()]
    .sort((a, b) => a.id - b.id)
    .slice(-MAX_THREAD_MESSAGES)

  return {
    ...conversation,
    messages,
    messagesLoaded: true,
    hasMore,
    // The server checks the whole session, so a page that starts after the
    // connect marker cannot accidentally mark the chat as disconnected.
    agentConnected: agentConnected ?? conversation.agentConnected,
    summary: summary?.trim() || conversation.summary,
  }
}
