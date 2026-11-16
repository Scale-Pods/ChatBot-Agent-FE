import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  PhoneCall,
} from "lucide-react"

import { CallAssistance } from "@/components/dashboard/call-assistance"
import { MeetingsScheduled } from "@/components/dashboard/meetings-scheduled"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatStrip } from "@/components/dashboard/stat-strip"
import { requireUser } from "@/lib/auth/session"
import { getMeetingState, isCallResolved } from "@/lib/meetings/format"
import { getMeetings, getScheduledCalls } from "@/lib/meetings/data"

export const metadata = {
  title: "Meetings | ScalePods",
}

// Both tables are written by the chatbot workflows, so always read fresh rows.
export const dynamic = "force-dynamic"

export default async function MeetingsPage() {
  await requireUser()

  const [meetingsResult, callsResult] = await Promise.all([
    getMeetings(),
    getScheduledCalls(),
  ])

  const now = Date.now()
  const scheduled = meetingsResult.meetings.filter(
    (meeting) => getMeetingState(meeting.onDate, now) === "scheduled"
  ).length
  const completed = meetingsResult.meetings.filter(
    (meeting) => getMeetingState(meeting.onDate, now) === "completed"
  ).length
  const pendingCalls = callsResult.calls.filter(
    (call) => !isCallResolved(call.status)
  ).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meetings"
        description="Booked demos and scheduled calls pulled live from your chatbot."
      />

      <StatStrip
        items={[
          {
            label: "Upcoming",
            value: scheduled,
            hint: "Meetings still to come",
            tone: "blue",
            icon: <CalendarCheck className="h-3.5 w-3.5" />,
          },
          {
            label: "Completed",
            value: completed,
            hint: "Meetings already held",
            tone: "emerald",
            icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          },
          {
            label: "Total meetings",
            value: meetingsResult.meetings.length,
            hint: "All booked meetings",
            tone: "rose",
            icon: <CalendarDays className="h-3.5 w-3.5" />,
          },
          {
            label: "Pending calls",
            value: pendingCalls,
            hint: "Customers not contacted yet",
            tone: "amber",
            icon: <PhoneCall className="h-3.5 w-3.5" />,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <MeetingsScheduled
          meetings={meetingsResult.meetings}
          error={meetingsResult.error}
        />
        <CallAssistance calls={callsResult.calls} error={callsResult.error} />
      </div>
    </div>
  )
}
