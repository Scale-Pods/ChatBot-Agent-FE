import "server-only"

import { getUsersTable } from "@/lib/chat/env"
import {
  countChatRows,
  deleteRows,
  insertChatRow,
  selectChatRows,
  updateChatRows,
} from "@/lib/chat/rest"
import { hashPassword, verifyPassword } from "./password"
import type {
  AgentUser,
  AgentUserWithPassword,
  UsersResult,
} from "./types"

interface RawUserRow {
  id: number | string | null
  created_at: string | null
  Name: string | null
  Email: string | null
}

interface RawUserWithPassword extends RawUserRow {
  Password: string | null
}

const PUBLIC_COLUMNS = "id,created_at,Name,Email"
const AUTH_COLUMNS = `${PUBLIC_COLUMNS},Password`

export class UserConflictError extends Error {
  constructor(message = "A user with that email already exists") {
    super(message)
    this.name = "UserConflictError"
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function toUser(row: RawUserRow): AgentUser | null {
  const id = Number(row.id)

  if (!Number.isFinite(id)) return null

  return {
    id,
    name: row.Name?.trim() || "Unnamed agent",
    email: row.Email?.trim() || "",
    createdAt: row.created_at ?? new Date(0).toISOString(),
  }
}

function toUserWithPassword(row: RawUserWithPassword): AgentUserWithPassword | null {
  const user = toUser(row)

  if (!user) return null

  return { ...user, password: row.Password ?? "" }
}

function likeValue(email: string): string {
  // PostgREST treats `*` as a wildcard inside `ilike`; escape it so an email
  // is always matched literally.
  return normalizeEmail(email).replace(/[*\\]/g, "\\$&")
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error while reading users"
}

export async function getUsers(): Promise<UsersResult> {
  try {
    const table = getUsersTable()
    const rows = await selectChatRows<RawUserRow>(
      { select: PUBLIC_COLUMNS, order: "created_at.desc,id.desc" },
      table
    )

    return {
      users: rows
        .map(toUser)
        .filter((user): user is AgentUser => user !== null),
    }
  } catch (error) {
    return { users: [], error: errorMessage(error) }
  }
}

export async function findUserByEmail(
  email: string
): Promise<AgentUserWithPassword | null> {
  const table = getUsersTable()
  const rows = await selectChatRows<RawUserWithPassword>(
    {
      select: AUTH_COLUMNS,
      Email: `ilike.${likeValue(email)}`,
      limit: "1",
    },
    table
  )

  return rows[0] ? toUserWithPassword(rows[0]) : null
}

export async function countUsers(): Promise<number> {
  return countChatRows({}, getUsersTable())
}

export async function getSetupState(): Promise<{ required: boolean; error?: string }> {
  try {
    return { required: (await countUsers()) === 0 }
  } catch (error) {
    return { required: false, error: errorMessage(error) }
  }
}

export async function createUser({
  name,
  email,
  password,
}: {
  name: string
  email: string
  password: string
}): Promise<AgentUser> {
  const table = getUsersTable()
  const normalizedEmail = normalizeEmail(email)
  const existing = await findUserByEmail(normalizedEmail)

  if (existing) throw new UserConflictError()

  const passwordHash = await hashPassword(password)
  const inserted = await insertChatRow(
    {
      Name: name.trim(),
      Email: normalizedEmail,
      Password: passwordHash,
    },
    table
  )

  const row: RawUserRow = {
    id: (inserted.id as number | string | null) ?? null,
    created_at: (inserted.created_at as string | null) ?? new Date().toISOString(),
    Name: name.trim(),
    Email: normalizedEmail,
  }
  const user = toUser(row)

  if (!user) throw new Error("Supabase did not return the created user")

  return user
}

/**
 * Check an email/password pair against `Users_CB`. Legacy plain-text passwords
 * are upgraded to scrypt hashes on the first successful login.
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<AgentUser | null> {
  const user = await findUserByEmail(email)

  if (!user) return null

  const check = await verifyPassword(password, user.password)

  if (!check.valid) return null

  if (check.needsRehash) {
    try {
      const rehashed = await hashPassword(password)
      await updateChatRows(
        { id: `eq.${user.id}` },
        { Password: rehashed },
        getUsersTable()
      )
    } catch {
      // A failed upgrade should not block an otherwise valid login.
    }
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  }
}

export async function deleteUser(id: number): Promise<boolean> {
  const removed = await deleteRows(
    { id: `eq.${id}` },
    getUsersTable()
  )

  return removed.length > 0
}
