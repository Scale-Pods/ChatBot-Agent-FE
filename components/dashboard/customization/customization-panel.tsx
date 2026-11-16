"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Globe,
  Instagram,
  Loader2,
  Mail,
  Radio,
  RotateCcw,
  Save,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  CHANNEL_DEFINITIONS,
  type CustomizationChannel,
} from "@/lib/customization/config"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "scalepods.channel-customization.v1"

const channelIcons = {
  website: Globe,
  instagram: Instagram,
  gmail: Mail,
} as const

const channelAccents = {
  website: "bg-blue-500/10 text-blue-500 ring-blue-500/20 dark:text-blue-400",
  instagram: "bg-pink-500/10 text-pink-500 ring-pink-500/20 dark:text-pink-400",
  gmail: "bg-red-500/10 text-red-500 ring-red-500/20 dark:text-red-400",
} as const

interface ChannelState {
  enabled: boolean
  prompt: string
  savedPrompt: string
  updatedAt: string | null
}

type ChannelStateMap = Record<CustomizationChannel, ChannelState>

function defaultStates(): ChannelStateMap {
  return {
    website: { enabled: true, prompt: "", savedPrompt: "", updatedAt: null },
    instagram: { enabled: true, prompt: "", savedPrompt: "", updatedAt: null },
    gmail: { enabled: true, prompt: "", savedPrompt: "", updatedAt: null },
  }
}

function isChannelStateMap(value: unknown): value is Partial<ChannelStateMap> {
  return typeof value === "object" && value !== null
}

function readStoredStates(): ChannelStateMap {
  const states = defaultStates()

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return states

    const parsed = JSON.parse(raw) as unknown
    if (!isChannelStateMap(parsed)) return states

    for (const definition of CHANNEL_DEFINITIONS) {
      const stored = parsed[definition.id]
      if (!stored || typeof stored !== "object") continue

      const candidate = stored as Partial<ChannelState>
      states[definition.id] = {
        enabled:
          typeof candidate.enabled === "boolean" ? candidate.enabled : true,
        prompt:
          typeof candidate.prompt === "string" ? candidate.prompt : "",
        savedPrompt:
          typeof candidate.savedPrompt === "string"
            ? candidate.savedPrompt
            : typeof candidate.prompt === "string"
              ? candidate.prompt
              : "",
        updatedAt:
          typeof candidate.updatedAt === "string" ? candidate.updatedAt : null,
      }
    }
  } catch {
    // Corrupted storage should never block the page.
  }

  return states
}

function formatSavedAt(value: string | null): string | null {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong"
}

export function CustomizationPanel() {
  const { toast } = useToast()
  const [activeChannel, setActiveChannel] =
    useState<CustomizationChannel>("website")
  const [states, setStates] = useState<ChannelStateMap>(defaultStates)
  const [hydrated, setHydrated] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    setStates(readStoredStates())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(states))
    } catch {
      // Persisting locally is a convenience only.
    }
  }, [states, hydrated])

  const definition = useMemo(
    () =>
      CHANNEL_DEFINITIONS.find((item) => item.id === activeChannel) ??
      CHANNEL_DEFINITIONS[0],
    [activeChannel]
  )

  const current = states[activeChannel]
  const Icon = channelIcons[activeChannel]
  const savedAt = formatSavedAt(current.updatedAt)

  const updateChannel = (
    channel: CustomizationChannel,
    update: Partial<ChannelState>
  ) => {
    setStates((previous) => ({
      ...previous,
      [channel]: { ...previous[channel], ...update },
    }))
  }

  const postCustomization = async (payload: {
    action: "Status" | "Prompt"
    channel: CustomizationChannel
    status?: "on" | "off"
    prompt?: string
  }) => {
    const response = await fetch("/api/customization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string
      } | null
      throw new Error(data?.error ?? `Request failed (${response.status})`)
    }
  }

  const handleToggle = async (enabled: boolean) => {
    const channel = activeChannel
    const key = `${channel}:status`

    if (busy) return

    setBusy(key)
    updateChannel(channel, { enabled })

    try {
      await postCustomization({
        action: "Status",
        channel,
        status: enabled ? "on" : "off",
      })
      updateChannel(channel, { updatedAt: new Date().toISOString() })
      toast({
        description: `${definition.label} is now ${enabled ? "on" : "off"}.`,
        duration: 2500,
      })
    } catch (error) {
      updateChannel(channel, { enabled: !enabled })
      toast({
        description: errorMessage(error),
        variant: "destructive",
        duration: 4500,
      })
    } finally {
      setBusy(null)
    }
  }

  const handleSavePrompt = async () => {
    const channel = activeChannel
    const prompt = current.prompt.trim()

    if (!prompt || busy) return

    const key = `${channel}:prompt`
    setBusy(key)

    try {
      await postCustomization({ action: "Prompt", channel, prompt })
      updateChannel(channel, {
        prompt,
        savedPrompt: prompt,
        updatedAt: new Date().toISOString(),
      })
      toast({
        description: `${definition.label} prompt sent to the automation.`,
        duration: 3000,
      })
    } catch (error) {
      toast({
        description: errorMessage(error),
        variant: "destructive",
        duration: 4500,
      })
    } finally {
      setBusy(null)
    }
  }

  const statusBusy = busy === `${activeChannel}:status`
  const promptBusy = busy === `${activeChannel}:prompt`
  const hasChanges = current.prompt.trim() !== current.savedPrompt

  return (
    <div className="glass-panel overflow-hidden rounded-[24px]">
      <div className="grid grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* Channel rail */}
        <div className="border-b border-border/70 lg:border-b-0 lg:border-r">
          <div className="flex gap-1 overflow-x-auto p-2 scrollbar-none lg:flex-col lg:gap-1.5 lg:p-3">
            {CHANNEL_DEFINITIONS.map((channel) => {
              const ChannelIcon = channelIcons[channel.id]
              const channelState = states[channel.id]
              const isActive = channel.id === activeChannel

              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => setActiveChannel(channel.id)}
                  className={cn(
                    "group flex min-w-[136px] shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all duration-150 lg:min-w-0 lg:w-full",
                    isActive
                      ? "bg-foreground/[0.06] ring-1 ring-border"
                      : "hover:bg-foreground/[0.03]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1",
                      channelAccents[channel.id]
                    )}
                  >
                    <ChannelIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-medium text-foreground">
                        {channel.label}
                      </span>
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          channelState.enabled
                            ? "bg-emerald-400"
                            : "bg-subtle/60"
                        )}
                      />
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {channelState.enabled ? "Active" : "Paused"}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="hidden px-4 pb-4 lg:block">
            <div className="rounded-xl border border-border bg-foreground/[0.02] p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-foreground">
                <Radio className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                Automation webhook
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                Prompt updates are sent with{" "}
                <code className="rounded bg-foreground/10 px-1 py-0.5 text-[9px]">
                  action=Prompt
                </code>
                . Toggles use{" "}
                <code className="rounded bg-foreground/10 px-1 py-0.5 text-[9px]">
                  action=Status
                </code>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1",
                  channelAccents[activeChannel]
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="text-sm font-medium text-foreground">
                  {definition.label} assistant
                </h2>
                <p className="mt-0.5 max-w-md text-xs text-muted-foreground">
                  {definition.description}
                </p>
              </div>
            </div>

            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ring-1",
                current.enabled
                  ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400"
                  : "bg-foreground/[0.04] text-muted-foreground ring-border"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  current.enabled ? "bg-emerald-400" : "bg-subtle/60"
                )}
              />
              {current.enabled ? "Channel on" : "Channel off"}
            </span>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-border bg-foreground/[0.02] px-3 py-2.5">
            <div>
              <p className="text-xs font-medium text-foreground">
                Enable {definition.label}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Turning a channel off pauses its assistant without deleting the
                prompt.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {statusBusy && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              <Switch
                checked={current.enabled}
                onCheckedChange={(checked) => void handleToggle(checked)}
                disabled={busy !== null}
                aria-label={`Turn ${definition.label} on or off`}
              />
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-end justify-between gap-2">
              <div>
                <label
                  htmlFor={`prompt-${activeChannel}`}
                  className="text-xs font-medium text-foreground"
                >
                  Behaviour prompt
                </label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Written to the automation together with the{" "}
                  <span className="font-medium text-foreground">
                    {definition.shortLabel}
                  </span>{" "}
                  channel.
                </p>
              </div>
              <span className="shrink-0 text-[10px] tabular-nums text-subtle">
                {current.prompt.length.toLocaleString()} / 10,000
              </span>
            </div>

            <Textarea
              id={`prompt-${activeChannel}`}
              value={current.prompt}
              onChange={(event) =>
                updateChannel(activeChannel, { prompt: event.target.value })
              }
              placeholder={definition.placeholder}
              maxLength={10_000}
              rows={9}
              className="mt-2 min-h-[200px] resize-y rounded-xl border-border bg-foreground/[0.03] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-blue-500/30"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 text-[10px] text-muted-foreground">
                {savedAt ? (
                  <span suppressHydrationWarning>
                    Last sent at {savedAt}
                    {hasChanges ? " · unsaved changes" : " · up to date"}
                  </span>
                ) : (
                  <span>Nothing sent for this channel yet.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateChannel(activeChannel, {
                      prompt: current.savedPrompt,
                    })
                  }
                  disabled={!hasChanges || busy !== null}
                  className="h-8 rounded-lg px-2.5 text-xs text-muted-foreground hover:bg-foreground/5 hover:text-foreground disabled:opacity-40"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Revert
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleSavePrompt()}
                  disabled={!current.prompt.trim() || busy !== null}
                  className="h-8 rounded-lg bg-blue-500 px-3 text-xs text-white hover:bg-blue-400 disabled:bg-blue-500/40"
                >
                  {promptBusy ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Save prompt
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
