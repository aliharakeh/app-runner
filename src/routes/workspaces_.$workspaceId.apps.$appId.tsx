import { Dialog } from "@base-ui/react/dialog"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import {
  Copy,
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
  reorderTemplateConfigsFn,
  reorderVariableConfigsFn,
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
  const reorderTemplateConfigs = useServerFn(reorderTemplateConfigsFn)
  const reorderVariableConfigs = useServerFn(reorderVariableConfigsFn)
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
  const [copyConfigSetOpen, setCopyConfigSetOpen] = React.useState(false)
  const [pendingConfigCopy, setPendingConfigCopy] =
    React.useState<PendingConfigCopy | null>(null)

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
  const configSetCopySummaries = getConfigSetCopySummaries(
    configSetNames,
    currentApp.variableConfigs,
    currentApp.templateConfigs,
    currentApp.runConfigs
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

  function prepareConfigCopy(
    request: ConfigCopyRequest,
    activateCopiedSet: boolean
  ) {
    const conflicts = getConfigCopyConflicts({
      copyTemplates: request.copyTemplates,
      copyVariables: request.copyVariables,
      sourceSetName: request.sourceSetName,
      targetSetName: request.setName,
      templates: currentApp.templateConfigs,
      variables: currentApp.variableConfigs,
    })

    if (
      conflicts.variableConflicts.length ||
      conflicts.templateConflicts.length
    ) {
      setPendingConfigCopy({ activateCopiedSet, conflicts, request })
      return
    }

    submitConfigCopy({
      activateCopiedSet,
      request,
      templateConflictChoices: [],
      variableConflictChoices: [],
    })
  }

  function submitConfigCopy({
    activateCopiedSet,
    request,
    templateConflictChoices,
    variableConflictChoices,
  }: {
    activateCopiedSet: boolean
    request: ConfigCopyRequest
    templateConflictChoices: Array<TemplateConflictChoice>
    variableConflictChoices: Array<VariableConflictChoice>
  }) {
    startTransition(async () => {
      try {
        setError("")
        await createAppConfigSet({
          data: {
            appId: currentApp.id,
            setName: request.setName,
            sourceSetName: request.sourceSetName,
            copyVariables: request.copyVariables,
            copyTemplates: request.copyTemplates,
            copyRunConfig: request.copyRunConfig,
            variableConflictChoices,
            templateConflictChoices,
          },
        })

        if (activateCopiedSet) {
          await updateApp({
            data: {
              appId: currentApp.id,
              name: currentApp.name,
              pathLocation: currentApp.pathLocation,
              activeVariableSet: request.setName,
            },
          })
        }

        setNewVariableSetOpen(false)
        setCopyConfigSetOpen(false)
        setPendingConfigCopy(null)
        await invalidateAfterSave()
      } catch (saveError) {
        setError(getErrorMessage(saveError))
      }
    })
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
    const sourceSetName = String(formData.get("sourceSetName") ?? "")
    const copyVariables = formData.get("copyVariables") === "true"
    const copyTemplates = formData.get("copyTemplates") === "true"
    const copyRunConfig = formData.get("copyRunConfig") === "true"
    const shouldCopy = copyVariables || copyTemplates || copyRunConfig

    prepareConfigCopy(
      {
        setName: nextConfigSet,
        sourceSetName: shouldCopy ? sourceSetName : "",
        copyVariables,
        copyTemplates,
        copyRunConfig,
      },
      true
    )
  }

  function handleCopyConfigSetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const sourceSetName = String(formData.get("sourceSetName") ?? "")
    const copyVariables = formData.get("copyVariables") === "true"
    const copyTemplates = formData.get("copyTemplates") === "true"
    const copyRunConfig = formData.get("copyRunConfig") === "true"

    prepareConfigCopy(
      {
        setName: activeConfigSet,
        sourceSetName,
        copyVariables,
        copyTemplates,
        copyRunConfig,
      },
      false
    )
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

  function handleVariablesReorder(orderedIds: Array<number>) {
    startTransition(async () => {
      try {
        setError("")
        await reorderVariableConfigs({
          data: {
            appId: currentApp.id,
            setName: activeConfigSet,
            orderedIds,
          },
        })
        await invalidateAfterSave()
      } catch (reorderError) {
        setError(getErrorMessage(reorderError))
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

  function handleTemplatesReorder(orderedIds: Array<number>) {
    startTransition(async () => {
      try {
        setError("")
        await reorderTemplateConfigs({
          data: {
            appId: currentApp.id,
            setName: activeConfigSet,
            orderedIds,
          },
        })
        await invalidateAfterSave()
      } catch (reorderError) {
        setError(getErrorMessage(reorderError))
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
        <div className="min-w-0 flex-1">
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
              copyConfigSetOpen={copyConfigSetOpen}
              configSetCopySummaries={configSetCopySummaries}
              configItemCount={activeConfigItemCount}
              configSetNames={configSetNames}
              deleteConfigSetOpen={deleteVariableSetOpen}
              isPending={isPending}
              newConfigSetOpen={newVariableSetOpen}
              onDelete={handleDeleteVariableSet}
              onDeleteOpenChange={setDeleteVariableSetOpen}
              onCopyOpenChange={setCopyConfigSetOpen}
              onCopySubmit={handleCopyConfigSetSubmit}
              onNewOpenChange={setNewVariableSetOpen}
              onNewSubmit={handleVariableSetSubmit}
              onSetChange={handleActiveConfigSetChange}
            />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
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

      {pendingConfigCopy ? (
        <ConfigConflictDialog
          conflictCopy={pendingConfigCopy}
          isPending={isPending}
          open
          onOpenChange={(open) => {
            if (!open) {
              setPendingConfigCopy(null)
            }
          }}
          onSubmit={(choices) =>
            submitConfigCopy({
              activateCopiedSet: pendingConfigCopy.activateCopiedSet,
              request: pendingConfigCopy.request,
              templateConflictChoices: choices.templateConflictChoices,
              variableConflictChoices: choices.variableConflictChoices,
            })
          }
        />
      ) : null}

      <div className="app-panel flex w-fit flex-wrap gap-1 rounded-lg p-1">
        <TabButton
          active={tab === "variables"}
          count={activeVariables.length}
          icon={<Variable />}
          label="Variables"
          onClick={() => navigate({ search: { tab: "variables" } })}
        />
        <TabButton
          active={tab === "template"}
          count={activeTemplates.length}
          icon={<FileCode />}
          label="Templates"
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
          onReorder={handleVariablesReorder}
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
          onReorder={handleTemplatesReorder}
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

type ConfigSetCopySummary = {
  setName: string
  variableCount: number
  templateCount: number
  hasRunConfig: boolean
}

type ConfigCopyRequest = {
  setName: string
  sourceSetName: string
  copyVariables: boolean
  copyTemplates: boolean
  copyRunConfig: boolean
}

type ConfigConflictChoice = "source" | "target"

type VariableConflictChoice = {
  name: string
  choice: ConfigConflictChoice
}

type TemplateConflictChoice = {
  filePath: string
  choice: ConfigConflictChoice
}

type VariableConflict = {
  name: string
  sourceValue: string
  targetValue: string
}

type TemplateConflict = {
  filePath: string
  sourceContent: string
  targetContent: string
}

type ConfigCopyConflicts = {
  variableConflicts: Array<VariableConflict>
  templateConflicts: Array<TemplateConflict>
}

type PendingConfigCopy = {
  activateCopiedSet: boolean
  request: ConfigCopyRequest
  conflicts: ConfigCopyConflicts
}

function AppConfigSetControl({
  activeConfigSet,
  copyConfigSetOpen,
  configSetCopySummaries,
  configItemCount,
  configSetNames,
  deleteConfigSetOpen,
  isPending,
  newConfigSetOpen,
  onDelete,
  onDeleteOpenChange,
  onCopyOpenChange,
  onCopySubmit,
  onNewOpenChange,
  onNewSubmit,
  onSetChange,
}: {
  activeConfigSet: string
  copyConfigSetOpen: boolean
  configSetCopySummaries: Array<ConfigSetCopySummary>
  configItemCount: number
  configSetNames: Array<string>
  deleteConfigSetOpen: boolean
  isPending: boolean
  newConfigSetOpen: boolean
  onDelete: () => void
  onDeleteOpenChange: (open: boolean) => void
  onCopyOpenChange: (open: boolean) => void
  onCopySubmit: (event: React.FormEvent<HTMLFormElement>) => void
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
        activeConfigSet={activeConfigSet}
        configSetCopySummaries={configSetCopySummaries}
        isPending={isPending}
        open={newConfigSetOpen}
        onOpenChange={onNewOpenChange}
        onSubmit={onNewSubmit}
      />
      <CopyConfigSetDialog
        activeConfigSet={activeConfigSet}
        configSetCopySummaries={configSetCopySummaries}
        isPending={isPending}
        open={copyConfigSetOpen}
        onOpenChange={onCopyOpenChange}
        onSubmit={onCopySubmit}
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
        variant="outline"
        disabled={isPending || configSetNames.length < 2}
        onClick={() => onCopyOpenChange(true)}
      >
        <Copy data-icon="inline-start" />
        Copy config
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
  activeConfigSet,
  configSetCopySummaries,
  isPending,
  open,
  onOpenChange,
  onSubmit,
}: {
  activeConfigSet: string
  configSetCopySummaries: Array<ConfigSetCopySummary>
  isPending: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  const emptyCopySource = "__empty__"
  const initialCopySource = configSetCopySummaries.some(
    (summary) => summary.setName === activeConfigSet
  )
    ? activeConfigSet
    : emptyCopySource
  const [copySource, setCopySource] = React.useState(initialCopySource)
  const [copyVariables, setCopyVariables] = React.useState(
    initialCopySource !== emptyCopySource
  )
  const [copyTemplates, setCopyTemplates] = React.useState(
    initialCopySource !== emptyCopySource
  )
  const [copyRunConfig, setCopyRunConfig] = React.useState(false)
  const selectedSummary =
    configSetCopySummaries.find((summary) => summary.setName === copySource) ??
    null
  const canCopy = Boolean(selectedSummary)
  const copySourceItems = [
    { label: "Start empty", value: emptyCopySource },
    ...configSetCopySummaries.map((summary) => ({
      label: summary.setName,
      value: summary.setName,
    })),
  ]

  React.useEffect(() => {
    if (!open) {
      return
    }

    setCopySource(initialCopySource)
    setCopyVariables(initialCopySource !== emptyCopySource)
    setCopyTemplates(initialCopySource !== emptyCopySource)
    setCopyRunConfig(false)
  }, [initialCopySource, open])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" />
        <Dialog.Popup className="app-panel fixed top-1/2 left-1/2 flex max-h-[min(calc(100svh-2rem),40rem)] w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-auto rounded-lg bg-popover p-5 text-popover-foreground outline-none">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold">
                New config set
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Create a set and optionally copy items from another set.
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
            <label className="flex flex-col gap-2 text-sm font-medium">
              Copy from
              <input
                type="hidden"
                name="sourceSetName"
                value={canCopy ? copySource : ""}
              />
              <Select
                items={copySourceItems}
                value={copySource}
                disabled={isPending}
                onValueChange={(value) => {
                  const nextCopySource = value || emptyCopySource
                  setCopySource(nextCopySource)

                  if (nextCopySource === emptyCopySource) {
                    setCopyVariables(false)
                    setCopyTemplates(false)
                    setCopyRunConfig(false)
                  } else {
                    setCopyVariables(true)
                    setCopyTemplates(true)
                  }
                }}
              >
                <SelectTrigger className="h-9 w-full bg-background shadow-inner shadow-muted/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="start">
                  <SelectGroup>
                    {copySourceItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-sm font-medium">Items to copy</p>
              <div className="mt-3 flex flex-col gap-3">
                <ConfigCopyCheckbox
                  checked={canCopy && copyVariables}
                  count={selectedSummary?.variableCount ?? 0}
                  disabled={!canCopy}
                  label="Variables"
                  name="copyVariables"
                  onCheckedChange={setCopyVariables}
                />
                <ConfigCopyCheckbox
                  checked={canCopy && copyTemplates}
                  count={selectedSummary?.templateCount ?? 0}
                  disabled={!canCopy}
                  label="Templates"
                  name="copyTemplates"
                  onCheckedChange={setCopyTemplates}
                />
                <ConfigCopyCheckbox
                  checked={canCopy && copyRunConfig}
                  count={selectedSummary?.hasRunConfig ? 1 : 0}
                  disabled={!canCopy}
                  label="Run command"
                  name="copyRunConfig"
                  onCheckedChange={setCopyRunConfig}
                />
              </div>
            </div>
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

function CopyConfigSetDialog({
  activeConfigSet,
  configSetCopySummaries,
  isPending,
  open,
  onOpenChange,
  onSubmit,
}: {
  activeConfigSet: string
  configSetCopySummaries: Array<ConfigSetCopySummary>
  isPending: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  const copySourceItems = configSetCopySummaries
    .filter((summary) => summary.setName !== activeConfigSet)
    .map((summary) => ({
      label: summary.setName,
      value: summary.setName,
    }))
  const initialCopySource = copySourceItems[0]?.value ?? ""
  const [copySource, setCopySource] = React.useState(initialCopySource)
  const [copyVariables, setCopyVariables] = React.useState(true)
  const [copyTemplates, setCopyTemplates] = React.useState(true)
  const [copyRunConfig, setCopyRunConfig] = React.useState(false)
  const selectedSummary =
    configSetCopySummaries.find((summary) => summary.setName === copySource) ??
    null
  const canCopy = Boolean(selectedSummary)

  React.useEffect(() => {
    if (!open) {
      return
    }

    setCopySource(initialCopySource)
    setCopyVariables(true)
    setCopyTemplates(true)
    setCopyRunConfig(false)
  }, [initialCopySource, open])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" />
        <Dialog.Popup className="app-panel fixed top-1/2 left-1/2 flex max-h-[min(calc(100svh-2rem),38rem)] w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-auto rounded-lg bg-popover p-5 text-popover-foreground outline-none">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold">
                Copy config
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Copy selected items into {activeConfigSet}.
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
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Copy from
              <input type="hidden" name="sourceSetName" value={copySource} />
              <Select
                items={copySourceItems}
                value={copySource}
                disabled={isPending}
                onValueChange={(value) => setCopySource(value || "")}
              >
                <SelectTrigger className="h-9 w-full bg-background shadow-inner shadow-muted/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="start">
                  <SelectGroup>
                    {copySourceItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-sm font-medium">Items to copy</p>
              <div className="mt-3 flex flex-col gap-3">
                <ConfigCopyCheckbox
                  checked={canCopy && copyVariables}
                  count={selectedSummary?.variableCount ?? 0}
                  disabled={!canCopy}
                  label="Variables"
                  name="copyVariables"
                  onCheckedChange={setCopyVariables}
                />
                <ConfigCopyCheckbox
                  checked={canCopy && copyTemplates}
                  count={selectedSummary?.templateCount ?? 0}
                  disabled={!canCopy}
                  label="Templates"
                  name="copyTemplates"
                  onCheckedChange={setCopyTemplates}
                />
                <ConfigCopyCheckbox
                  checked={canCopy && copyRunConfig}
                  count={selectedSummary?.hasRunConfig ? 1 : 0}
                  disabled={!canCopy}
                  label="Run command"
                  name="copyRunConfig"
                  onCheckedChange={setCopyRunConfig}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Dialog.Close
                className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
                type="button"
              >
                Cancel
              </Dialog.Close>
              <Button type="submit" disabled={isPending || !canCopy}>
                Copy config
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ConfigCopyCheckbox({
  checked,
  count,
  disabled,
  label,
  name,
  onCheckedChange,
}: {
  checked: boolean
  count: number
  disabled: boolean
  label: string
  name: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2">
        <input
          className="size-4 rounded border-input accent-primary disabled:opacity-50"
          type="checkbox"
          name={name}
          value="true"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onCheckedChange(event.currentTarget.checked)}
        />
        <span>{label}</span>
      </span>
      <span className="text-xs text-muted-foreground">{count}</span>
    </label>
  )
}

function ConfigConflictDialog({
  conflictCopy,
  isPending,
  open,
  onOpenChange,
  onSubmit,
}: {
  conflictCopy: PendingConfigCopy
  isPending: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (choices: {
    variableConflictChoices: Array<VariableConflictChoice>
    templateConflictChoices: Array<TemplateConflictChoice>
  }) => void
}) {
  const [variableChoices, setVariableChoices] = React.useState<
    Record<string, ConfigConflictChoice>
  >(() =>
    Object.fromEntries(
      conflictCopy.conflicts.variableConflicts.map((conflict) => [
        conflict.name,
        "target",
      ])
    )
  )
  const [templateChoices, setTemplateChoices] = React.useState<
    Record<string, ConfigConflictChoice>
  >(() =>
    Object.fromEntries(
      conflictCopy.conflicts.templateConflicts.map((conflict) => [
        conflict.filePath,
        "target",
      ])
    )
  )

  function handleSubmit() {
    onSubmit({
      variableConflictChoices: conflictCopy.conflicts.variableConflicts.map(
        (conflict) => ({
          name: conflict.name,
          choice: variableChoices[conflict.name] ?? "target",
        })
      ),
      templateConflictChoices: conflictCopy.conflicts.templateConflicts.map(
        (conflict) => ({
          filePath: conflict.filePath,
          choice: templateChoices[conflict.filePath] ?? "target",
        })
      ),
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" />
        <Dialog.Popup className="app-panel fixed top-1/2 left-1/2 flex max-h-[min(calc(100svh-2rem),44rem)] w-[min(calc(100vw-2rem),56rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-auto rounded-lg bg-popover p-5 text-popover-foreground outline-none">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold">
                Resolve copied config
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Choose what to keep in {conflictCopy.request.setName}.
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

          <div className="flex flex-col gap-4">
            {conflictCopy.conflicts.variableConflicts.length ? (
              <ConflictSection title="Variables">
                {conflictCopy.conflicts.variableConflicts.map((conflict) => (
                  <ConflictChoiceRow
                    key={conflict.name}
                    currentLabel="Keep current value"
                    currentValue={conflict.targetValue}
                    copiedLabel={`Use value from ${conflictCopy.request.sourceSetName}`}
                    copiedValue={conflict.sourceValue}
                    label={conflict.name}
                    value={variableChoices[conflict.name] ?? "target"}
                    onValueChange={(choice) =>
                      setVariableChoices((choices) => ({
                        ...choices,
                        [conflict.name]: choice,
                      }))
                    }
                  />
                ))}
              </ConflictSection>
            ) : null}

            {conflictCopy.conflicts.templateConflicts.length ? (
              <ConflictSection title="Templates">
                {conflictCopy.conflicts.templateConflicts.map((conflict) => (
                  <ConflictChoiceRow
                    key={conflict.filePath}
                    currentLabel="Keep current template"
                    currentValue={conflict.targetContent}
                    copiedLabel={`Use template from ${conflictCopy.request.sourceSetName}`}
                    copiedValue={conflict.sourceContent}
                    label={conflict.filePath}
                    value={templateChoices[conflict.filePath] ?? "target"}
                    onValueChange={(choice) =>
                      setTemplateChoices((choices) => ({
                        ...choices,
                        [conflict.filePath]: choice,
                      }))
                    }
                  />
                ))}
              </ConflictSection>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <Dialog.Close
              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
              type="button"
            >
              Cancel
            </Dialog.Close>
            <Button type="button" disabled={isPending} onClick={handleSubmit}>
              Apply choices
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ConflictSection({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function ConflictChoiceRow({
  copiedLabel,
  copiedValue,
  currentLabel,
  currentValue,
  label,
  value,
  onValueChange,
}: {
  copiedLabel: string
  copiedValue: string
  currentLabel: string
  currentValue: string
  label: string
  value: ConfigConflictChoice
  onValueChange: (value: ConfigConflictChoice) => void
}) {
  return (
    <article className="rounded-lg border bg-background p-3">
      <h4 className="truncate font-mono text-xs font-semibold">{label}</h4>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-2 rounded-lg border p-3 text-sm">
          <span className="flex items-center gap-2 font-medium">
            <input
              className="size-4 accent-primary"
              type="radio"
              checked={value === "target"}
              onChange={() => onValueChange("target")}
            />
            {currentLabel}
          </span>
          <ConflictValuePreview value={currentValue} />
        </label>
        <label className="flex min-w-0 flex-col gap-2 rounded-lg border p-3 text-sm">
          <span className="flex items-center gap-2 font-medium">
            <input
              className="size-4 accent-primary"
              type="radio"
              checked={value === "source"}
              onChange={() => onValueChange("source")}
            />
            {copiedLabel}
          </span>
          <ConflictValuePreview value={copiedValue} />
        </label>
      </div>
    </article>
  )
}

function ConflictValuePreview({ value }: { value: string }) {
  return (
    <pre className="max-h-32 overflow-auto rounded-md bg-muted p-2 font-mono text-xs leading-5 break-words whitespace-pre-wrap text-muted-foreground">
      {value}
    </pre>
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

function getConfigSetCopySummaries(
  configSetNames: Array<string>,
  variables: Array<{ setName: string }>,
  templates: Array<{ setName: string }>,
  runConfigs: Array<{ setName: string }>
): Array<ConfigSetCopySummary> {
  return configSetNames.map((setName) => ({
    setName,
    variableCount: variables.filter((variable) => variable.setName === setName)
      .length,
    templateCount: templates.filter((template) => template.setName === setName)
      .length,
    hasRunConfig: runConfigs.some((runConfig) => runConfig.setName === setName),
  }))
}

function getConfigCopyConflicts({
  copyTemplates,
  copyVariables,
  sourceSetName,
  targetSetName,
  templates,
  variables,
}: {
  copyTemplates: boolean
  copyVariables: boolean
  sourceSetName: string
  targetSetName: string
  templates: Array<{
    setName: string
    filePath: string
    templateContent: string
  }>
  variables: Array<{ setName: string; name: string; value: string }>
}): ConfigCopyConflicts {
  const sourceVariables = copyVariables
    ? variables.filter((variable) => variable.setName === sourceSetName)
    : []
  const targetVariables = copyVariables
    ? variables.filter((variable) => variable.setName === targetSetName)
    : []
  const targetVariablesByName = new Map(
    targetVariables.map((variable) => [variable.name, variable])
  )
  const variableConflicts = Array.from(
    new Map(
      sourceVariables
        .map((variable) => {
          const targetVariable = targetVariablesByName.get(variable.name)

          if (!targetVariable) {
            return null
          }

          return [
            variable.name,
            {
              name: variable.name,
              sourceValue: variable.value,
              targetValue: targetVariable.value,
            },
          ] as const
        })
        .filter((conflict): conflict is readonly [string, VariableConflict] =>
          Boolean(conflict)
        )
    ).values()
  )
  const sourceTemplates = copyTemplates
    ? templates.filter((template) => template.setName === sourceSetName)
    : []
  const targetTemplates = copyTemplates
    ? templates.filter((template) => template.setName === targetSetName)
    : []
  const targetTemplatesByPath = new Map(
    targetTemplates.map((template) => [template.filePath, template])
  )
  const templateConflicts = Array.from(
    new Map(
      sourceTemplates
        .map((template) => {
          const targetTemplate = targetTemplatesByPath.get(template.filePath)

          if (!targetTemplate) {
            return null
          }

          return [
            template.filePath,
            {
              filePath: template.filePath,
              sourceContent: template.templateContent,
              targetContent: targetTemplate.templateContent,
            },
          ] as const
        })
        .filter((conflict): conflict is readonly [string, TemplateConflict] =>
          Boolean(conflict)
        )
    ).values()
  )

  return { templateConflicts, variableConflicts }
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
