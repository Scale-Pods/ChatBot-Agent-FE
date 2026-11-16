"use client"

import type React from "react"
import { useState } from "react"
import { Eye, EyeOff, Loader2, ShieldCheck, Trash2, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { formatDate } from "@/lib/chat/format"
import type { AgentUser } from "@/lib/users/types"

interface UserDirectoryProps {
  initialUsers: AgentUser[]
  initialError?: string
  currentUserId: number
}

interface ErrorResponse {
  error?: string
}

interface UserResponse extends ErrorResponse {
  user?: AgentUser
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function UserDirectory({
  initialUsers,
  initialError,
  currentUserId,
}: UserDirectoryProps) {
  const { toast } = useToast()
  const [users, setUsers] = useState(initialUsers)
  const [error, setError] = useState<string | undefined>(initialError)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<AgentUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  const resetForm = () => {
    setName("")
    setEmail("")
    setPassword("")
    setShowPassword(false)
    setFormError(null)
  }

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) resetForm()
  }

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (creating) return

    setFormError(null)
    setCreating(true)

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const data = (await response.json().catch(() => null)) as UserResponse | null

      if (!response.ok || !data?.user) {
        throw new Error(data?.error ?? `Could not create the user (${response.status})`)
      }

      setUsers((prev) => [data.user as AgentUser, ...prev])
      setError(undefined)
      handleDialogChange(false)
      toast({
        description: `${data.user.name} can now sign in and handle chats.`,
        duration: 3000,
      })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not create the user")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return

    setDeleting(true)

    try {
      const response = await fetch(`/api/users/${deleteTarget.id}`, {
        method: "DELETE",
      })
      const data = (await response.json().catch(() => null)) as ErrorResponse | null

      if (!response.ok) {
        throw new Error(data?.error ?? `Could not delete the user (${response.status})`)
      }

      setUsers((prev) => prev.filter((user) => user.id !== deleteTarget.id))
      toast({ description: `${deleteTarget.name} was removed.`, duration: 2500 })
      setDeleteTarget(null)
    } catch (error) {
      toast({
        description:
          error instanceof Error ? error.message : "Could not delete the user",
        variant: "destructive",
        duration: 4000,
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-foreground">Agent accounts</h2>
          <span className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
            {users.length} {users.length === 1 ? "user" : "users"}
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="h-8 rounded-lg bg-blue-500 px-3 text-xs text-white hover:bg-blue-400"
        >
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Add agent
        </Button>
      </div>

      {error && (
        <div className="rounded-[12px] border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden glass-panel rounded-[24px]">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/[0.03] ring-1 ring-border">
              <UserPlus className="h-5 w-5 text-subtle/70" />
            </div>
            <p className="text-sm font-medium text-subtle">No agents yet</p>
            <p className="mt-1 max-w-sm text-xs text-subtle/70">
              Add your first agent account. Their name is written to
              <span className="text-muted-foreground"> Chat Data.Agent</span> whenever they
              connect to a conversation.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="h-10 px-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Agent
                </TableHead>
                <TableHead className="h-10 px-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Email
                </TableHead>
                <TableHead className="hidden h-10 px-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:table-cell">
                  Created
                </TableHead>
                <TableHead className="h-10 w-16 px-4 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className="border-border hover:bg-foreground/[0.03]"
                >
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-[11px] font-semibold text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20">
                        {getInitials(user.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-foreground">
                            {user.name}
                          </p>
                          {user.id === currentUserId && (
                            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-subtle/70">
                          Agent · ID {user.id}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(user)}
                      disabled={user.id === currentUserId}
                      title={
                        user.id === currentUserId
                          ? "You cannot delete your own account"
                          : `Delete ${user.name}`
                      }
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 disabled:pointer-events-none disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-[14px] border border-border bg-foreground/[0.02] px-3 py-2.5 text-[11px] leading-relaxed text-subtle">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>
          Passwords are stored as scrypt hashes with a unique salt per user. The
          plain-text password is never written to Supabase or returned to the
          browser.
        </span>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="glass-panel border-border text-foreground sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Add agent</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a login for someone who can reply to chats. Their name is
              recorded in the Agent column.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="agent-name" className="text-muted-foreground">
                Full name
              </Label>
              <Input
                id="agent-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Aarav Sharma"
                autoComplete="off"
                required
                minLength={2}
                disabled={creating}
                className="h-9 border-border bg-foreground/[0.03] text-foreground placeholder:text-subtle"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agent-email" className="text-muted-foreground">
                Email
              </Label>
              <Input
                id="agent-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="agent@scalepods.com"
                autoComplete="off"
                required
                disabled={creating}
                className="h-9 border-border bg-foreground/[0.03] text-foreground placeholder:text-subtle"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agent-password" className="text-muted-foreground">
                Temporary password
              </Label>
              <div className="relative">
                <Input
                  id="agent-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  disabled={creating}
                  className="h-9 border-border bg-foreground/[0.03] pr-10 text-foreground placeholder:text-subtle"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-subtle">
                It is hashed with scrypt before being saved.
              </p>
            </div>

            {formError && (
              <div className="rounded-[10px] border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-700 dark:text-red-300">
                {formError}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleDialogChange(false)}
                disabled={creating}
                className="h-9 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="h-9 bg-blue-500 text-white hover:bg-blue-400 disabled:bg-blue-500/40"
              >
                {creating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Create agent
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent className="glass-panel border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete agent?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {deleteTarget
                ? `${deleteTarget.name} (${deleteTarget.email}) will no longer be able to sign in.`
                : ""}{" "}
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              className="border-border bg-transparent text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
              disabled={deleting}
              className="bg-red-500 text-white hover:bg-red-400"
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
