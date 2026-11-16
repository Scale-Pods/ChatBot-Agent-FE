/** One row of the `Meetings_Chatbot` table. */
export interface MeetingRecord {
  /** Stable key built from the row's own values (the table has no id column). */
  id: string
  name: string
  phone: string | null
  email: string | null
  consultingFor: string | null
  /** Raw ISO timestamp of the meeting (`on_date`). */
  onDate: string | null
  /** Raw ISO timestamp of when the request was received (`time_received`). */
  timeReceived: string | null
  meetingLink: string | null
}

/** One row of the `Phone_Chatbot` table. */
export interface ScheduledCall {
  /** Stable key built from the row's own values (the table has no id column). */
  id: string
  name: string
  phone: string | null
  email: string | null
  reason: string | null
  /** Raw ISO timestamp of when the call was scheduled (`time_received`). */
  timeReceived: string | null
  /** Raw `status` value. `null` means the customer has not been contacted yet. */
  status: string | null
}

export type MeetingState = "scheduled" | "completed" | "unknown"

export type CallState = "pending" | "resolved"
