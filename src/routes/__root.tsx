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
import { Plus } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  createWorkspaceFn,
  listWorkspacesFn,
} from "@/db/workspace-functions"
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
  const createWorkspace = useServerFn(createWorkspaceFn)
  const [isPending, startTransition] = React.useTransition()

  function handleAddWorkspace() {
    startTransition(async () => {
      await createWorkspace({
        data: {
          name: `Workspace ${workspaces.length + 1}`,
        },
      })
      await router.invalidate()
    })
  }

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <aside className="flex w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
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
                onClick={handleAddWorkspace}
              >
                <Plus />
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
              {workspaces.length ? (
                workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    type="button"
                    className="flex h-8 items-center justify-between gap-2 rounded-md px-3 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <span className="truncate">{workspace.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {workspace.apps.length}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  No workspaces yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>
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
