import { Link } from "@tanstack/react-router"
import { Folder, Plus, Search, SquareTerminal } from "lucide-react"
import * as React from "react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SidebarApp = {
  id: number
  name: string
}

export type SidebarWorkspace = {
  id: number
  name: string
  apps: SidebarApp[]
}

export function AppSidebar({
  isPending,
  workspaces,
  onAddApp,
  onAddWorkspace,
}: {
  isPending: boolean
  workspaces: SidebarWorkspace[]
  onAddApp: (workspace: SidebarWorkspace) => void
  onAddWorkspace: () => void
}) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filteredWorkspaces = workspaces
    .map((workspace) => {
      if (!normalizedSearch) {
        return workspace
      }

      const workspaceMatches = workspace.name
        .toLowerCase()
        .includes(normalizedSearch)
      const matchingApps = workspace.apps.filter((app) =>
        app.name.toLowerCase().includes(normalizedSearch)
      )

      return {
        ...workspace,
        apps: workspaceMatches ? workspace.apps : matchingApps,
      }
    })
    .filter(
      (workspace) =>
        !normalizedSearch ||
        workspace.name.toLowerCase().includes(normalizedSearch) ||
        workspace.apps.length > 0
    )

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[12px_0_36px_color-mix(in_srgb,var(--foreground)_12%,transparent)]">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3">
          <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-4">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <SquareTerminal />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">App Runner</p>
                <p className="text-xs text-sidebar-foreground/60">Workspaces</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <ThemeToggle />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Add workspace"
                disabled={isPending}
                onClick={onAddWorkspace}
              >
                <Plus />
              </Button>
            </div>
          </div>
          <label className="relative block px-3">
            <span className="sr-only">Search workspaces and apps</span>
            <Search className="pointer-events-none absolute top-1/2 left-5 size-3.5 -translate-y-1/2 text-sidebar-foreground/50" />
            <input
              type="search"
              value={searchQuery}
              placeholder="Search workspaces or apps"
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-9 w-full rounded-lg border border-sidebar-border bg-sidebar-accent/55 pr-2 pl-8 text-sm text-sidebar-foreground transition-colors outline-none placeholder:text-sidebar-foreground/45 focus-visible:border-sidebar-ring focus-visible:ring-3 focus-visible:ring-sidebar-ring/30"
            />
          </label>
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {filteredWorkspaces.length ? (
              filteredWorkspaces.map((workspace) => (
                <div key={workspace.id} className="flex flex-col gap-1">
                  <div
                    className={cn(
                      "group flex min-h-9 items-center gap-1 rounded-lg px-3 text-sm transition-colors",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Link
                      to="/workspaces/$workspaceId"
                      params={{ workspaceId: String(workspace.id) }}
                      className="flex min-w-0 flex-1 items-center gap-2 self-stretch"
                      activeProps={{
                        className: "font-semibold text-sidebar-primary",
                      }}
                    >
                      <Folder className="shrink-0 text-sidebar-foreground/45" />
                      <span className="min-w-0 flex-1 truncate">
                        {workspace.name}
                      </span>
                      <span className="shrink-0 rounded-full bg-sidebar-accent px-1.5 text-xs text-sidebar-foreground/65">
                        {workspace.apps.length}
                      </span>
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Add app to ${workspace.name}`}
                      disabled={isPending}
                      onClick={() => onAddApp(workspace)}
                    >
                      <Plus />
                    </Button>
                  </div>
                  {workspace.apps.length ? (
                    <div className="flex flex-col gap-1 pl-7">
                      {workspace.apps.map((app) => (
                        <Link
                          key={app.id}
                          to="/workspaces/$workspaceId/apps/$appId"
                          params={{
                            workspaceId: String(workspace.id),
                            appId: String(app.id),
                          }}
                          search={{ tab: "variables" }}
                          className="flex h-7 items-center rounded-md px-3 text-left text-sm text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          activeProps={{
                            className:
                              "bg-sidebar-primary font-semibold text-sidebar-primary-foreground",
                          }}
                        >
                          <span className="truncate">{app.name}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="px-10 py-1 text-xs text-sidebar-foreground/45">
                      No apps.
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-sidebar-foreground/60">
                {workspaces.length
                  ? "No workspaces or apps match your search."
                  : "No workspaces yet."}
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
