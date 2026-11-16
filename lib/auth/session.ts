import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import type { SessionUser } from "./types"

export const SESSION_COOKIE = "scalepods_session"
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60 // 8 hours per login

interface SessionPayload extends SessionUser {
  exp: number
}

/**
 * The HMAC secret used to sign the session cookie. `AUTH_SECRET` is preferred;
 * falling back to the service-role key keeps existing deployments working
 * without an extra environment variable, because that key never leaves the
 * server either.
 */
function sessionSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "scalepods-local-development-secret"
  )
}

const encoder = new TextEncoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ""

  for (const byte of bytes) binary += String.fromCharCode(byte)

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (value.length % 4)) % 4)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

async function importKey(usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  )
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const payload: SessionPayload = {
    ...user,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  }
  const encoded = toBase64Url(encoder.encode(JSON.stringify(payload)))
  const signature = await crypto.subtle.sign("HMAC", await importKey("sign"), encoder.encode(encoded))

  return `${encoded}.${toBase64Url(new Uint8Array(signature))}`
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  const [encoded, signature] = token.split(".")

  if (!encoded || !signature) return null

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await importKey("verify"),
      fromBase64Url(signature),
      encoder.encode(encoded)
    )

    if (!valid) return null

    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encoded))
    ) as Partial<SessionPayload>

    if (
      typeof payload.id !== "number" ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp <= Date.now()
    ) {
      return null
    }

    return { id: payload.id, name: payload.name, email: payload.email }
  } catch {
    return null
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value

  return token ? verifySessionToken(token) : null
}

/** Server-component guard: redirects to the login screen when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()

  if (!user) redirect("/login")

  return user
}

export function sessionCookieOptions(): {
  httpOnly: true
  secure: boolean
  sameSite: "lax"
  path: "/"
  maxAge: number
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  }
}
