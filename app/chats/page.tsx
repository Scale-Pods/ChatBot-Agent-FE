import { ConversationExplorer } from "@/components/dashboard/conversation-explorer"
import { PageHeader } from "@/components/dashboard/page-header"
import { requireUser } from "@/lib/auth/session"
import { getConversations } from "@/lib/chat/data"

// Chat data changes constantly, so always render with fresh rows.
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Chats | ScalePods",
}

export default async function ChatsPage() {
  await requireUser()

  const chat = await getConversations({ limit: 40 })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chats"
        description="Every conversation across website, WhatsApp, Instagram and Gmail."
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.03] px-2.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            {chat.conversations.length} recent conversations
          </span>
        }
      />
      <ConversationExplorer
        initialConversations={chat.conversations}
        initialCursor={chat.cursor}
        initialError={chat.error}
      />
    </div>
  )
}
