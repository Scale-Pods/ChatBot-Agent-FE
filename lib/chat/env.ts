import "server-only"

/**
 * Server-only access to the Supabase credentials.
 *
 * Nothing in here is ever bundled for the browser: the dashboard talks to the
 * `app/api/chat/*` routes instead of Supabase directly, so the service-role
 * token never leaves the server.
 */

const CHAT_TABLE = process.env.SUPABASE_CHAT_TABLE?.trim() || "Chat Data"
const USERS_TABLE = process.env.SUPABASE_USERS_TABLE?.trim() || "Users_CB"

export interface SupabaseCredentials {
  url: string
  key: string
  chatTable: string
  usersTable: string
}

export function getChatTable(): string {
  return CHAT_TABLE
}

export function getUsersTable(): string {
  return USERS_TABLE
}

function readJwtRole(token: string): string | null {
  const payload = token.split(".")[1]
  if (!payload) return null

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      role?: unknown
    }
    return typeof decoded.role === "string" ? decoded.role : null
  } catch {
    return null
  }
}

export function getSupabaseCredentials(): SupabaseCredentials | null {
  // Keep the env names flexible so the app works with both the Next.js and the
  // Vite-style names that exist in this deployment.
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL

  const candidates = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.SUPABASE_KEY,
  ].filter((value): value is string => typeof value === "string" && value.length > 0)

  if (!url || candidates.length === 0) return null

  // Prefer the service-role token when it is available. Some deployments have
  // the two variable names swapped, so check the JWT payload instead of
  // trusting the name.
  const key =
    candidates.find((token) => readJwtRole(token) === "service_role") ?? candidates[0]

  return {
    url: url.replace(/\/+$/, ""),
    key,
    chatTable: CHAT_TABLE,
    usersTable: USERS_TABLE,
  }
}
