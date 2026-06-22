import { Link } from "@tanstack/react-router"
import { Folder, Plus, Search } from "lucide-react"
import * as React from "react"

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
    <aside className="flex w-72 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3">
          <div className="flex items-center justify-between px-3">
            <p className="mt-4 mb-2 text-lg font-bold text-muted-foreground">
              Workspaces
            </p>
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
          <label className="relative mb-2 block px-3">
            <span className="sr-only">Search workspaces and apps</span>
            <Search className="pointer-events-none absolute top-1/2 left-5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchQuery}
              placeholder="Search workspaces or apps"
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background pr-2 pl-8 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {filteredWorkspaces.length ? (
              filteredWorkspaces.map((workspace) => (
                <div key={workspace.id} className="flex flex-col gap-1">
                  <div
                    className={cn(
                      "group flex min-h-8 items-center gap-1 rounded-md px-3 text-sm",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Link
                      to="/workspaces/$workspaceId"
                      params={{ workspaceId: String(workspace.id) }}
                      className="flex min-w-0 flex-1 items-center gap-1 self-stretch"
                      activeProps={{
                        className: "font-medium text-sidebar-accent-foreground",
                      }}
                    >
                      <Folder className="shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">
                        {workspace.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
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
                          className="flex h-7 items-center rounded-md px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          activeProps={{
                            className:
                              "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                          }}
                        >
                          <span className="truncate">{app.name}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="px-10 py-1 text-xs text-muted-foreground">
                      No apps.
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-muted-foreground">
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
