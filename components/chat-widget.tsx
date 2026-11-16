"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { MessageCircle, X, Send, Loader2, Maximize2, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils"

const WEBHOOK_URL = "https://n8n.srv1010832.hstgr.cloud/webhook/19ca2dbc-3c3e-40d4-ae97-731b6abd8e99"
const POLLING_WEBHOOK_URL = "https://n8n.srv1010832.hstgr.cloud/webhook/70d8f760-1520-46fb-b091-d4dd30ea96f1"

const SESSION_EXPIRY_MS = 12 * 60 * 60 * 1000
const GRACE_PERIOD_MS = 60 * 1000
const POLLING_INTERVAL_MS = 10 * 1000

interface Message {
  id: number | string
  content: string
  role: "user" | "agent" | "ai" | "system"
  timestamp: number
  created_at?: string
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>("")
  const [isAgentMode, setIsAgentMode] = useState(false)
  const [pollUntil, setPollUntil] = useState<number>(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastCreatedAtRef = useRef<string | null>(null)
  const lastBotIndexRef = useRef<number>(-1)

  const initializeSession = useCallback(() => {
    const storedSessionId = localStorage.getItem("scalepods_session_id")
    const storedCreatedAt = localStorage.getItem("scalepods_session_created_at")
    const now = Date.now()

    // Check if session exists and is not expired
    if (storedSessionId && storedCreatedAt) {
      const createdAt = Number.parseInt(storedCreatedAt, 10)
      if (now - createdAt < SESSION_EXPIRY_MS) {
        // Session is valid
        setSessionId(storedSessionId)

        // Load chat history
        const storedMessages = localStorage.getItem(`scalepods_messages_${storedSessionId}`)
        if (storedMessages) {
          setMessages(JSON.parse(storedMessages))
        }

        // Load last created_at timestamp
        const storedLastCreatedAt = localStorage.getItem(`scalepods_last_created_at_${storedSessionId}`)
        if (storedLastCreatedAt) {
          lastCreatedAtRef.current = storedLastCreatedAt
        }

        // Load last bot index
        const storedLastBotIndex = localStorage.getItem(`scalepods_last_bot_index_${storedSessionId}`)
        if (storedLastBotIndex) {
          lastBotIndexRef.current = Number.parseInt(storedLastBotIndex, 10)
        }
        return
      }
    }

    // Session expired or doesn't exist - create new session
    const newSessionId = crypto.randomUUID()
    localStorage.setItem("scalepods_session_id", newSessionId)
    localStorage.setItem("scalepods_session_created_at", now.toString())

    // Clear old session data if exists
    if (storedSessionId) {
      localStorage.removeItem(`scalepods_messages_${storedSessionId}`)
      localStorage.removeItem(`scalepods_last_created_at_${storedSessionId}`)
      localStorage.removeItem(`scalepods_last_bot_index_${storedSessionId}`)
    }

    setSessionId(newSessionId)
    setMessages([])
    lastCreatedAtRef.current = null
    lastBotIndexRef.current = -1
  }, [])

  useEffect(() => {
    initializeSession()

    // Check for agent mode via URL params
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get("role") === "agent") {
      setIsAgentMode(true)
    }
  }, [initializeSession])

  useEffect(() => {
    if (sessionId && messages.length > 0) {
      localStorage.setItem(`scalepods_messages_${sessionId}`, JSON.stringify(messages))
    }
  }, [messages, sessionId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const extendPollingGracePeriod = useCallback(() => {
    setPollUntil(Date.now() + GRACE_PERIOD_MS)
  }, [])

  const pollForMessages = useCallback(async () => {
    if (!sessionId) return

    try {
      const response = await fetch(POLLING_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          after: lastCreatedAtRef.current || null,
        }),
      })

      if (!response.ok) {
        return
      }

      // Handle empty or non-JSON responses
      const text = await response.text()
      
      if (!text || text.trim() === "") {
        return
      }

      let data
      try {
        data = JSON.parse(text)
      } catch {
        return
      }

      // Handle response format: {"count": N, "messages": [...]}
      // Each message has: session_id, role, message (not content), created_at
      const messagesArray = data.messages || (Array.isArray(data) ? data : [])
      
      const agentMessages: Array<{
        session_id: string
        role: string
        message: string
        created_at: string
      }> = messagesArray

      if (agentMessages.length > 0) {
        // Update last created_at to the latest one
        const latestCreatedAt = agentMessages.reduce((latest, msg) => {
          return msg.created_at && msg.created_at > latest ? msg.created_at : latest
        }, lastCreatedAtRef.current || "")

        if (latestCreatedAt) {
          lastCreatedAtRef.current = latestCreatedAt
          localStorage.setItem(`scalepods_last_created_at_${sessionId}`, latestCreatedAt)
        }

        // Convert to Message format - agent messages appear on LEFT
        // Use created_at as unique id since there's no id field
        const newAgentMessages: Message[] = agentMessages
          .filter((msg) => msg.message)
          .map((msg) => {
            // Check for special system notifications
            const messageContent = msg.message.trim()
            if (messageContent === "An Agent Just Joined" || messageContent === "Disconnect") {
              // Convert "Disconnect" to "Agent Disconnected"
              const displayContent = messageContent === "Disconnect" ? "Agent Disconnected" : messageContent
              
              return {
                id: msg.created_at || crypto.randomUUID(),
                content: displayContent,
                role: "system" as const,
                timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now(),
                created_at: msg.created_at || new Date().toISOString(),
              }
            }

            // Regular agent message
            return {
              id: msg.created_at || crypto.randomUUID(),
              content: messageContent,
              role: "agent" as const,
              timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now(),
              created_at: msg.created_at || new Date().toISOString(),
            }
          })

        // Merge with existing messages, dedupe by id, sort by timestamp for real-time feel
        setMessages((prev) => {
          const merged = [...prev, ...newAgentMessages]
          const unique = Array.from(new Map(merged.map((m) => [String(m.id), m])).values())
          return unique.sort((a, b) => a.timestamp - b.timestamp)
        })
      }
    } catch (error) {
      // Silently ignore polling errors
    }
  }, [sessionId])

  useEffect(() => {
    // Only poll when widget is open
    if (!isOpen) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      return
    }

    // Poll immediately when widget opens
    pollForMessages()

    // Set up polling interval to check every 10 seconds
    pollingIntervalRef.current = setInterval(() => {
      pollForMessages()
    }, POLLING_INTERVAL_MS)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [isOpen, pollForMessages])

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    }
  }, [])

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    extendPollingGracePeriod()

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: inputValue.trim(),
      role: isAgentMode ? "agent" : "user",
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage.content,
          role: isAgentMode ? "agent" : "user",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      // Handle empty or non-JSON responses from send webhook
      const responseText = await response.text()
      if (!responseText || responseText.trim() === "") {
        // Empty response is OK, no reply from AI
        return
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch {
        // Not valid JSON, skip
        return
      }

      // Handle human takeover notification
      if (data.mode === "HUMAN") {
        const agentName = data.agent_name || "Support agent"
        const systemMessage: Message = {
          id: crypto.randomUUID(),
          content: `🔔 ${agentName} joined the conversation`,
          role: "system",
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, systemMessage])
      }

      const replyContent = data.reply || data.message || data.output || data.response || data.text
      if (replyContent) {
        const aiMessage: Message = {
          id: crypto.randomUUID(),
          content: replyContent,
          role: "ai",
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, aiMessage])
      }
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        content: "Sorry, something went wrong. Please try again.",
        role: "system",
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    extendPollingGracePeriod()
  }

  // When closed: only button (56x56), when open: full chat panel
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-lg ring-2 ring-[#00CED1] transition-transform hover:scale-105"
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    )
  }

  // Open state: full chat panel
  const panelWidth = isExpanded ? 500 : 380
  const panelHeight = isExpanded ? 600 : 520

  return (
    <div
      style={{ width: panelWidth, height: panelHeight }}
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-zinc-900 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <img src="/images/scalepods-logo.png" alt="Scalepods Logo" className="h-8 w-8 object-contain" />
          <div>
            <h2 className="text-sm font-semibold text-white">Scalepods AI</h2>
            <p className="text-[10px] text-zinc-400">{isAgentMode ? "Agent Mode" : "Online"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label={isExpanded ? "Minimize chat" : "Expand chat"}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <img src="/images/scalepods-logo.png" alt="Scalepods Logo" className="mb-4 h-12 w-12 opacity-50" />
            <p className="text-sm text-muted-foreground">
              Welcome to Scalepods AI!
              <br />
              How can we help you today?
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex flex-col",
                  message.role === "user" && "items-end",
                  (message.role === "agent" || message.role === "ai") && "items-start",
                  message.role === "system" && "items-center",
                )}
              >
                {message.role === "system" ? (
                  <div className="rounded-lg bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
                    {message.content}
                  </div>
                ) : (
                  <>
                    {message.role === "agent" && (
                      <span className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Agent
                      </span>
                    )}
                    {message.role === "ai" && (
                      <span className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        AI
                      </span>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm",
                        message.role === "user"
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-muted text-foreground",
                      )}
                    >
                      {message.content}
                    </div>
                  </>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Typing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isAgentMode ? "Type agent reply…" : "Type your message…"}
            disabled={isLoading}
            className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
