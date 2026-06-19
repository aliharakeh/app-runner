import { Dialog } from "@base-ui/react/dialog"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import {
  FileCode,
  FolderOpen,
  Play,
  Plus,
  Trash2,
  Variable,
} from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  CreateAppDialog,
  getErrorMessage,
} from "@/components/workspace-dialogs"
import {
  createAppFn,
  deleteWorkspaceFn,
  getWorkspaceFn,
} from "@/db/workspace-functions"

export const Route = createFileRoute("/workspaces/$workspaceId")({
  loader: async ({ params }) => ({
    workspace: await getWorkspaceFn({
      data: { workspaceId: params.workspaceId },
    }),
  }),
  component: WorkspaceOverview,
})

function WorkspaceOverview() {
  const router = useRouter()
  const navigate = Route.useNavigate()
  const { workspace } = Route.useLoaderData()
  const createApp = useServerFn(createAppFn)
  const deleteWorkspace = useServerFn(deleteWorkspaceFn)
  const [isPending, startTransition] = React.useTransition()
  const [appDialogOpen, setAppDialogOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [appError, setAppError] = React.useState("")
  const [deleteError, setDeleteError] = React.useState("")

  const selectedWorkspace = workspace

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
          {selectedWorkspace.apps.map((app) => (
            <Link
              key={app.id}
              to="/workspaces/$workspaceId/apps/$appId"
              params={{
                workspaceId: String(selectedWorkspace.id),
                appId: String(app.id),
              }}
              search={{ tab: "variables" }}
              className="flex min-h-44 flex-col gap-4 rounded-md border bg-card p-4 text-card-foreground transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <FolderOpen />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-medium">{app.name}</h2>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {app.pathLocation}
                  </p>
                </div>
              </div>
              <dl className="mt-auto grid gap-3 text-sm">
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
              </dl>
            </Link>
          ))}
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

      <CreateAppDialog
        error={appError}
        isPending={isPending}
        open={appDialogOpen}
        workspaceName={selectedWorkspace.name}
        onOpenChange={setAppDialogOpen}
        onSubmit={handleCreateApp}
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
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-right font-medium">
        {value}
      </dd>
    </div>
  )
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
