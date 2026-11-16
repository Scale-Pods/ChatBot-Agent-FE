import type React from "react"

import { cn } from "@/lib/utils"

export type StatTone = "blue" | "violet" | "emerald" | "amber" | "rose"

const toneMeta: Record<StatTone, { dot: string; glow: string }> = {
  blue: { dot: "bg-blue-500", glow: "bg-blue-500/[0.18]" },
  violet: { dot: "bg-violet-500", glow: "bg-violet-500/[0.18]" },
  emerald: { dot: "bg-emerald-500", glow: "bg-emerald-500/[0.18]" },
  amber: { dot: "bg-amber-500", glow: "bg-amber-500/[0.18]" },
  rose: { dot: "bg-rose-500", glow: "bg-rose-500/[0.18]" },
}

export interface StatStripItem {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  trend?: { value: string; positive: boolean }
  icon?: React.ReactNode
  chart?: React.ReactNode
  footer?: React.ReactNode
  tone?: StatTone
}

interface StatStripProps {
  items: StatStripItem[]
  columns?: 3 | 4
  className?: string
}

function TrendBadge({
  trend,
}: {
  trend: NonNullable<StatStripItem["trend"]>
}) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium tabular-nums",
        trend.positive
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-rose-600 dark:text-rose-400"
      )}
    >
      <svg
        viewBox="0 0 12 12"
        aria-hidden="true"
        className={cn("h-2.5 w-2.5", !trend.positive && "rotate-180")}
      >
        <path
          d="M6 2.5 10 7H2z"
          fill="currentColor"
        />
      </svg>
      {trend.value}
      <span className="font-normal text-subtle">vs prev.</span>
    </p>
  )
}

/**
 * One continuous panel split by hairlines — the alternative to a row of
 * separately outlined statistic cards.
 */
export function StatStrip({ items, columns = 4, className }: StatStripProps) {
  const lastRowStart = items.length - (items.length % 2 === 0 ? 2 : 1)

  return (
    <div
      data-slot="stat-strip"
      className={cn("glass-panel overflow-hidden rounded-[24px]", className)}
    >
      <div
        className={cn(
          "grid auto-rows-fr grid-cols-2",
          columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
        )}
      >
        {items.map((item, index) => {
          const tone = toneMeta[item.tone ?? "blue"]
          return (
            <div
              key={item.label}
              className={cn(
                "group relative overflow-hidden px-5 py-5 transition-colors duration-300 lg:px-6",
                "border-border/60",
                index % 2 === 0 && "max-lg:border-r",
                index < lastRowStart && "max-lg:border-b",
                index !== items.length - 1 && "lg:border-r"
              )}
            >
              <div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute -right-10 -top-14 h-32 w-32 rounded-full opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-100",
                  tone.glow
                )}
              />

              <div className="relative flex items-center gap-2">
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", tone.dot)}
                  aria-hidden="true"
                />
                <p className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">
                  {item.label}
                </p>
                {item.icon ? (
                  <span className="ml-auto shrink-0 text-subtle/60">
                    {item.icon}
                  </span>
                ) : null}
              </div>

              <p className="relative mt-3 text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground sm:text-[31px]">
                {item.value}
              </p>

              <div className="relative mt-2.5 flex items-end justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  {item.trend ? <TrendBadge trend={item.trend} /> : null}
                  {item.hint ? (
                    <p className="text-[11px] leading-snug text-subtle">
                      {item.hint}
                    </p>
                  ) : null}
                  {item.footer}
                </div>
                {item.chart ? (
                  <div className="hidden shrink-0 pb-0.5 sm:block">
                    {item.chart}
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
