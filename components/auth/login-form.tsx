"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface LoginFormProps {
  needsSetup: boolean
  setupError?: string
}

interface ErrorResponse {
  error?: string
}

export function LoginForm({ needsSetup, setupError }: LoginFormProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(
        needsSetup ? "/api/auth/setup" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            needsSetup ? { name, email, password } : { email, password }
          ),
        }
      )
      const data = (await response.json().catch(() => null)) as ErrorResponse | null

      if (!response.ok) {
        throw new Error(data?.error ?? `Sign in failed (${response.status})`)
      }

      router.replace("/")
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign in")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative w-full max-w-[420px]">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <Image
          src="/images/scalepods-wordmark.png"
          alt="ScalePods"
          width={256}
          height={44}
          priority
          className="h-6 w-auto invert dark:invert-0"
        />
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {needsSetup ? "Create the first agent" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {needsSetup
              ? "Set up the first account to unlock the command center."
              : "Sign in to monitor chats and reply as an agent."}
          </p>
        </div>
      </div>

      <div className="glass-panel rounded-[24px] p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {needsSetup && (
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-muted-foreground">
                Full name
              </Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="Aarav Sharma"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                disabled={isSubmitting}
                className="h-10 border-border bg-foreground/[0.03] text-foreground placeholder:text-subtle"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-muted-foreground">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="agent@scalepods.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isSubmitting}
              className="h-10 border-border bg-foreground/[0.03] text-foreground placeholder:text-subtle"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-muted-foreground">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={needsSetup ? "new-password" : "current-password"}
                placeholder={needsSetup ? "At least 8 characters" : "Your password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={needsSetup ? 8 : undefined}
                disabled={isSubmitting}
                className="h-10 border-border bg-foreground/[0.03] pr-10 text-foreground placeholder:text-subtle"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {(error || setupError) && (
            <div className="rounded-[12px] border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {error ?? setupError}
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 w-full bg-blue-500 text-white hover:bg-blue-400 disabled:bg-blue-500/40"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : needsSetup ? (
              <ShieldCheck className="mr-2 h-4 w-4" />
            ) : (
              <LockKeyhole className="mr-2 h-4 w-4" />
            )}
            {needsSetup ? "Create account & continue" : "Sign in"}
          </Button>
        </form>

        <div className="mt-5 flex items-start gap-2 rounded-xl bg-foreground/[0.02] px-3 py-2.5 text-[11px] leading-relaxed text-subtle ring-1 ring-border">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            Passwords are hashed with scrypt and a per-user salt before they are
            stored. The agent name you sign in with is written to every chat you
            handle.
          </span>
        </div>
      </div>
    </div>
  )
}
