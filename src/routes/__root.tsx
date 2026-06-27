import { Outlet, createRootRoute, useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { RootDocument } from "@/components/root-document"
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
        title: "App Runner",
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

function AppLayout() {
  const router = useRouter()
  const { workspaces } = Route.useLoaderData()
  const createApp = useServerFn(createAppFn)
  const createWorkspace = useServerFn(createWorkspaceFn)
  const [isPending, startTransition] = React.useTransition()
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = React.useState(false)
  const [appDialogWorkspace, setAppDialogWorkspace] = React.useState<
    (typeof workspaces)[number] | null
  >(null)
  const [workspaceError, setWorkspaceError] = React.useState("")
  const [appError, setAppError] = React.useState("")

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
      <AppSidebar
        isPending={isPending}
        workspaces={workspaces}
        onAddApp={(workspace) => {
          const selectedWorkspace = workspaces.find(
            (candidate) => candidate.id === workspace.id
          )

          if (!selectedWorkspace) {
            return
          }

          setAppError("")
          setAppDialogWorkspace(selectedWorkspace)
        }}
        onAddWorkspace={() => {
          setWorkspaceError("")
          setWorkspaceDialogOpen(true)
        }}
      />
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
