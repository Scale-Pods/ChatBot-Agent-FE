import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AppShell } from "@/components/dashboard/app-shell"
import { getSessionUser } from "@/lib/auth/session"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Chatbot Command Center | ScalePods",
  description: "Premium dashboard to monitor chatbot activity and view conversations across all channels",
  generator: "v0.app",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getSessionUser()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-transparent text-foreground`}>
        <div aria-hidden="true" className="ambient-stage">
          <div className="ambient-orb" />
        </div>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange={false}>
          <AppShell user={user}>{children}</AppShell>
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
