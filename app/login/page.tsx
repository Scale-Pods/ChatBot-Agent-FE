import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/login-form"
import { getSessionUser } from "@/lib/auth/session"
import { getSetupState } from "@/lib/users/data"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Sign in | ScalePods",
}

export default async function LoginPage() {
  const user = await getSessionUser()

  if (user) redirect("/")

  const setup = await getSetupState()

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.16),transparent_45%),radial-gradient(circle_at_80%_75%,rgba(16,185,129,0.12),transparent_45%)]"
      />
      <LoginForm
        needsSetup={setup.required}
        setupError={setup.error}
      />
    </main>
  )
}
