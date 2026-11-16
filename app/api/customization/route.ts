import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth/session"
import { isCustomizationChannel } from "@/lib/customization/config"

export const dynamic = "force-dynamic"

const WEBHOOK_URL =
  process.env.CUSTOMIZATION_WEBHOOK_URL?.trim() ||
  "https://n8n.srv1010832.hstgr.cloud/webhook/26b5ee96-112d-43f4-9775-2670c778cc04"

const REQUEST_TIMEOUT_MS = 15_000

type CustomizationAction = "Status" | "Prompt"

interface CustomizationBody {
  action?: unknown
  channel?: unknown
  status?: unknown
  prompt?: unknown
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Forward a channel customization change to the n8n webhook.
 *
 * - `action=Status` toggles a channel on/off (`status: "on" | "off"`).
 * - `action=Prompt` updates the channel prompt (`prompt: string`).
 *
 * The action and channel are mirrored in the query string while the full
 * payload is sent as JSON so the workflow can read either source.
 */
export async function POST(request: Request) {
  if (!(await getSessionUser())) {
    return errorResponse("Unauthorized", 401)
  }

  const body = (await request.json().catch(() => null)) as CustomizationBody | null
  const action = typeof body?.action === "string" ? body.action.trim() : ""

  if (action !== "Status" && action !== "Prompt") {
    return errorResponse("action must be either 'Status' or 'Prompt'")
  }

  if (!isCustomizationChannel(body?.channel)) {
    return errorResponse("channel must be one of: website, instagram, gmail")
  }

  const channel = body.channel
  const payload: Record<string, string> = { action, channel }

  if (action === "Status") {
    const status = typeof body?.status === "string" ? body.status.trim().toLowerCase() : ""

    if (status !== "on" && status !== "off") {
      return errorResponse("status must be 'on' or 'off'")
    }

    payload.status = status
  } else {
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : ""

    if (!prompt) {
      return errorResponse("prompt cannot be empty")
    }

    if (prompt.length > 10_000) {
      return errorResponse("prompt is too long (max 10,000 characters)")
    }

    payload.prompt = prompt
    // Mirror as `text` so workflows that read a generic field also work.
    payload.text = prompt
  }

  const url = new URL(WEBHOOK_URL)
  url.searchParams.set("action", action as CustomizationAction)
  url.searchParams.set("channel", channel)
  if (payload.status) url.searchParams.set("status", payload.status)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    })

    const text = await response.text().catch(() => "")

    if (!response.ok) {
      return errorResponse(
        `Webhook rejected the update (${response.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
        502
      )
    }

    return NextResponse.json({
      ok: true,
      action,
      channel,
      ...(payload.status ? { status: payload.status } : {}),
      webhook: response.status,
    })
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError"

    return errorResponse(
      aborted
        ? "The webhook timed out. Please try again."
        : error instanceof Error
          ? error.message
          : "Could not reach the customization webhook",
      502
    )
  } finally {
    clearTimeout(timeout)
  }
}
