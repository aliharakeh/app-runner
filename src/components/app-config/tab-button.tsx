import type * as React from "react"

import { cn } from "@/lib/utils"

export function TabButton({
  active,
  count,
  icon,
  label,
  onClick,
}: {
  active: boolean
  count?: number
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&_svg]:size-4",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
      {count === undefined ? null : (
        <span
          className={cn(
            "flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs leading-5",
            active
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}
