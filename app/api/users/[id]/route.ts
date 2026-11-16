import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth/session"
import { deleteUser } from "@/lib/users/data"

export const dynamic = "force-dynamic"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getSessionUser()

  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const id = Number((await params).id)

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 })
  }

  if (id === current.id) {
    return NextResponse.json(
      { error: "You cannot delete the account you are signed in with" },
      { status: 400 }
    )
  }

  try {
    const removed = await deleteUser(id)

    if (!removed) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not delete the user from Supabase",
      },
      { status: 502 }
    )
  }
}
