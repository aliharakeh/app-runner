import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { FileCode, Pencil, Play, Settings2, Variable } from "lucide-react"
import * as React from "react"

import { RunTab } from "@/components/app-config/run-tab"
import { TabButton } from "@/components/app-config/tab-button"
import { TemplateTab } from "@/components/app-config/template-tab"
import { VariablesTab } from "@/components/app-config/variables-tab"
import { Button } from "@/components/ui/button"
import { EditAppDialog, getErrorMessage } from "@/components/workspace-dialogs"
import {
  createTemplateConfigFn,
  createVariableConfigFn,
  deleteTemplateConfigFn,
  deleteVariableConfigFn,
  deleteVariableSetFn,
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
  const createVariableConfig = useServerFn(createVariableConfigFn)
  const updateVariableConfig = useServerFn(updateVariableConfigFn)
  const deleteVariableConfig = useServerFn(deleteVariableConfigFn)
  const deleteVariableSet = useServerFn(deleteVariableSetFn)
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
  const activeVariableSet = currentApp.activeVariableSet || "default"
  const variableSetNames = getVariableSetNames(
    currentApp.variableConfigs,
    activeVariableSet
  )
  const activeVariables = getVariablesForSet(
    currentApp.variableConfigs,
    activeVariableSet
  )

  function invalidateAfterSave() {
    return router.invalidate()
  }

  function handleVariableSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const id = String(formData.get("id") ?? "")
    const setName = String(formData.get("setName") ?? activeVariableSet)
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
    const nextVariableSet = String(formData.get("setName") ?? "")

    startTransition(async () => {
      try {
        setError("")
        await updateApp({
          data: {
            appId: currentApp.id,
            name: currentApp.name,
            pathLocation: currentApp.pathLocation,
            activeVariableSet: nextVariableSet,
          },
        })
        setNewVariableSetOpen(false)
        await invalidateAfterSave()
      } catch (saveError) {
        setError(getErrorMessage(saveError))
      }
    })
  }

  function handleActiveVariableSetChange(nextVariableSet: string) {
    startTransition(async () => {
      try {
        setError("")
        await updateApp({
          data: {
            appId: currentApp.id,
            name: currentApp.name,
            pathLocation: currentApp.pathLocation,
            activeVariableSet: nextVariableSet,
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
        await deleteVariableSet({
          data: { appId: currentApp.id, setName: activeVariableSet },
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
    const filePath = String(formData.get("filePath") ?? "")
    const templateContent = String(formData.get("templateContent") ?? "")

    startTransition(async () => {
      try {
        setError("")
        if (id) {
          await updateTemplateConfig({
            data: { id, appId: currentApp.id, filePath, templateContent },
          })
        } else {
          await createTemplateConfig({
            data: { appId: currentApp.id, filePath, templateContent },
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
    const command = String(formData.get("command") ?? "")

    startTransition(async () => {
      try {
        setError("")
        await upsertRunConfig({
          data: { appId: currentApp.id, command },
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
          activeVariableSet={activeVariableSet}
          deleteVariableSetOpen={deleteVariableSetOpen}
          newVariableSetOpen={newVariableSetOpen}
          variableSetNames={variableSetNames}
          variables={activeVariables}
          onDelete={handleDeleteVariable}
          onDeleteSet={handleDeleteVariableSet}
          onDeleteSetOpenChange={setDeleteVariableSetOpen}
          onNewSetOpenChange={setNewVariableSetOpen}
          onNewSetSubmit={handleVariableSetSubmit}
          onSetChange={handleActiveVariableSetChange}
          onSubmit={handleVariableSubmit}
        />
      ) : null}
      {tab === "template" ? (
        <TemplateTab
          appFiles={appFiles}
          isPending={isPending}
          templates={currentApp.templateConfigs}
          onDelete={handleDeleteTemplate}
          onSubmit={handleTemplateSubmit}
        />
      ) : null}
      {tab === "run" ? (
        <RunTab
          command={currentApp.runConfig?.command ?? ""}
          isPending={isPending}
          processStatus={processStatus}
          runConfig={currentApp.runConfig}
          templates={currentApp.templateConfigs}
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

function getVariableSetNames(
  variables: Array<{ setName: string }>,
  activeSet = "default"
) {
  return Array.from(
    new Set([
      activeSet,
      "default",
      ...variables.map((variable) => variable.setName),
    ])
  ).sort()
}

function getVariablesForSet<
  TVariable extends { setName: string; name: string; value: string },
>(variables: Array<TVariable>, setName: string) {
  return variables.filter((variable) => variable.setName === setName)
}
