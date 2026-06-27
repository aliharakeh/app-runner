import { Moon, Sun } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"

type Theme = "light" | "dark"

const THEME_STORAGE_KEY = "app-runner-theme"

function getStoredTheme() {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)

    return storedTheme === "dark" || storedTheme === "light"
      ? storedTheme
      : null
  } catch {
    return null
  }
}

function getResolvedTheme(): Theme {
  const storedTheme = getStoredTheme()

  if (storedTheme) {
    return storedTheme
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  document.documentElement.style.colorScheme = theme

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Theme switching should still work for the current tab when storage is blocked.
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>("light")

  React.useEffect(() => {
    const resolvedTheme = getResolvedTheme()

    document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
    document.documentElement.style.colorScheme = resolvedTheme
    setTheme(resolvedTheme)
  }, [])

  const isDark = theme === "dark"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => {
        const currentTheme = document.documentElement.classList.contains("dark")
          ? "dark"
          : "light"
        const nextTheme = currentTheme === "dark" ? "light" : "dark"

        applyTheme(nextTheme)
        setTheme(nextTheme)
      }}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  )
}
