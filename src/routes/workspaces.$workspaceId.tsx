import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  CreateAppDialog,
  EditAppDialog,
  EditWorkspaceDialog,
  getErrorMessage,
} from "@/components/workspace-dialogs"
import { WorkspaceAppsGrid } from "@/components/workspace-overview/app-card"
import {
  DeleteAppDialog,
  DeleteWorkspaceDialog,
} from "@/components/workspace-overview/delete-dialogs"
import { EmptyApps } from "@/components/workspace-overview/empty-apps"
import { WorkspaceOverviewHeader } from "@/components/workspace-overview/header"
import type { WorkspaceOverviewApp } from "@/components/workspace-overview/types"
import {
  createAppFn,
  deleteAppFn,
  deleteWorkspaceFn,
  getAppProcessStatusesFn,
  getWorkspaceFn,
  restartAppProcessFn,
  startAppProcessFn,
  stopAppProcessFn,
  updateAppFn,
  updateWorkspaceFn,
} from "@/db/workspace-functions"
import { useWorkspaceProcessStreams } from "@/hooks/use-app-process-stream"

export const Route = createFileRoute("/workspaces/$workspaceId")({
  loader: async ({ params }) => {
    const workspace = await getWorkspaceFn({
      data: { workspaceId: params.workspaceId },
    })
    const processStatuses = workspace?.apps.length
      ? await getAppProcessStatusesFn({
          data: { appIds: workspace.apps.map((app) => app.id) },
        })
      : {}

    return { workspace, processStatuses }
  },
  component: WorkspaceOverview,
})

function WorkspaceOverview() {
  const router = useRouter()
  const navigate = Route.useNavigate()
  const { processStatuses: loaderProcessStatuses, workspace } =
    Route.useLoaderData()
  const createApp = useServerFn(createAppFn)
  const updateApp = useServerFn(updateAppFn)
  const deleteApp = useServerFn(deleteAppFn)
  const deleteWorkspace = useServerFn(deleteWorkspaceFn)
  const updateWorkspace = useServerFn(updateWorkspaceFn)
  const startAppProcess = useServerFn(startAppProcessFn)
  const stopAppProcess = useServerFn(stopAppProcessFn)
  const restartAppProcess = useServerFn(restartAppProcessFn)
  const [isPending, startTransition] = React.useTransition()
  const [appDialogOpen, setAppDialogOpen] = React.useState(false)
  const [editingApp, setEditingApp] =
    React.useState<WorkspaceOverviewApp | null>(null)
  const [deletingApp, setDeletingApp] =
    React.useState<WorkspaceOverviewApp | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = React.useState(false)
  const [appError, setAppError] = React.useState("")
  const [editAppError, setEditAppError] = React.useState("")
  const [deleteAppError, setDeleteAppError] = React.useState("")
  const [deleteError, setDeleteError] = React.useState("")
  const [renameError, setRenameError] = React.useState("")
  const [processError, setProcessError] = React.useState("")

  const selectedWorkspace = workspace
  const { processStatuses, updateProcessStatus } = useWorkspaceProcessStreams(
    loaderProcessStatuses
  )

  if (!selectedWorkspace) {
    return (
      <section className="app-page flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Workspace not found
        </h1>
        <p className="text-sm text-muted-foreground">
          The workspace may have been deleted.
        </p>
        <Button className="w-fit" onClick={() => navigate({ to: "/" })}>
          Back to dashboard
        </Button>
      </section>
    )
  }

  function handleCreateApp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const name = String(formData.get("name") ?? "")
    const pathLocation = String(formData.get("pathLocation") ?? "")
    const workspaceId = selectedWorkspace!.id

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
        setAppDialogOpen(false)
        await router.invalidate()
      } catch (error) {
        setAppError(getErrorMessage(error))
      }
    })
  }

  function handleUpdateApp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const appId = Number(formData.get("appId"))
    const name = String(formData.get("name") ?? "")
    const pathLocation = String(formData.get("pathLocation") ?? "")

    startTransition(async () => {
      try {
        setEditAppError("")
        await updateApp({
          data: {
            appId,
            name,
            pathLocation,
          },
        })
        setEditingApp(null)
        await router.invalidate()
      } catch (error) {
        setEditAppError(getErrorMessage(error))
      }
    })
  }

  function handleRenameWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const workspaceId = Number(formData.get("workspaceId"))
    const name = String(formData.get("name") ?? "")

    startTransition(async () => {
      try {
        setRenameError("")
        await updateWorkspace({
          data: {
            workspaceId,
            name,
          },
        })
        setRenameDialogOpen(false)
        await router.invalidate()
      } catch (error) {
        setRenameError(getErrorMessage(error))
      }
    })
  }

  function handleDeleteWorkspace() {
    const workspaceId = selectedWorkspace!.id

    startTransition(async () => {
      try {
        setDeleteError("")
        await deleteWorkspace({
          data: { workspaceId },
        })
        setDeleteDialogOpen(false)
        await router.invalidate()
        await navigate({ to: "/" })
      } catch (error) {
        setDeleteError(getErrorMessage(error))
      }
    })
  }

  function handleDeleteApp() {
    const appId = deletingApp!.id

    startTransition(async () => {
      try {
        setDeleteAppError("")
        await deleteApp({ data: { appId } })
        setDeletingApp(null)
        await router.invalidate()
      } catch (error) {
        setDeleteAppError(getErrorMessage(error))
      }
    })
  }

  function handleProcessAction(
    action: "start" | "stop" | "restart",
    appId: number
  ) {
    startTransition(async () => {
      try {
        setProcessError("")
        const snapshot =
          action === "start"
            ? await startAppProcess({ data: { appId } })
            : action === "stop"
              ? await stopAppProcess({ data: { appId } })
              : await restartAppProcess({ data: { appId } })
        updateProcessStatus(appId, snapshot)
      } catch (error) {
        setProcessError(getErrorMessage(error))
      }
    })
  }

  return (
    <section className="app-page flex flex-col gap-6">
      <WorkspaceOverviewHeader
        appCount={selectedWorkspace.apps.length}
        workspaceName={selectedWorkspace.name}
        onAddApp={() => {
          setAppError("")
          setAppDialogOpen(true)
        }}
        onDeleteWorkspace={() => {
          setDeleteError("")
          setDeleteDialogOpen(true)
        }}
        onRenameWorkspace={() => {
          setRenameError("")
          setRenameDialogOpen(true)
        }}
      />

      {selectedWorkspace.apps.length ? (
        <WorkspaceAppsGrid
          apps={selectedWorkspace.apps}
          isPending={isPending}
          processStatuses={processStatuses}
          workspaceId={selectedWorkspace.id}
          onActiveVariableSetChange={(app, activeVariableSet) => {
            startTransition(async () => {
              try {
                setProcessError("")
                await updateApp({
                  data: {
                    appId: app.id,
                    name: app.name,
                    pathLocation: app.pathLocation,
                    activeVariableSet,
                  },
                })
                await router.invalidate()
              } catch (error) {
                setProcessError(getErrorMessage(error))
              }
            })
          }}
          onDeleteApp={(app) => {
            setDeleteAppError("")
            setDeletingApp(app)
          }}
          onEditApp={(app) => {
            setEditAppError("")
            setEditingApp(app)
          }}
          onProcessAction={handleProcessAction}
        />
      ) : (
        <EmptyApps
          onAddApp={() => {
            setAppError("")
            setAppDialogOpen(true)
          }}
        />
      )}

      {processError ? (
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
          role="alert"
        >
          {processError}
        </p>
      ) : null}

      <CreateAppDialog
        error={appError}
        isPending={isPending}
        open={appDialogOpen}
        workspaceName={selectedWorkspace.name}
        onOpenChange={setAppDialogOpen}
        onSubmit={handleCreateApp}
      />
      <EditAppDialog
        app={editingApp}
        error={editAppError}
        isPending={isPending}
        open={Boolean(editingApp)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingApp(null)
            setEditAppError("")
          }
        }}
        onSubmit={handleUpdateApp}
      />
      <DeleteAppDialog
        appName={deletingApp?.name ?? ""}
        error={deleteAppError}
        isPending={isPending}
        open={Boolean(deletingApp)}
        onConfirm={handleDeleteApp}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingApp(null)
            setDeleteAppError("")
          }
        }}
      />
      <EditWorkspaceDialog
        error={renameError}
        isPending={isPending}
        open={renameDialogOpen}
        workspace={selectedWorkspace}
        onOpenChange={(open) => {
          setRenameDialogOpen(open)
          if (!open) {
            setRenameError("")
          }
        }}
        onSubmit={handleRenameWorkspace}
      />
      <DeleteWorkspaceDialog
        error={deleteError}
        isPending={isPending}
        open={deleteDialogOpen}
        workspaceName={selectedWorkspace.name}
        onConfirm={handleDeleteWorkspace}
        onOpenChange={setDeleteDialogOpen}
      />
    </section>
  )
}
