// Shared Supabase helpers for the maintenance scripts.
// Not imported by the app; these run with plain `node`.

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { readFileSync } from "node:fs"
import { promisify } from "node:util"

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64

export function readEnv(path = ".env") {
  const values = {}

  let raw = ""
  try {
    raw = readFileSync(path, "utf8")
  } catch {
    return values
  }

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue

    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    values[match[1]] = value
  }

  return values
}

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH)
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`
}

export async function verifyHash(password, stored) {
  const [scheme, saltBase64, hashBase64] = String(stored ?? "").split("$")
  if (scheme !== "scrypt" || !saltBase64 || !hashBase64) return false

  const salt = Buffer.from(saltBase64, "base64")
  const expected = Buffer.from(hashBase64, "base64")
  const derived = await scryptAsync(password.normalize("NFKC"), salt, expected.length)

  return expected.length === derived.length && timingSafeEqual(expected, derived)
}

/** Load the env file plus process env, and fail loudly if Supabase is unset. */
export function getConfig() {
  const env = { ...readEnv(), ...process.env }

  const url = (
    env.SUPABASE_URL ??
    env.NEXT_PUBLIC_SUPABASE_URL ??
    env.VITE_SUPABASE_URL ??
    ""
  ).replace(/\/+$/, "")

  // This project's .env has the anon and service-role keys in each other's
  // variables, so pick by the JWT's role claim like lib/chat/env.ts does
  // instead of trusting the variable name.
  const candidates = [
    env.SUPABASE_SERVICE_ROLE_KEY,
    env.SUPABASE_ANON_KEY,
    env.VITE_SUPABASE_ANON_KEY,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    env.SUPABASE_KEY,
  ].filter((value) => typeof value === "string" && value.length > 0)

  const role = (token) => {
    try {
      const payload = token.split(".")[1]
      if (!payload) return null
      return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).role ?? null
    } catch {
      return null
    }
  }

  const key = candidates.find((token) => role(token) === "service_role") ?? candidates[0] ?? ""

  const table = (env.SUPABASE_USERS_TABLE || "Users_CB").trim()

  if (!url) {
    fail("SUPABASE_URL is not set (checked .env and the process environment)")
  }

  if (!key) {
    fail("No Supabase key found (SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY)")
  }

  return { url, key, table }
}

export function fail(message) {
  console.error(`✖ ${message}`)
  process.exit(1)
}

export async function rest(config, path, init = {}) {
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })

  const text = await response.text()
  const body = text ? JSON.parse(text) : null

  if (!response.ok) {
    fail(`Supabase ${response.status}: ${text}`)
  }

  return body
}

export function usersPath(config, query = "") {
  return `${encodeURIComponent(config.table)}${query ? `?${query}` : ""}`
}
