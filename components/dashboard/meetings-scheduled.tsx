"use client"

import { useMemo, useState } from "react"
import {
  CalendarDays,
  Clock,
  ExternalLink,
  Mail,
  Phone,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  formatWallClock,
  getMeetingState,
  safeHttpUrl,
} from "@/lib/meetings/format"
import type { MeetingRecord, MeetingState } from "@/lib/meetings/types"
import { cn } from "@/lib/utils"

const statusConfig: Record<
  MeetingState,
  { label: string; className: string }
> = {
  scheduled: {
    label: "Upcoming",
    className:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20",
  },
  completed: {
    label: "Completed",
    className:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
  },
  unknown: {
    label: "No date",
    className: "bg-muted text-muted-foreground ring-border",
  },
}

type MeetingFilter = "all" | MeetingState

const statusFilters: Array<{ label: string; value: MeetingFilter }> = [
  { label: "All", value: "all" },
  { label: "Upcoming", value: "scheduled" },
  { label: "Completed", value: "completed" },
  { label: "No date", value: "unknown" },
]

interface MeetingsScheduledProps {
  meetings: MeetingRecord[]
  error?: string
}

export function MeetingsScheduled({ meetings, error }: MeetingsScheduledProps) {
  const [filter, setFilter] = useState<MeetingFilter>("all")

  const filtered = useMemo(() => {
    if (filter === "all") return meetings

    return meetings.filter((meeting) => getMeetingState(meeting.onDate) === filter)
  }, [filter, meetings])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Meetings Scheduled</h2>
        <span className="text-[11px] text-subtle">{meetings.length} total</span>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {statusFilters.map((item) => (
          <Button
            key={item.value}
            variant="ghost"
            size="sm"
            onClick={() => setFilter(item.value)}
            className={cn(
              "h-6 rounded-md px-2.5 text-xs whitespace-nowrap",
              filter === item.value
                ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500/15 dark:text-blue-400"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            )}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {error && (
        <p className="rounded-[12px] border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="glass-panel overflow-hidden rounded-[24px]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CalendarDays className="mb-2 h-8 w-8 text-subtle/70" />
            <p className="text-xs text-subtle">
              {meetings.length === 0
                ? "No meetings booked yet"
                : "No meetings for this filter"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((meeting) => {
              const state = getMeetingState(meeting.onDate)
              const status = statusConfig[state]
              const link = safeHttpUrl(meeting.meetingLink)

              return (
                <div
                  key={meeting.id}
                  className="flex items-start gap-3 p-3 transition-colors hover:bg-foreground/[0.03]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.04] ring-1 ring-border">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {meeting.name}
                        </p>

                        {(meeting.email || meeting.phone) && (
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            {meeting.email && (
                              <span className="inline-flex items-center gap-1">
                                <Mail className="h-2.5 w-2.5" />
                                <span className="truncate">{meeting.email}</span>
                              </span>
                            )}
                            {meeting.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5" />
                                <span>{meeting.phone}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {meeting.consultingFor && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-subtle">
                            {meeting.consultingFor}
                          </p>
                        )}
                      </div>

                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
                          status.className
                        )}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-subtle/80">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-2.5 w-2.5" />
                        {formatWallClock(meeting.onDate, {
                          withWeekday: true,
                          withYear: true,
                        })}
                      </span>

                      {meeting.timeReceived && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          Received {formatWallClock(meeting.timeReceived)}
                        </span>
                      )}
                    </div>

                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        Join meeting
                      </a>
                    )}
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
