"use client"

import { useState } from "react"
import {
  CheckCircle,
  Clock,
  Mail,
  Phone,
  RotateCcw,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import {
  callStatusLabel,
  formatWallClock,
  getCallState,
} from "@/lib/meetings/format"
import type { ScheduledCall } from "@/lib/meetings/types"
import { cn } from "@/lib/utils"

const statusConfig = {
  pending: {
    label: "Not contacted",
    className:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
  },
  resolved: {
    label: "Resolved",
    className:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
  },
}

interface StatusResponse {
  ok?: boolean
  error?: string
  sheets?: {
    configured: boolean
    synced: boolean
    error?: string
  }
}

interface CallAssistanceProps {
  calls: ScheduledCall[]
  error?: string
}

export function CallAssistance({ calls: initialCalls, error }: CallAssistanceProps) {
  const [calls, setCalls] = useState<ScheduledCall[]>(initialCalls)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const { toast } = useToast()

  const updateStatus = async (
    call: ScheduledCall,
    next: "resolved" | "pending"
  ) => {
    const snapshot = calls
    const nextValue = next === "resolved" ? "Resolved" : null

    setUpdatingId(call.id)
    setCalls((prev) =>
      prev.map((item) =>
        item.id === call.id ? { ...item, status: nextValue } : item
      )
    )

    try {
      const response = await fetch("/api/calls/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: call.phone,
          email: call.email,
          name: call.name,
          reason: call.reason,
          timeReceived: call.timeReceived,
          status: next,
        }),
      })

      const data = (await response.json().catch(() => null)) as StatusResponse | null

      if (!response.ok) {
        throw new Error(data?.error ?? `Could not update the call (${response.status})`)
      }

      if (data?.sheets?.configured && !data.sheets.synced) {
        toast({
          title: "Saved with a warning",
          description:
            "The call was updated, but Google Sheets could not be synced.",
          variant: "destructive",
          duration: 5000,
        })
      } else {
        toast({
          description:
            next === "resolved"
              ? data?.sheets?.synced
                ? "Marked as resolved. Google Sheets updated."
                : "Marked as resolved."
              : "Call reopened.",
          duration: 2500,
        })
      }
    } catch (updateError) {
      setCalls(snapshot)
      toast({
        title: "Update failed",
        description:
          updateError instanceof Error
            ? updateError.message
            : "Could not update the call",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const pendingCount = calls.filter(
    (call) => getCallState(call.status) === "pending"
  ).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-foreground">Call Assistance</h2>
          <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
            {pendingCount} pending
          </span>
        </div>
      </div>

      {error && (
        <p className="rounded-[12px] border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="glass-panel overflow-hidden rounded-[24px]">
        {calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Phone className="mb-2 h-8 w-8 text-subtle/70" />
            <p className="text-xs text-subtle">No calls scheduled yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {calls.map((call) => {
              const state = getCallState(call.status)
              const status = statusConfig[state]
              const updating = updatingId === call.id

              return (
                <div
                  key={call.id}
                  className="flex items-start gap-3 p-3 transition-colors hover:bg-foreground/[0.03]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.04] ring-1 ring-border">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {call.name}
                        </p>

                        {(call.phone || call.email) && (
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            {call.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5" />
                                <span>{call.phone}</span>
                              </span>
                            )}
                            {call.email && (
                              <span className="inline-flex items-center gap-1">
                                <Mail className="h-2.5 w-2.5" />
                                <span className="truncate">{call.email}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {call.reason && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-subtle">
                            {call.reason}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
                            status.className
                          )}
                        >
                          {state === "resolved"
                            ? callStatusLabel(call.status)
                            : status.label}
                        </span>

                        {call.timeReceived && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-subtle/70">
                            <Clock className="h-2.5 w-2.5" />
                            {formatWallClock(call.timeReceived)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex gap-1.5">
                      {state === "pending" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={updating}
                          className="h-6 rounded-md px-2 text-[10px] font-medium text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                          onClick={() => void updateStatus(call, "resolved")}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          {updating ? "Saving…" : "Mark resolved"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={updating}
                          className="h-6 rounded-md px-2 text-[10px] font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                          onClick={() => void updateStatus(call, "pending")}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          {updating ? "Saving…" : "Reopen"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
