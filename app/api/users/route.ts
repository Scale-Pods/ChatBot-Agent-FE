import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth/session"
import {
  UserConflictError,
  createUser,
  getUsers,
  normalizeEmail,
} from "@/lib/users/data"

export const dynamic = "force-dynamic"

interface CreateUserBody {
  name?: unknown
  email?: unknown
  password?: unknown
}

export async function GET() {
  const current = await getSessionUser()

  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await getUsers()

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  })
}

export async function POST(request: Request) {
  const current = await getSessionUser()

  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as CreateUserBody | null
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const email =
    typeof body?.email === "string" ? normalizeEmail(body.email) : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (name.length < 2) {
    return NextResponse.json(
      { error: "Name must be at least 2 characters" },
      { status: 400 }
    )
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address" },
      { status: 400 }
    )
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    )
  }

  try {
    const user = await createUser({ name, email, password })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if (error instanceof UserConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create the user in Supabase",
      },
      { status: 502 }
    )
  }
}
