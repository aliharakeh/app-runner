import { Dialog } from "@base-ui/react/dialog"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import {
  Activity,
  FileCode,
  FolderOpen,
  Pencil,
  Play,
  Plus,
  RefreshCcw,
  Square,
  Trash2,
  Variable,
} from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  CreateAppDialog,
  EditAppDialog,
  getErrorMessage,
} from "@/components/workspace-dialogs"
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
} from "@/db/workspace-functions"

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
  const { processStatuses, workspace } = Route.useLoaderData()
  const createApp = useServerFn(createAppFn)
  const updateApp = useServerFn(updateAppFn)
  const deleteApp = useServerFn(deleteAppFn)
  const deleteWorkspace = useServerFn(deleteWorkspaceFn)
  const startAppProcess = useServerFn(startAppProcessFn)
  const stopAppProcess = useServerFn(stopAppProcessFn)
  const restartAppProcess = useServerFn(restartAppProcessFn)
  const [isPending, startTransition] = React.useTransition()
  const [appDialogOpen, setAppDialogOpen] = React.useState(false)
  const [editingApp, setEditingApp] = React.useState<
    NonNullable<typeof workspace>["apps"][number] | null
  >(null)
  const [deletingApp, setDeletingApp] = React.useState<
    NonNullable<typeof workspace>["apps"][number] | null
  >(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [appError, setAppError] = React.useState("")
  const [editAppError, setEditAppError] = React.useState("")
  const [deleteAppError, setDeleteAppError] = React.useState("")
  const [deleteError, setDeleteError] = React.useState("")
  const [processError, setProcessError] = React.useState("")

  const selectedWorkspace = workspace
  const hasRunningApps = Object.values(processStatuses).some(
    (status) => status.status === "running"
  )

  React.useEffect(() => {
    if (!hasRunningApps) {
      return
    }

    const intervalId = window.setInterval(() => {
      void router.invalidate()
    }, 2000)

    return () => window.clearInterval(intervalId)
  }, [hasRunningApps, router])

  if (!selectedWorkspace) {
    return (
      <section className="flex flex-col gap-3 p-6">
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
        if (action === "start") {
          await startAppProcess({ data: { appId } })
        } else if (action === "stop") {
          await stopAppProcess({ data: { appId } })
        } else {
          await restartAppProcess({ data: { appId } })
        }
        await router.invalidate()
      } catch (error) {
        setProcessError(getErrorMessage(error))
      }
    })
  }

  return (
    <section className="flex min-h-svh flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {selectedWorkspace.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedWorkspace.apps.length}{" "}
            {selectedWorkspace.apps.length === 1 ? "app" : "apps"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setAppError("")
              setAppDialogOpen(true)
            }}
          >
            <Plus data-icon="inline-start" />
            Add app
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setDeleteError("")
              setDeleteDialogOpen(true)
            }}
          >
            <Trash2 data-icon="inline-start" />
            Delete
          </Button>
        </div>
      </div>

      {selectedWorkspace.apps.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {selectedWorkspace.apps.map((app) => {
            const processStatus = processStatuses[app.id]

            return (
              <article
                key={app.id}
                className="flex min-h-44 flex-col gap-3 rounded-md border bg-card p-4 text-card-foreground"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to="/workspaces/$workspaceId/apps/$appId"
                    params={{
                      workspaceId: String(selectedWorkspace.id),
                      appId: String(app.id),
                    }}
                    search={{ tab: "variables" }}
                    className="flex min-w-0 flex-1 items-start gap-2 rounded-md transition-colors hover:text-primary"
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <FolderOpen />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-medium">
                        {app.name}
                      </h2>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {app.pathLocation}
                      </p>
                    </div>
                  </Link>
                  <AppLifecycleControls
                    commandConfigured={Boolean(app.runConfig?.command)}
                    isPending={isPending}
                    processStatus={processStatus}
                    onEdit={() => {
                      setEditAppError("")
                      setEditingApp(app)
                    }}
                    onDelete={() => {
                      setDeleteAppError("")
                      setDeletingApp(app)
                    }}
                    onRestart={() => handleProcessAction("restart", app.id)}
                    onStart={() => handleProcessAction("start", app.id)}
                    onStop={() => handleProcessAction("stop", app.id)}
                  />
                </div>

                <Link
                  to="/workspaces/$workspaceId/apps/$appId"
                  params={{
                    workspaceId: String(selectedWorkspace.id),
                    appId: String(app.id),
                  }}
                  search={{ tab: "variables" }}
                  className="-mx-2 flex flex-1 flex-col rounded-md px-2 py-1 transition-colors hover:bg-muted/40"
                >
                  <dl className="grid gap-3 text-sm">
                    <ConfigStat
                      icon={<Variable />}
                      label="Variables"
                      value={String(app.variableConfigs.length)}
                    />
                    <ConfigStat
                      icon={<FileCode />}
                      label="Templates"
                      value={String(app.templateConfigs.length)}
                    />
                    <ConfigStat
                      icon={<Play />}
                      label="Run command"
                      value={app.runConfig?.command || "Not configured"}
                    />
                    <ConfigStat
                      icon={<Activity />}
                      label="Status"
                      value={formatProcessStatus(processStatus)}
                    />
                  </dl>
                </Link>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-md border border-dashed p-8 text-center">
          <FolderOpen className="text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-medium">No apps yet</h2>
            <p className="text-sm text-muted-foreground">
              Add the first app in this workspace.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setAppError("")
              setAppDialogOpen(true)
            }}
          >
            <Plus data-icon="inline-start" />
            Add app
          </Button>
        </div>
      )}

      {processError ? (
        <p
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
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

function AppLifecycleControls({
  commandConfigured,
  isPending,
  processStatus,
  onEdit,
  onDelete,
  onRestart,
  onStart,
  onStop,
}: {
  commandConfigured: boolean
  isPending: boolean
  processStatus: {
    appId: number
    command: string
    pid: number | null
    status: string
    stdout: string
    stderr: string
    startedAt: string | null
    stoppedAt: string | null
    exitCode: number | null
    signal: string | null
    error: string | null
  }
  onEdit: () => void
  onDelete: () => void
  onRestart: () => void
  onStart: () => void
  onStop: () => void
}) {
  const isRunning = processStatus.status === "running"

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        size="icon-xs"
        aria-label="Run app"
        title="Run"
        disabled={isPending || isRunning || !commandConfigured}
        onClick={onStart}
      >
        <Play />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        variant="outline"
        aria-label="Stop app"
        title="Stop"
        disabled={isPending || !isRunning}
        onClick={onStop}
      >
        <Square />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        variant="outline"
        aria-label="Restart app"
        title="Restart"
        disabled={isPending || !commandConfigured}
        onClick={onRestart}
      >
        <RefreshCcw />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        variant="outline"
        aria-label="Edit app"
        title="Edit"
        disabled={isPending || isRunning}
        onClick={onEdit}
      >
        <Pencil />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        variant="destructive"
        aria-label="Delete app"
        title="Delete"
        disabled={isPending || isRunning}
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </div>
  )
}

function ConfigStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-3.5">
        {icon}
      </div>
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-right font-medium">
        {value}
      </dd>
    </div>
  )
}

function formatProcessStatus(status: { pid: number | null; status: string }) {
  if (status.status === "running" && status.pid) {
    return `Running (${status.pid})`
  }

  return status.status
}

function DeleteWorkspaceDialog({
  error,
  isPending,
  open,
  workspaceName,
  onConfirm,
  onOpenChange,
}: {
  error: string
  isPending: boolean
  open: boolean
  workspaceName: string
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 flex w-[min(calc(100vw-2rem),25rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-md border bg-popover p-5 text-popover-foreground shadow-lg outline-none">
          <div className="flex flex-col gap-2">
            <Dialog.Title className="text-base font-semibold">
              Delete workspace
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              This will permanently delete {workspaceName} and all apps inside
              it.
            </Dialog.Description>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Dialog.Close
              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
              type="button"
            >
              Cancel
            </Dialog.Close>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={onConfirm}
            >
              Delete
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DeleteAppDialog({
  appName,
  error,
  isPending,
  open,
  onConfirm,
  onOpenChange,
}: {
  appName: string
  error: string
  isPending: boolean
  open: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 flex w-[min(calc(100vw-2rem),25rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-md border bg-popover p-5 text-popover-foreground shadow-lg outline-none">
          <div className="flex flex-col gap-2">
            <Dialog.Title className="text-base font-semibold">
              Delete app
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              This will permanently delete {appName} and its template backups.
            </Dialog.Description>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Dialog.Close
              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
              type="button"
            >
              Cancel
            </Dialog.Close>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={onConfirm}
            >
              Delete
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
