"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ConversationList } from "./conversation-explorer/conversation-list"
import { ChatWorkspace } from "./conversation-explorer/chat-workspace"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { useChatConversations } from "@/hooks/use-chat-conversations"
import type { Conversation } from "@/lib/chat/types"

// Re-export for backwards compat
export type { Conversation }

interface ConversationExplorerProps {
  initialConversations: Conversation[]
  initialCursor: number
  initialError?: string
}

export function ConversationExplorer({
  initialConversations,
  initialCursor,
  initialError,
}: ConversationExplorerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversations[0]?.id ?? null
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [activeChannel, setActiveChannel] = useState("all")

  const {
    conversations,
    error,
    isRefreshing,
    loadingOlderId,
    refresh,
    loadOlder,
    markResolved,
    syncNow,
  } = useChatConversations({
    initialConversations,
    initialCursor,
    initialError,
    selectedId,
  })

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedId) ?? null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-foreground">Conversation Explorer</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.03] px-2 py-1 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              error ? "bg-red-400" : "bg-emerald-400",
              !error && "animate-pulse"
            )}
          />
          {error ? "Offline" : "Live"}
        </span>
      </div>

      {error && (
        <div className="rounded-[12px] border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden glass-panel rounded-[24px]">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-[68vh] min-h-[520px] max-h-[760px]"
        >
          <ResizablePanel defaultSize={33} minSize={28} maxSize={42} className="min-w-0 overflow-hidden">
            <ConversationList
              conversations={conversations}
              selectedConversation={selectedConversation}
              onSelectConversation={(conversation) => setSelectedId(conversation.id)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              activeChannel={activeChannel}
              onChannelChange={setActiveChannel}
              onRefresh={refresh}
              isRefreshing={isRefreshing}
            />
          </ResizablePanel>
          <ResizableHandle className="w-px bg-foreground/10" />
          <ResizablePanel defaultSize={67} className="min-w-0 overflow-hidden">
            <ChatWorkspace
              conversation={selectedConversation}
              onLoadOlder={() => {
                if (selectedId) void loadOlder(selectedId)
              }}
              isLoadingOlder={Boolean(loadingOlderId && loadingOlderId === selectedId)}
              onMessageSent={() => void syncNow()}
              onMarkResolved={markResolved}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
