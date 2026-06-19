import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  useRouter,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { useServerFn } from "@tanstack/react-start"
import { Folder, Plus, Search } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  CreateAppDialog,
  CreateWorkspaceDialog,
  getErrorMessage,
} from "@/components/workspace-dialogs"
import {
  createAppFn,
  createWorkspaceFn,
  listWorkspacesFn,
} from "@/db/workspace-functions"
import { cn } from "@/lib/utils"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
  component: AppLayout,
  loader: async () => ({
    workspaces: await listWorkspacesFn(),
  }),
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "TanStack Start Starter",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
})

const navigationItems = [
  {
    label: "Dashboard",
    to: "/",
  },
] as const

function AppLayout() {
  const router = useRouter()
  const { workspaces } = Route.useLoaderData()
  const createApp = useServerFn(createAppFn)
  const createWorkspace = useServerFn(createWorkspaceFn)
  const [isPending, startTransition] = React.useTransition()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = React.useState(false)
  const [appDialogWorkspace, setAppDialogWorkspace] = React.useState<
    (typeof workspaces)[number] | null
  >(null)
  const [workspaceError, setWorkspaceError] = React.useState("")
  const [appError, setAppError] = React.useState("")

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

  function handleCreateWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const name = String(formData.get("name") ?? "")

    startTransition(async () => {
      try {
        setWorkspaceError("")
        await createWorkspace({ data: { name } })
        form.reset()
        setWorkspaceDialogOpen(false)
        await router.invalidate()
      } catch (error) {
        setWorkspaceError(getErrorMessage(error))
      }
    })
  }

  function handleCreateApp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!appDialogWorkspace) {
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)
    const name = String(formData.get("name") ?? "")
    const pathLocation = String(formData.get("pathLocation") ?? "")
    const workspaceId = appDialogWorkspace.id

    startTransition(async () => {
      try {
        setAppError("")
        await createApp({
          data: {
            workspaceId,
            name,
            pathLocation,
          },
        })
        form.reset()
        setAppDialogWorkspace(null)
        await router.invalidate()
      } catch (error) {
        setAppError(getErrorMessage(error))
      }
    })
  }

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <aside className="flex w-72 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="border-b px-5 py-4">
          <p className="text-sm font-medium">App Runner</p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <nav className="flex flex-col gap-1 p-3" aria-label="Main navigation">
            {navigationItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeProps={{
                  className: "bg-sidebar-accent text-sidebar-accent-foreground",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3">
            <div className="flex items-center justify-between px-3">
              <p className="text-xs font-medium text-muted-foreground">
                Workspaces
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Add workspace"
                disabled={isPending}
                onClick={() => {
                  setWorkspaceError("")
                  setWorkspaceDialogOpen(true)
                }}
              >
                <Plus />
              </Button>
            </div>
            <label className="relative block px-3">
              <span className="sr-only">Search workspaces and apps</span>
              <Search className="pointer-events-none absolute left-5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                placeholder="Search workspaces or apps"
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
                        onClick={() => {
                          setAppError("")
                          setAppDialogWorkspace(workspace)
                        }}
                      >
                        <Plus />
                      </Button>
                    </div>
                    {workspace.apps.length ? (
                      <div className="flex flex-col gap-1 pl-7">
                        {workspace.apps.map((app) => (
                          <button
                            key={app.id}
                            type="button"
                            className="flex h-7 items-center rounded-md px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          >
                            <span className="truncate">{app.name}</span>
                          </button>
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
      <CreateWorkspaceDialog
        error={workspaceError}
        isPending={isPending}
        open={workspaceDialogOpen}
        onOpenChange={setWorkspaceDialogOpen}
        onSubmit={handleCreateWorkspace}
      />
      <CreateAppDialog
        error={appError}
        isPending={isPending}
        open={Boolean(appDialogWorkspace)}
        workspaceName={appDialogWorkspace?.name ?? ""}
        onOpenChange={(open) => {
          if (!open) {
            setAppDialogWorkspace(null)
          }
        }}
        onSubmit={handleCreateApp}
      />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
