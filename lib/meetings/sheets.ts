import "server-only"

const REQUEST_TIMEOUT_MS = 8_000

export interface CallStatusSyncPayload {
  phone: string | null
  name: string | null
  email: string | null
  reason: string | null
  timeReceived: string | null
  /** `Resolved` when the agent handled the call, `null` when reopening it. */
  status: "Resolved" | null
}

export interface SheetsSyncResult {
  /** False when no Sheets webhook is configured. */
  configured: boolean
  synced: boolean
  error?: string
}

/**
 * The Supabase table is the source of truth for the dashboard, but the
 * operations team also keeps the same call list in Google Sheets. After a
 * status change we forward the row identity + new status to the n8n webhook
 * that owns the sheet, so both places stay in sync.
 *
 * Configure it with `CALLS_SHEETS_WEBHOOK_URL` (or the generic
 * `SHEETS_WEBHOOK_URL`).
 */
export async function syncCallStatusToSheets(
  payload: CallStatusSyncPayload
): Promise<SheetsSyncResult> {
  const url =
    process.env.CALLS_SHEETS_WEBHOOK_URL?.trim() ||
    process.env.SHEETS_WEBHOOK_URL?.trim()

  if (!url) return { configured: false, synced: false }

  const resolved = payload.status !== null

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "Status",
        table: "Phone_Chatbot",
        resolved,
        ...payload,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "")

      return {
        configured: true,
        synced: false,
        error: `Sheets webhook failed (${response.status})${body ? `: ${body.slice(0, 180)}` : ""}`,
      }
    }

    return { configured: true, synced: true }
  } catch (error) {
    return {
      configured: true,
      synced: false,
      error:
        error instanceof Error && error.name === "TimeoutError"
          ? "The Sheets webhook timed out."
          : error instanceof Error
            ? error.message
            : "Could not reach the Sheets webhook",
    }
  }
}
