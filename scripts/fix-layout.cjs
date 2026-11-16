const fs = require('fs')

const bt = '`'

const content = `import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Chatbot Command Center | ScalePods",
  description: "Premium dashboard to monitor chatbot activity and view conversations across all channels",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={${bt}\${inter.variable} font-sans antialiased bg-[#09090B] text-[#FAFAFA]${bt}}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
`

fs.writeFileSync('app/layout.tsx', content, 'utf8')
const check = fs.readFileSync('app/layout.tsx', 'utf8')
const line24 = check.split('\n')[23]
console.log('line 24:', line24)
console.log('done')
