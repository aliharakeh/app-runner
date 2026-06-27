import { Dialog } from "@base-ui/react/dialog"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import {
  FileCode,
  Pencil,
  Play,
  Plus,
  Settings2,
  Trash2,
  Variable,
  X,
} from "lucide-react"
import * as React from "react"

import { inputClassName } from "@/components/app-config/form-styles"
import { RunTab } from "@/components/app-config/run-tab"
import { TabButton } from "@/components/app-config/tab-button"
import { TemplateTab } from "@/components/app-config/template-tab"
import { VariablesTab } from "@/components/app-config/variables-tab"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EditAppDialog, getErrorMessage } from "@/components/workspace-dialogs"
import {
  createAppConfigSetFn,
  createTemplateConfigFn,
  createVariableConfigFn,
  deleteAppConfigSetFn,
  deleteTemplateConfigFn,
  deleteVariableConfigFn,
  getAppProcessStatusesFn,
  getAppFn,
  listAppFilesFn,
  restartAppProcessFn,
  startAppProcessFn,
  stopAppProcessFn,
  updateTemplateConfigFn,
  updateAppFn,
  updateVariableConfigFn,
  upsertRunConfigFn,
} from "@/db/workspace-functions"

const configTabs = ["variables", "template", "run"] as const
type ConfigTab = (typeof configTabs)[number]

export const Route = createFileRoute("/workspaces_/$workspaceId/apps/$appId")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: isConfigTab(search.tab) ? search.tab : "variables",
  }),
  loader: async ({ params }) => {
    const [app, processStatuses, appFiles] = await Promise.all([
      getAppFn({
        data: { appId: params.appId },
      }),
      getAppProcessStatusesFn({
        data: { appIds: [params.appId] },
      }),
      listAppFilesFn({
        data: { appId: params.appId },
      }),
    ])
    const processStatus = Object.values(processStatuses)[0]

    return {
      app,
      appFiles,
      processStatus,
    }
  },
  component: AppConfigPage,
})

function AppConfigPage() {
  const router = useRouter()
  const navigate = Route.useNavigate()
  const { workspaceId, appId } = Route.useParams()
  const { tab } = Route.useSearch()
  const { app, appFiles, processStatus } = Route.useLoaderData()
  const createAppConfigSet = useServerFn(createAppConfigSetFn)
  const createVariableConfig = useServerFn(createVariableConfigFn)
  const updateVariableConfig = useServerFn(updateVariableConfigFn)
  const deleteVariableConfig = useServerFn(deleteVariableConfigFn)
  const deleteAppConfigSet = useServerFn(deleteAppConfigSetFn)
  const updateApp = useServerFn(updateAppFn)
  const createTemplateConfig = useServerFn(createTemplateConfigFn)
  const updateTemplateConfig = useServerFn(updateTemplateConfigFn)
  const deleteTemplateConfig = useServerFn(deleteTemplateConfigFn)
  const upsertRunConfig = useServerFn(upsertRunConfigFn)
  const startAppProcess = useServerFn(startAppProcessFn)
  const stopAppProcess = useServerFn(stopAppProcessFn)
  const restartAppProcess = useServerFn(restartAppProcessFn)
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState("")
  const [editAppOpen, setEditAppOpen] = React.useState(false)
  const [editAppError, setEditAppError] = React.useState("")
  const [newVariableSetOpen, setNewVariableSetOpen] = React.useState(false)
  const [deleteVariableSetOpen, setDeleteVariableSetOpen] =
    React.useState(false)

  const routeWorkspaceId = Number(workspaceId)
  const routeAppId = Number(appId)
  const selectedApp =
    app && app.workspaceId === routeWorkspaceId && app.id === routeAppId
      ? app
      : null
  const isProcessRunning = processStatus.status === "running"

  React.useEffect(() => {
    if (!isProcessRunning) {
      return
    }

    const intervalId = window.setInterval(() => {
      void router.invalidate()
    }, 2000)

    return () => window.clearInterval(intervalId)
  }, [isProcessRunning, router])

  if (!selectedApp) {
    return (
      <section className="app-page flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">App not found</h1>
        <p className="text-sm text-muted-foreground">
          The app may have been deleted or moved to another workspace.
        </p>
        <Button
          className="w-fit"
          onClick={() =>
            navigate({
              to: "/workspaces/$workspaceId",
              params: { workspaceId },
            })
          }
        >
          Back to workspace
        </Button>
      </section>
    )
  }

  const currentApp = selectedApp
  const activeConfigSet = currentApp.activeVariableSet || "default"
  const configSetNames = getConfigSetNames(
    currentApp.configSets,
    currentApp.variableConfigs,
    currentApp.templateConfigs,
    currentApp.runConfigs,
    activeConfigSet
  )
  const activeVariables = getVariablesForSet(
    currentApp.variableConfigs,
    activeConfigSet
  )
  const activeTemplates = getTemplatesForSet(
    currentApp.templateConfigs,
    activeConfigSet
  )
  const activeRunConfig = getRunConfigForSet(
    currentApp.runConfigs,
    activeConfigSet
  )
  const activeConfigItemCount =
    activeVariables.length + activeTemplates.length + (activeRunConfig ? 1 : 0)

  function invalidateAfterSave() {
    return router.invalidate()
  }

  function handleVariableSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const id = String(formData.get("id") ?? "")
    const setName = String(formData.get("setName") ?? activeConfigSet)
    const name = String(formData.get("name") ?? "")
    const value = String(formData.get("value") ?? "")

    startTransition(async () => {
      try {
        setError("")
        if (id) {
          await updateVariableConfig({
            data: { id, appId: currentApp.id, setName, name, value },
          })
        } else {
          await createVariableConfig({
            data: { appId: currentApp.id, setName, name, value },
          })
          form.reset()
        }
        await invalidateAfterSave()
      } catch (saveError) {
        setError(getErrorMessage(saveError))
      }
    })
  }

  function handleVariableSetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const nextConfigSet = String(formData.get("setName") ?? "")

    startTransition(async () => {
      try {
        setError("")
        await createAppConfigSet({
          data: { appId: currentApp.id, setName: nextConfigSet },
        })
        await updateApp({
          data: {
            appId: currentApp.id,
            name: currentApp.name,
            pathLocation: currentApp.pathLocation,
            activeVariableSet: nextConfigSet,
          },
        })
        setNewVariableSetOpen(false)
        await invalidateAfterSave()
      } catch (saveError) {
        setError(getErrorMessage(saveError))
      }
    })
  }

  function handleActiveConfigSetChange(nextConfigSet: string) {
    startTransition(async () => {
      try {
        setError("")
        await updateApp({
          data: {
            appId: currentApp.id,
            name: currentApp.name,
            pathLocation: currentApp.pathLocation,
            activeVariableSet: nextConfigSet,
          },
        })
        await invalidateAfterSave()
      } catch (saveError) {
        setError(getErrorMessage(saveError))
      }
    })
  }

  function handleAppSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const submittedAppId = Number(formData.get("appId"))
    const name = String(formData.get("name") ?? "")
    const pathLocation = String(formData.get("pathLocation") ?? "")

    startTransition(async () => {
      try {
        setEditAppError("")
        await updateApp({
          data: {
            appId: submittedAppId,
            name,
            pathLocation,
          },
        })
        setEditAppOpen(false)
        await invalidateAfterSave()
      } catch (saveError) {
        setEditAppError(getErrorMessage(saveError))
      }
    })
  }

  function handleDeleteVariable(id: number) {
    startTransition(async () => {
      try {
        setError("")
        await deleteVariableConfig({ data: { id } })
        await invalidateAfterSave()
      } catch (deleteError) {
        setError(getErrorMessage(deleteError))
      }
    })
  }

  function handleDeleteVariableSet() {
    startTransition(async () => {
      try {
        setError("")
        await deleteAppConfigSet({
          data: { appId: currentApp.id, setName: activeConfigSet },
        })
        await updateApp({
          data: {
            appId: currentApp.id,
            name: currentApp.name,
            pathLocation: currentApp.pathLocation,
            activeVariableSet: "default",
          },
        })
        setDeleteVariableSetOpen(false)
        await invalidateAfterSave()
      } catch (deleteError) {
        setError(getErrorMessage(deleteError))
      }
    })
  }

  function handleTemplateSubmit(
    event: React.FormEvent<HTMLFormElement>,
    onSaved?: () => void
  ) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const id = String(formData.get("id") ?? "")
    const setName = String(formData.get("setName") ?? activeConfigSet)
    const filePath = String(formData.get("filePath") ?? "")
    const templateContent = String(formData.get("templateContent") ?? "")

    startTransition(async () => {
      try {
        setError("")
        if (id) {
          await updateTemplateConfig({
            data: {
              id,
              appId: currentApp.id,
              setName,
              filePath,
              templateContent,
            },
          })
        } else {
          await createTemplateConfig({
            data: {
              appId: currentApp.id,
              setName,
              filePath,
              templateContent,
            },
          })
          form.reset()
        }
        await invalidateAfterSave()
        onSaved?.()
      } catch (saveError) {
        setError(getErrorMessage(saveError))
      }
    })
  }

  function handleDeleteTemplate(id: number) {
    startTransition(async () => {
      try {
        setError("")
        await deleteTemplateConfig({ data: { id } })
        await invalidateAfterSave()
      } catch (deleteError) {
        setError(getErrorMessage(deleteError))
      }
    })
  }

  function handleRunSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const setName = String(formData.get("setName") ?? activeConfigSet)
    const command = String(formData.get("command") ?? "")

    startTransition(async () => {
      try {
        setError("")
        await upsertRunConfig({
          data: { appId: currentApp.id, setName, command },
        })
        await invalidateAfterSave()
      } catch (saveError) {
        setError(getErrorMessage(saveError))
      }
    })
  }

  function handleProcessAction(action: "start" | "stop" | "restart") {
    startTransition(async () => {
      try {
        setError("")
        if (action === "start") {
          await startAppProcess({ data: { appId: currentApp.id } })
        } else if (action === "stop") {
          await stopAppProcess({ data: { appId: currentApp.id } })
        } else {
          await restartAppProcess({ data: { appId: currentApp.id } })
        }
        await invalidateAfterSave()
      } catch (processError) {
        setError(getErrorMessage(processError))
      }
    })
  }

  return (
    <section className="app-page flex flex-col gap-6">
      <div className="app-panel flex flex-wrap items-start justify-between gap-4 rounded-lg p-4 sm:p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            <Settings2 />
            <span>App configuration</span>
          </div>
          <h1 className="mt-2 truncate text-3xl font-semibold tracking-tight">
            {currentApp.name}
          </h1>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
            {currentApp.pathLocation}
          </p>
          <div className="mt-4">
            <AppConfigSetControl
              activeConfigSet={activeConfigSet}
              configItemCount={activeConfigItemCount}
              configSetNames={configSetNames}
              deleteConfigSetOpen={deleteVariableSetOpen}
              isPending={isPending}
              newConfigSetOpen={newVariableSetOpen}
              onDelete={handleDeleteVariableSet}
              onDeleteOpenChange={setDeleteVariableSetOpen}
              onNewOpenChange={setNewVariableSetOpen}
              onNewSubmit={handleVariableSetSubmit}
              onSetChange={handleActiveConfigSetChange}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              setEditAppError("")
              setEditAppOpen(true)
            }}
          >
            <Pencil data-icon="inline-start" />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate({
                to: "/workspaces/$workspaceId",
                params: { workspaceId },
              })
            }
          >
            Back to workspace
          </Button>
        </div>
      </div>

      <EditAppDialog
        app={currentApp}
        error={editAppError}
        isPending={isPending}
        open={editAppOpen}
        onOpenChange={(open) => {
          setEditAppOpen(open)
          if (!open) {
            setEditAppError("")
          }
        }}
        onSubmit={handleAppSubmit}
      />

      <div className="app-panel flex w-fit flex-wrap gap-1 rounded-lg p-1">
        <TabButton
          active={tab === "variables"}
          icon={<Variable />}
          label="Variables"
          onClick={() => navigate({ search: { tab: "variables" } })}
        />
        <TabButton
          active={tab === "template"}
          icon={<FileCode />}
          label="Template"
          onClick={() => navigate({ search: { tab: "template" } })}
        />
        <TabButton
          active={tab === "run"}
          icon={<Play />}
          label="Run"
          onClick={() => navigate({ search: { tab: "run" } })}
        />
      </div>

      {error ? (
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {tab === "variables" ? (
        <VariablesTab
          isPending={isPending}
          activeVariableSet={activeConfigSet}
          variables={activeVariables}
          onDelete={handleDeleteVariable}
          onSubmit={handleVariableSubmit}
        />
      ) : null}
      {tab === "template" ? (
        <TemplateTab
          activeConfigSet={activeConfigSet}
          appFiles={appFiles}
          isPending={isPending}
          templates={activeTemplates}
          onDelete={handleDeleteTemplate}
          onSubmit={handleTemplateSubmit}
        />
      ) : null}
      {tab === "run" ? (
        <RunTab
          key={activeConfigSet}
          activeConfigSet={activeConfigSet}
          command={activeRunConfig?.command ?? ""}
          isPending={isPending}
          processStatus={processStatus}
          runConfig={activeRunConfig}
          templates={activeTemplates}
          variables={activeVariables}
          onRestart={() => handleProcessAction("restart")}
          onStart={() => handleProcessAction("start")}
          onStop={() => handleProcessAction("stop")}
          onSubmit={handleRunSubmit}
        />
      ) : null}
    </section>
  )
}

function isConfigTab(value: unknown): value is ConfigTab {
  return configTabs.includes(value as ConfigTab)
}

function AppConfigSetControl({
  activeConfigSet,
  configItemCount,
  configSetNames,
  deleteConfigSetOpen,
  isPending,
  newConfigSetOpen,
  onDelete,
  onDeleteOpenChange,
  onNewOpenChange,
  onNewSubmit,
  onSetChange,
}: {
  activeConfigSet: string
  configItemCount: number
  configSetNames: Array<string>
  deleteConfigSetOpen: boolean
  isPending: boolean
  newConfigSetOpen: boolean
  onDelete: () => void
  onDeleteOpenChange: (open: boolean) => void
  onNewOpenChange: (open: boolean) => void
  onNewSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onSetChange: (setName: string) => void
}) {
  const configSetItems = configSetNames.map((setName) => ({
    label: setName,
    value: setName,
  }))

  return (
    <div className="flex flex-wrap items-end gap-2">
      <NewConfigSetDialog
        isPending={isPending}
        open={newConfigSetOpen}
        onOpenChange={onNewOpenChange}
        onSubmit={onNewSubmit}
      />
      <DeleteConfigSetDialog
        activeConfigSet={activeConfigSet}
        configItemCount={configItemCount}
        isPending={isPending}
        open={deleteConfigSetOpen}
        onDelete={onDelete}
        onOpenChange={onDeleteOpenChange}
      />
      <label className="flex w-fit min-w-52 flex-col gap-2 text-sm font-medium">
        Config set
        <Select
          items={configSetItems}
          value={activeConfigSet}
          disabled={isPending}
          onValueChange={(value) => {
            if (value) {
              onSetChange(value)
            }
          }}
        >
          <SelectTrigger className="h-9 w-full bg-background shadow-inner shadow-muted/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align="start">
            <SelectGroup>
              {configSetItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </label>
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => onNewOpenChange(true)}
      >
        <Plus data-icon="inline-start" />
        New set
      </Button>
      <Button
        type="button"
        variant="destructive"
        disabled={isPending}
        onClick={() => onDeleteOpenChange(true)}
      >
        <Trash2 data-icon="inline-start" />
        Delete set
      </Button>
    </div>
  )
}

function NewConfigSetDialog({
  isPending,
  open,
  onOpenChange,
  onSubmit,
}: {
  isPending: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" />
        <Dialog.Popup className="app-panel fixed top-1/2 left-1/2 flex w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg bg-popover p-5 text-popover-foreground outline-none">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="text-base font-semibold">
              New config set
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              type="button"
            >
              <X />
            </Dialog.Close>
          </div>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Set name
              <input
                autoFocus
                name="setName"
                required
                className={inputClassName}
                placeholder="staging"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Dialog.Close
                className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
                type="button"
              >
                Cancel
              </Dialog.Close>
              <Button type="submit" disabled={isPending}>
                Create set
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DeleteConfigSetDialog({
  activeConfigSet,
  configItemCount,
  isPending,
  open,
  onDelete,
  onOpenChange,
}: {
  activeConfigSet: string
  configItemCount: number
  isPending: boolean
  open: boolean
  onDelete: () => void
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" />
        <Dialog.Popup className="app-panel fixed top-1/2 left-1/2 flex w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg bg-popover p-5 text-popover-foreground outline-none">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold">
                Delete config set
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Delete {activeConfigSet} and {configItemCount} config items.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              type="button"
            >
              <X />
            </Dialog.Close>
          </div>
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
              onClick={onDelete}
            >
              Delete set
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function getConfigSetNames(
  configSets: Array<{ setName: string }>,
  variables: Array<{ setName: string }>,
  templates: Array<{ setName: string }>,
  runConfigs: Array<{ setName: string }>,
  activeSet = "default"
) {
  return Array.from(
    new Set([
      activeSet,
      "default",
      ...configSets.map((configSet) => configSet.setName),
      ...variables.map((variable) => variable.setName),
      ...templates.map((template) => template.setName),
      ...runConfigs.map((runConfig) => runConfig.setName),
    ])
  ).sort()
}

function getVariablesForSet<
  TVariable extends { setName: string; name: string; value: string },
>(variables: Array<TVariable>, setName: string) {
  return variables.filter((variable) => variable.setName === setName)
}

function getTemplatesForSet<TTemplate extends { setName: string }>(
  templates: Array<TTemplate>,
  setName: string
) {
  return templates.filter((template) => template.setName === setName)
}

function getRunConfigForSet<TRunConfig extends { setName: string }>(
  runConfigs: Array<TRunConfig>,
  setName: string
) {
  return runConfigs.find((runConfig) => runConfig.setName === setName) ?? null
}
