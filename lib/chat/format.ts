const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
})

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function toDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const date = new Date(iso)

  return Number.isNaN(date.getTime()) ? null : date
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function formatTime(iso: string | null | undefined): string {
  const date = toDate(iso)
  return date ? timeFormatter.format(date) : ""
}

export function formatDate(iso: string | null | undefined): string {
  const date = toDate(iso)
  return date ? dateFormatter.format(date) : ""
}

export function formatDayLabel(iso: string | null | undefined): string {
  const date = toDate(iso)
  if (!date) return ""

  const now = new Date()
  if (isSameDay(date, now)) return "Today"

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameDay(date, yesterday)) return "Yesterday"

  return dateFormatter.format(date)
}

export function formatRelativeTime(iso: string | null | undefined): string {
  const date = toDate(iso)
  if (!date) return ""

  const seconds = Math.round((Date.now() - date.getTime()) / 1000)

  if (seconds < 15) return "just now"
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`

  return dateFormatter.format(date)
}
