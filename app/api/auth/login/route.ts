import { NextResponse } from "next/server"

import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session"
import { authenticateUser, normalizeEmail } from "@/lib/users/data"

export const dynamic = "force-dynamic"

interface LoginBody {
  email?: unknown
  password?: unknown
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LoginBody | null
  const email =
    typeof body?.email === "string" ? normalizeEmail(body.email) : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    )
  }

  try {
    const user = await authenticateUser(email, password)

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

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
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not sign in. Check the Supabase configuration.",
      },
      { status: 502 }
    )
  }
}
