import type React from "react"

interface PageHeaderProps {
  title: string
  description: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1.5">
        <h1 className="text-[26px] font-semibold leading-none tracking-[-0.025em] text-foreground">
          {title}
        </h1>
        <p className="text-[13px] leading-relaxed text-subtle">{description}</p>
      </div>
      {action}
    </div>
  )
}
