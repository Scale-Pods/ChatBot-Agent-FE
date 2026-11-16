"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import {
  applyChatDelta,
  mergeThreadMessages,
} from "@/lib/chat/merge"
import type { ChatMessage, ChatRowDTO, Conversation } from "@/lib/chat/types"

/**
 * Poll cadence. The delta endpoint only transfers rows newer than the cursor,
 * so watching an open conversation can afford a much shorter interval.
 */
export const DEFAULT_POLL_INTERVAL_MS = 8_000
export const ACTIVE_POLL_INTERVAL_MS = 4_000
export const FAST_POLL_INTERVAL_MS = 2_000

const DELTA_BATCH_SIZE = 200
const MAX_DELTA_PAGES = 5
const THREAD_PAGE_SIZE = 60
// A single failed poll should not flash "Offline" over a working chat.
const SYNC_FAILURE_THRESHOLD = 3

interface UseChatConversationsOptions {
  initialConversations: Conversation[]
  initialCursor: number
  initialError?: string
  selectedId?: string | null
  pollIntervalMs?: number
}

interface UpdatesResponse {
  rows: ChatRowDTO[]
  cursor: number
  hasMore: boolean
  error?: string
}

interface MessagesResponse {
  messages: ChatMessage[]
  hasMore: boolean
  agentConnected?: boolean
  summary?: string
  error?: string
}

interface ConversationsResponse {
  conversations: Conversation[]
  cursor: number
  error?: string
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Could not load chat data"
}

/**
 * Keeps the conversation list fresh without re-downloading the whole table.
 *
 * - Initial data comes from the server render (no client waterfall).
 * - Polling asks only for rows with an id greater than the last seen one.
 * - Threads are fetched per session, on demand, and merged with the delta.
 * - Polls pause while the browser tab is hidden.
 */
export function useChatConversations({
  initialConversations,
  initialCursor,
  initialError,
  selectedId = null,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: UseChatConversationsOptions) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadingOlderId, setLoadingOlderId] = useState<string | null>(null)
  const [error, setError] = useState<string | undefined>(initialError)

  const conversationsRef = useRef(initialConversations)
  const cursorRef = useRef(initialCursor)
  const selectedIdRef = useRef<string | null>(selectedId)
  const inflightSessions = useRef(new Set<string>())
  const syncingRef = useRef(false)
  const failedSyncsRef = useRef(0)

  const commit = useCallback((updater: (prev: Conversation[]) => Conversation[]) => {
    const next = updater(conversationsRef.current)
    conversationsRef.current = next
    setConversations(next)
  }, [])

  const sync = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true

    try {
      let afterId = cursorRef.current
      const rows: ChatRowDTO[] = []

      for (let page = 0; page < MAX_DELTA_PAGES; page += 1) {
        const response = await fetch(
          `/api/chat/updates?afterId=${afterId}&limit=${DELTA_BATCH_SIZE}`,
          { cache: "no-store" }
        )

        if (!response.ok) throw new Error(`Sync failed (${response.status})`)

        const data = (await response.json()) as UpdatesResponse
        if (data.error) throw new Error(data.error)

        rows.push(...data.rows)

        if (data.cursor > afterId) {
          afterId = data.cursor
          cursorRef.current = data.cursor
        }

        if (!data.hasMore) break
      }

      if (rows.length > 0) {
        commit((prev) => applyChatDelta(prev, rows, selectedIdRef.current))
      }
      failedSyncsRef.current = 0
      setError(undefined)
    } catch (error) {
      failedSyncsRef.current += 1

      if (failedSyncsRef.current >= SYNC_FAILURE_THRESHOLD) {
        setError(toMessage(error))
      }
    } finally {
      syncingRef.current = false
    }
  }, [commit])

  const refresh = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    setIsRefreshing(true)

    try {
      const response = await fetch("/api/chat/conversations?limit=50", {
        cache: "no-store",
      })

      if (!response.ok) throw new Error(`Refresh failed (${response.status})`)

      const data = (await response.json()) as ConversationsResponse
      if (data.error) throw new Error(data.error)

      cursorRef.current = Math.max(cursorRef.current, data.cursor)

      commit((prev) => {
        const previous = new Map(prev.map((conversation) => [conversation.id, conversation]))

        return data.conversations.map((conversation) => {
          const existing = previous.get(conversation.id)
          if (!existing?.messagesLoaded) return conversation

          return {
            ...conversation,
            messages: existing.messages,
            messagesLoaded: true,
            hasMore: existing.hasMore,
          }
        })
      })
      failedSyncsRef.current = 0
      setError(undefined)
    } catch (error) {
      setError(toMessage(error))
    } finally {
      syncingRef.current = false
      setIsRefreshing(false)
    }
  }, [commit])

  const ensureMessages = useCallback(
    async (sessionId: string) => {
      const conversation = conversationsRef.current.find((item) => item.id === sessionId)

      if (
        !conversation ||
        conversation.messagesLoaded ||
        inflightSessions.current.has(sessionId)
      ) {
        return
      }

      inflightSessions.current.add(sessionId)

      try {
        const response = await fetch(
          `/api/chat/sessions/${sessionId}/messages?limit=${THREAD_PAGE_SIZE}`,
          { cache: "no-store" }
        )

        if (!response.ok) throw new Error(`Could not load messages (${response.status})`)

        const data = (await response.json()) as MessagesResponse
        if (data.error) throw new Error(data.error)

        commit((prev) =>
          prev.map((item) =>
            item.id === sessionId
              ? mergeThreadMessages(
                  item,
                  data.messages,
                  data.hasMore,
                  data.summary,
                  data.agentConnected
                )
              : item
          )
        )
        setError(undefined)
      } catch (error) {
        setError(toMessage(error))
      } finally {
        inflightSessions.current.delete(sessionId)
      }
    },
    [commit]
  )

  /**
   * Persist a session's status in the `Status` column and reflect it locally.
   * Delta polling only reads new ids, so the update can't come from the cursor.
   */
  const markResolved = useCallback(
    async (sessionId: string) => {
      const response = await fetch(`/api/chat/sessions/${sessionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? `Could not mark as resolved (${response.status})`)
      }

      commit((prev) =>
        prev.map((conversation) =>
          conversation.id === sessionId
            ? { ...conversation, status: "resolved" }
            : conversation
        )
      )
    },
    [commit]
  )

  const loadOlder = useCallback(
    async (sessionId: string) => {
      const conversation = conversationsRef.current.find((item) => item.id === sessionId)

      if (
        !conversation ||
        !conversation.hasMore ||
        conversation.messages.length === 0 ||
        inflightSessions.current.has(sessionId)
      ) {
        return
      }

      inflightSessions.current.add(sessionId)
      setLoadingOlderId(sessionId)

      try {
        const oldestId = conversation.messages[0].id
        const response = await fetch(
          `/api/chat/sessions/${sessionId}/messages?limit=${THREAD_PAGE_SIZE}&beforeId=${oldestId}`,
          { cache: "no-store" }
        )

        if (!response.ok) throw new Error(`Could not load older messages (${response.status})`)

        const data = (await response.json()) as MessagesResponse
        if (data.error) throw new Error(data.error)

        commit((prev) =>
          prev.map((item) =>
            item.id === sessionId
              ? mergeThreadMessages(item, data.messages, data.hasMore, data.summary)
              : item
          )
        )
        setError(undefined)
      } catch (error) {
        setError(toMessage(error))
      } finally {
        inflightSessions.current.delete(sessionId)
        setLoadingOlderId(null)
      }
    },
    [commit]
  )

  // Mark the open conversation as read and lazy-load its messages.
  useEffect(() => {
    selectedIdRef.current = selectedId ?? null

    if (!selectedId) return

    commit((prev) =>
      prev.map((conversation) =>
        conversation.id === selectedId && conversation.unread
          ? { ...conversation, unread: false }
          : conversation
      )
    )

    void ensureMessages(selectedId)
  }, [selectedId, commit, ensureMessages])

  // Poll for new rows, but only while the tab is actually visible. Syncing
  // happens in the background, so no "syncing" state is exposed to the UI.
  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    const intervalForNow = () => {
      // Reading the open conversation needs the fastest cadence so replies
      // show up almost immediately.
      if (selectedIdRef.current) return FAST_POLL_INTERVAL_MS

      const hasLiveChat = conversationsRef.current.some(
        (conversation) => conversation.status === "active"
      )

      return hasLiveChat ? ACTIVE_POLL_INTERVAL_MS : pollIntervalMs
    }

    const schedule = () => {
      if (cancelled) return

      timer = window.setTimeout(async () => {
        if (cancelled) return

        if (document.visibilityState === "visible") await sync()

        schedule()
      }, intervalForNow())
    }

    const maybeSync = () => {
      if (document.visibilityState === "visible") void sync()
    }

    // Fetch right away (on mount and whenever the cadence changes, e.g. when
    // a conversation is opened) instead of waiting for the first interval.
    maybeSync()
    schedule()

    document.addEventListener("visibilitychange", maybeSync)
    window.addEventListener("focus", maybeSync)

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
      document.removeEventListener("visibilitychange", maybeSync)
      window.removeEventListener("focus", maybeSync)
    }
  }, [sync, pollIntervalMs, selectedId])

  return {
    conversations,
    error,
    isRefreshing,
    loadingOlderId,
    refresh,
    loadOlder,
    ensureMessages,
    markResolved,
    syncNow: sync,
  }
}
