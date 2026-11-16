"use client"

import { useRef, useEffect, useState } from "react"
import {
  Globe, MessageCircle, Instagram, Mail,
  Bot, User, UserCheck, Send, PhoneOff, CheckCheck, Info, MessagesSquare,
  MoreHorizontal, Search as SearchIcon, UserCircle2, Loader2, ChevronUp,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { formatDate, formatDayLabel, formatRelativeTime, formatTime } from "@/lib/chat/format"
import { isConnectNotice } from "@/lib/chat/merge"
import type { Conversation } from "@/lib/chat/types"
import { useToast } from "@/components/ui/use-toast"

const channelConfig = {
  website: { icon: Globe, label: "Website", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", ring: "ring-blue-500/20" },
  whatsapp: { icon: MessageCircle, label: "WhatsApp", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" },
  instagram: { icon: Instagram, label: "Instagram", color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-500/10", ring: "ring-pink-500/20" },
  gmail: { icon: Mail, label: "Gmail", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", ring: "ring-red-500/20" },
}

const sessionStatusConfig = {
  active: { label: "Active", class: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20" },
  pending: { label: "Pending", class: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20" },
  resolved: { label: "Resolved", class: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20" },
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/[0.03] ring-1 ring-border mb-4">
        <MessagesSquare className="h-6 w-6 text-subtle/70" />
      </div>
      <p className="text-sm font-medium text-subtle">Select a conversation</p>
      <p className="mt-1 text-xs text-subtle/70">Choose a conversation from the list to view messages</p>
    </div>
  )
}

interface ChatWorkspaceProps {
  conversation: Conversation | null
  onLoadOlder?: () => void
  isLoadingOlder?: boolean
  onMessageSent?: () => void
  onMarkResolved?: (sessionId: string) => Promise<void>
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong"
}

async function postAgentAction(
  sessionId: string,
  body: { action: "connect" | "disconnect" } | { action: "message"; content: string }
): Promise<void> {
  const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? `Request failed (${response.status})`)
  }
}

export function ChatWorkspace({
  conversation,
  onLoadOlder,
  isLoadingOlder = false,
  onMessageSent,
  onMarkResolved,
}: ChatWorkspaceProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const [agentConnected, setAgentConnected] = useState(
    conversation?.agentConnected ?? false
  )
  const [agentAction, setAgentAction] = useState<"connect" | "disconnect" | "send" | null>(null)
  const [draft, setDraft] = useState("")
  const [resolving, setResolving] = useState(false)

  const lastMessageId = conversation?.messages[conversation.messages.length - 1]?.id

  useEffect(() => {
    // Scroll only the message viewport so the dashboard itself never jumps.
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    )
    if (viewport) viewport.scrollTop = viewport.scrollHeight
  }, [conversation?.id, lastMessageId])

  // A new conversation starts with whatever the stored chat rows say. This
  // also restores the takeover state after the agent leaves and comes back.
  useEffect(() => {
    setAgentConnected(conversation?.agentConnected ?? false)
  }, [conversation?.id, conversation?.agentConnected])

  // A new conversation starts with a clean composer.
  useEffect(() => {
    setAgentAction(null)
    setDraft("")
    setResolving(false)
  }, [conversation?.id])

  const handleConnect = async () => {
    if (!conversation || agentAction) return
    const sessionId = conversation.sessionId
    setAgentAction("connect")

    try {
      await postAgentAction(sessionId, { action: "connect" })
      setAgentConnected(true)
      onMessageSent?.()
      toast({ description: "Connected to chat. You can now reply as an agent.", duration: 2500 })
    } catch (error) {
      toast({ description: errorMessage(error), variant: "destructive", duration: 4000 })
    } finally {
      setAgentAction(null)
    }
  }

  const handleSend = async () => {
    if (!conversation || agentAction) return
    const content = draft.trim()
    if (!content) return

    const sessionId = conversation.sessionId
    setAgentAction("send")

    try {
      await postAgentAction(sessionId, { action: "message", content })
      setDraft("")
      onMessageSent?.()
    } catch (error) {
      toast({ description: errorMessage(error), variant: "destructive", duration: 4000 })
    } finally {
      setAgentAction(null)
    }
  }

  const handleDisconnect = async () => {
    if (!conversation || agentAction) return
    const sessionId = conversation.sessionId
    setAgentAction("disconnect")

    try {
      await postAgentAction(sessionId, { action: "disconnect" })
      setAgentConnected(false)
      setDraft("")
      onMessageSent?.()
      toast({ description: "Disconnected. The AI will take over again.", duration: 2500 })
    } catch (error) {
      toast({ description: errorMessage(error), variant: "destructive", duration: 4000 })
    } finally {
      setAgentAction(null)
    }
  }

  const handleResolve = async () => {
    if (!conversation || !onMarkResolved || resolving) return
    const sessionId = conversation.sessionId
    setResolving(true)

    try {
      await onMarkResolved(sessionId)
      toast({ description: "Conversation marked as resolved.", duration: 2500 })
    } catch (error) {
      toast({ description: errorMessage(error), variant: "destructive", duration: 4000 })
    } finally {
      setResolving(false)
    }
  }

  if (!conversation) return <EmptyState />

  const isResolved = conversation.status === "resolved"

  const ch = channelConfig[conversation.channel]
  const ChIcon = ch.icon
  const sc = sessionStatusConfig[conversation.status]

  // Group messages by calendar day, keeping the rows ordered by created_at.
  const grouped: Array<{ date: string; messages: Conversation["messages"] }> = []
  for (const msg of conversation.messages) {
    const label = formatDayLabel(msg.createdAt)
    const current = grouped[grouped.length - 1]
    if (current && current.date === label) current.messages.push(msg)
    else grouped.push({ date: label, messages: [msg] })
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border">
              <AvatarFallback className="bg-foreground/[0.05] text-xs font-semibold text-foreground">
                {conversation.user.avatar}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{conversation.user.name}</p>
                <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 " + ch.bg + " " + ch.color + " " + ch.ring}>
                  <ChIcon className="h-2.5 w-2.5" />
                  {ch.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-subtle">
                {conversation.user.email && <span className="truncate">{conversation.user.email}</span>}
                {conversation.user.phone && <span>{conversation.user.phone}</span>}
                <span className="text-subtle/70">·</span>
                <span className="truncate font-mono">{conversation.sessionId}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground">
              <SearchIcon className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground">
              <Info className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Info pills */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className={"rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 " + sc.class}>{sc.label}</span>
          <span className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border">
            First: {formatDate(conversation.firstContacted)}
          </span>
          <span className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border">
            Last: <span suppressHydrationWarning>{formatRelativeTime(conversation.lastActivity)}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
            <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
            Live
          </span>
        </div>
      </div>

      {/* Conversation context — the latest `role = summary` row */}
      {conversation.summary && (
        <div className="shrink-0 border-b border-border bg-blue-500/[0.04] px-4 py-3">
          <div className="mb-1.5 flex items-center gap-2">
            <Bot className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-[11px] font-medium text-muted-foreground">
              Conversation Summary
            </span>
          </div>
          <p className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">
            {conversation.summary}
          </p>
        </div>
      )}

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="min-h-0 flex-1 px-4 py-3">
        <div className="space-y-3">
          {!conversation.messagesLoaded ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-subtle" />
              <p className="text-xs text-subtle">Loading messages…</p>
            </div>
          ) : (
            <>
              {conversation.hasMore && (
                <div className="flex justify-center pb-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLoadOlder}
                    disabled={isLoadingOlder}
                    className="h-7 rounded-lg px-3 text-[11px] text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                  >
                    {isLoadingOlder ? (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : (
                      <ChevronUp className="mr-1.5 h-3 w-3" />
                    )}
                    Load older messages
                  </Button>
                </div>
              )}
              {conversation.messages.length === 0 && (
                <p className="py-16 text-center text-xs text-subtle">No messages yet</p>
              )}
              {grouped.map((group, gi) => (
                <div key={gi} className="space-y-3">
                  {group.date && (
                    <div className="flex items-center gap-2 py-1">
                      <div className="h-px flex-1 bg-foreground/[0.04]" />
                      <span className="text-[10px] text-subtle/70 px-2">{group.date}</span>
                      <div className="h-px flex-1 bg-foreground/[0.04]" />
                    </div>
                  )}
                  {group.messages.map((msg) => {
                    if (msg.role === "system" || isConnectNotice(msg)) {
                      const connected = isConnectNotice(msg)
                      return (
                        <div key={msg.id} className="flex items-center justify-center gap-2">
                          <div className="h-px flex-1 bg-foreground/[0.04]" />
                          <span
                            className={
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] ring-1 " +
                              (connected
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20"
                                : "bg-foreground/[0.04] text-subtle ring-border")
                            }
                          >
                            {connected && <UserCheck className="h-3 w-3" />}
                            {connected
                              ? msg.agent
                                ? `${msg.agent} connected to chat`
                                : "Connected to chat"
                              : msg.content}
                          </span>
                          <div className="h-px flex-1 bg-foreground/[0.04]" />
                        </div>
                      )
                    }
                    if (msg.role === "user") {
                      return (
                        <div key={msg.id} className="flex items-start gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/[0.05] ring-1 ring-border">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex max-w-[78%] flex-col gap-1">
                            <div className="whitespace-pre-wrap break-words rounded-[16px] rounded-bl-[4px] bg-foreground/[0.04] px-3.5 py-2.5 text-sm text-foreground ring-1 ring-border">
                              {msg.content}
                            </div>
                            <span className="text-[10px] text-subtle/70">{formatTime(msg.createdAt)}</span>
                          </div>
                        </div>
                      )
                    }
                    if (msg.role === "agent") {
                      return (
                        <div key={msg.id} className="flex items-start justify-end gap-2">
                          <div className="flex max-w-[78%] flex-col items-end gap-1">
                            <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              {msg.agent ?? "Agent"}
                            </p>
                            <div className="whitespace-pre-wrap break-words rounded-[16px] rounded-br-[4px] bg-amber-500/[0.08] px-3.5 py-2.5 text-sm text-foreground ring-1 ring-amber-500/[0.12]">
                              {msg.content}
                            </div>
                            <span className="text-[10px] text-subtle/70">{formatTime(msg.createdAt)}</span>
                          </div>
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
                            <UserCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          </div>
                        </div>
                      )
                    }
                    // ai / bot
                    return (
                      <div key={msg.id} className="flex items-start justify-end gap-2">
                        <div className="flex max-w-[78%] flex-col items-end gap-1">
                          <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400">AI Bot</p>
                          <div className="whitespace-pre-wrap break-words rounded-[16px] rounded-br-[4px] bg-blue-500/[0.15] px-3.5 py-2.5 text-sm text-foreground ring-1 ring-blue-500/[0.15]">
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-subtle/70">{formatTime(msg.createdAt)}</span>
                        </div>
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/10 ring-1 ring-blue-500/20">
                          <Bot className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Agent composer — only after "Connect to chat" */}
      {agentConnected && (
        <div className="shrink-0 border-t border-blue-500/[0.15] bg-blue-500/[0.03] px-3 py-2.5">
          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  void handleSend()
                }
              }}
              placeholder="Write a reply as agent…"
              rows={1}
              className="max-h-28 min-h-9 flex-1 resize-none rounded-xl border-border bg-foreground/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-subtle focus-visible:ring-blue-500/30"
            />
            <Button
              size="sm"
              onClick={() => void handleSend()}
              disabled={!draft.trim() || agentAction !== null}
              className="h-9 rounded-xl bg-blue-500 px-3 text-sm text-white hover:bg-blue-400 disabled:bg-blue-500/30"
            >
              {agentAction === "send" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-1 text-[10px] text-subtle">
            Replying as agent · Enter to send, Shift+Enter for a new line
          </p>
        </div>
      )}

      {/* Action bar */}
      <div className="shrink-0 border-t border-border px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {!agentConnected ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg px-3 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => void handleConnect()}
              disabled={agentAction !== null}
            >
              {agentAction === "connect" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserCircle2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              Connect to chat
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg px-3 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10"
              onClick={() => void handleDisconnect()}
              disabled={agentAction !== null}
            >
              {agentAction === "disconnect" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <PhoneOff className="mr-1.5 h-3.5 w-3.5" />
              )}
              Disconnect Chat
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-lg px-3 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => void handleResolve()}
            disabled={resolving || isResolved || !onMarkResolved}
          >
            {resolving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
            )}
            {isResolved ? "Resolved" : "Mark resolved"}
          </Button>
        </div>
      </div>
    </div>
  )
}
