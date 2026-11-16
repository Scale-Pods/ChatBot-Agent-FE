import { PageHeader } from "@/components/dashboard/page-header"
import { UserDirectory } from "@/components/dashboard/users/user-directory"
import { requireUser } from "@/lib/auth/session"
import { getUsers } from "@/lib/users/data"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Users | ScalePods",
}

export default async function UsersPage() {
  const current = await requireUser()
  const result = await getUsers()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Agent accounts that can sign in, connect to chats and reply to customers."
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.03] px-2.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            {result.users.length} {result.users.length === 1 ? "account" : "accounts"}
          </span>
        }
      />
      <UserDirectory
        initialUsers={result.users}
        initialError={result.error}
        currentUserId={current.id}
      />
    </div>
  )
}
