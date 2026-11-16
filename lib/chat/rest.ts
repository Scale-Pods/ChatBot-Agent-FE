import "server-only"

import { getSupabaseCredentials } from "./env"

const REQUEST_TIMEOUT_MS = 8_000

function endpoint(
  search: Record<string, string>,
  table?: string
): { url: string; headers: Record<string, string> } {
  const credentials = getSupabaseCredentials()

  if (!credentials) {
    throw new Error(
      "Supabase is not configured. Add SUPABASE_URL and a Supabase key to your .env file."
    )
  }

  const params = new URLSearchParams(search)

  return {
    url: `${credentials.url}/rest/v1/${encodeURIComponent(table ?? credentials.chatTable)}?${params.toString()}`,
    headers: {
      apikey: credentials.key,
      Authorization: `Bearer ${credentials.key}`,
      Accept: "application/json",
    },
  }
}

function requestError(response: Response, body: string): Error {
  return new Error(
    `Supabase request failed (${response.status})${body ? `: ${body.slice(0, 240)}` : ""}`
  )
}

/**
 * Minimal PostgREST client.
 *
 * We deliberately use `fetch` instead of pulling in the whole Supabase SDK:
 * the dashboard only needs a handful of read queries and this keeps the
 * client bundle free of any database related code.
 */
export async function selectChatRows<T>(
  search: Record<string, string>,
  table?: string
): Promise<T[]> {
  const { url, headers } = endpoint(search, table)

  const response = await fetch(url, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw requestError(response, body)
  }

  return (await response.json()) as T[]
}

/**
 * Insert a single row and return it.
 */
export async function insertChatRow(
  row: Record<string, unknown>,
  table?: string
): Promise<Record<string, unknown>> {
  const { url, headers } = endpoint({ select: "*" }, table)

  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw requestError(response, body)
  }

  const rows = (await response.json()) as Record<string, unknown>[]

  if (!rows[0]) throw new Error("Supabase did not return the inserted row")

  return rows[0]
}

/**
 * Patch rows that match the given PostgREST filters and return them.
 */
export async function updateChatRows(
  search: Record<string, string>,
  values: Record<string, unknown>,
  table?: string
): Promise<Record<string, unknown>[]> {
  const { url, headers } = endpoint({ ...search, select: "*" }, table)

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(values),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw requestError(response, body)
  }

  return (await response.json()) as Record<string, unknown>[]
}

/**
 * Exact row count for a filter, returned in the `Content-Range` header. Only
 * one row is transferred regardless of the table size.
 */
export async function countChatRows(
  search: Record<string, string> = {},
  table?: string
): Promise<number> {
  const { url, headers } = endpoint(search, table)

  const response = await fetch(url, {
    headers: {
      ...headers,
      Prefer: "count=exact",
      Range: "0-0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw requestError(response, body)
  }

  const total = Number(response.headers.get("content-range")?.split("/")[1])

  return Number.isFinite(total) ? total : 0
}

/**
 * Delete rows that match the given PostgREST filters and return them.
 */
export async function deleteRows(
  search: Record<string, string>,
  table?: string
): Promise<Record<string, unknown>[]> {
  const { url, headers } = endpoint({ ...search, select: "*" }, table)

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      ...headers,
      Prefer: "return=representation",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw requestError(response, body)
  }

  return (await response.json()) as Record<string, unknown>[]
}
