import { NextResponse } from "next/server"

import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session"
import {
  UserConflictError,
  createUser,
  getSetupState,
  normalizeEmail,
} from "@/lib/users/data"

export const dynamic = "force-dynamic"

interface SetupBody {
  name?: unknown
  email?: unknown
  password?: unknown
}

/**
 * First-run bootstrap: creates the first agent account, but only while the
 * users table is completely empty.
 */
export async function POST(request: Request) {
  const setup = await getSetupState()

  if (setup.error) {
    return NextResponse.json({ error: setup.error }, { status: 502 })
  }

  if (!setup.required) {
    return NextResponse.json(
      { error: "Setup has already been completed. Please sign in." },
      { status: 409 }
    )
  }

  const body = (await request.json().catch(() => null)) as SetupBody | null
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
    const token = await createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    })

    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())

    return response
  } catch (error) {
    if (error instanceof UserConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create the first agent account.",
      },
      { status: 502 }
    )
  }
}
