export type ChatRole = "user" | "ai" | "agent" | "system" | "summary"

export type ChatChannel = "website" | "whatsapp" | "instagram" | "gmail"

export type ConversationStatus = "active" | "pending" | "resolved"

export interface ChatMessage {
  id: number
  role: ChatRole
  content: string
  createdAt: string
  /** Logged-in agent that wrote the row, taken from `Chat Data.Agent`. */
  agent?: string
}

export interface ChatContact {
  id: string
  name: string
  email?: string
  phone?: string
  avatar: string
}

/**
 * One row of the `Chat Data` table, normalised for the browser.
 */
export interface ChatRowDTO {
  id: number
  sessionId: string
  role: ChatRole
  content: string
  createdAt: string
  name: string | null
  phone: string | null
  email: string | null
  /** Raw value of the `Status` column, set when an agent resolves the chat. */
  status: string | null
  /** Name of the logged-in agent that handled the row. */
  agent: string | null
}

/**
 * A conversation is a group of `Chat Data` rows that share the same
 * `session_id`, ordered by `created_at`.
 */
export interface Conversation {
  id: string
  sessionId: string
  user: ChatContact
  channel: ChatChannel
  lastMessage: string
  /** ISO timestamp of the newest message. */
  lastActivity: string
  /** ISO timestamp of the oldest message we have seen for this session. */
  firstContacted: string
  status: ConversationStatus
  unread: boolean
  messages: ChatMessage[]
  messagesLoaded: boolean
  hasMore: boolean
  /** True while a human agent owns the chat (no disconnect marker after connect). */
  agentConnected: boolean
  /** Latest `role = summary` row for this session, shown as chat context. */
  summary?: string
}

export interface MetricTrend {
  value: string
  positive: boolean
}

export interface DashboardMetrics {
  totalConversations: number
  conversationsThisMonth: number
  totalMessages: number
  incomingMessages: number
  outgoingMessages: number
  meetingsBooked: number
  calls: number
  meetings: number
  conversionRate: number
  conversationSparkline: number[]
  messageSparkline: number[]
  conversionSparkline: number[]
  trends: {
    conversations?: MetricTrend
    messages?: MetricTrend
    meetings?: MetricTrend
    conversion?: MetricTrend
  }
}
