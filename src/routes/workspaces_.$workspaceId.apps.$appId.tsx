import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { FileCode, Play, Plus, Settings2, Trash2, Variable } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/components/workspace-dialogs"
import {
  createTemplateConfigFn,
  createVariableConfigFn,
  deleteTemplateConfigFn,
  deleteVariableConfigFn,
  getAppFn,
  updateTemplateConfigFn,
  updateVariableConfigFn,
  upsertRunConfigFn,
} from "@/db/workspace-functions"
import { cn } from "@/lib/utils"

const configTabs = ["variables", "template", "run"] as const
type ConfigTab = (typeof configTabs)[number]

export const Route = createFileRoute("/workspaces_/$workspaceId/apps/$appId")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: isConfigTab(search.tab) ? search.tab : "variables",
  }),
  loader: async ({ params }) => ({
    app: await getAppFn({
      data: { appId: params.appId },
    }),
  }),
  component: AppConfigPage,
})

function AppConfigPage() {
  const router = useRouter()
  const navigate = Route.useNavigate()
  const { workspaceId, appId } = Route.useParams()
  const { tab } = Route.useSearch()
  const { app } = Route.useLoaderData()
  const createVariableConfig = useServerFn(createVariableConfigFn)
  const updateVariableConfig = useServerFn(updateVariableConfigFn)
  const deleteVariableConfig = useServerFn(deleteVariableConfigFn)
  const createTemplateConfig = useServerFn(createTemplateConfigFn)
  const updateTemplateConfig = useServerFn(updateTemplateConfigFn)
  const deleteTemplateConfig = useServerFn(deleteTemplateConfigFn)
  const upsertRunConfig = useServerFn(upsertRunConfigFn)
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState("")

  const routeWorkspaceId = Number(workspaceId)
  const routeAppId = Number(appId)
  const selectedApp =
    app && app.workspaceId === routeWorkspaceId && app.id === routeAppId
      ? app
      : null

  if (!selectedApp) {
    return (
      <section className="flex flex-col gap-3 p-6">
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

  function invalidateAfterSave() {
    return router.invalidate()
  }

  function handleVariableSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const id = String(formData.get("id") ?? "")
    const name = String(formData.get("name") ?? "")
    const value = String(formData.get("value") ?? "")

    startTransition(async () => {
      try {
        setError("")
        if (id) {
          await updateVariableConfig({
            data: { id, appId: currentApp.id, name, value },
          })
        } else {
          await createVariableConfig({
            data: { appId: currentApp.id, name, value },
          })
          form.reset()
        }
        await invalidateAfterSave()
      } catch (saveError) {
        setError(getErrorMessage(saveError))
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

  function handleTemplateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const id = String(formData.get("id") ?? "")
    const name = String(formData.get("name") ?? "")
    const templateContent = String(formData.get("templateContent") ?? "")

    startTransition(async () => {
      try {
        setError("")
        if (id) {
          await updateTemplateConfig({
            data: { id, appId: currentApp.id, name, templateContent },
          })
        } else {
          await createTemplateConfig({
            data: { appId: currentApp.id, name, templateContent },
          })
          form.reset()
        }
        await invalidateAfterSave()
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

  return (
    <section className="flex min-h-svh flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Settings2 />
            <span>App configuration</span>
          </div>
          <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight">
            {currentApp.name}
          </h1>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {currentApp.pathLocation}
          </p>
        </div>
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

      <div className="flex flex-wrap gap-2 border-b">
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
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {tab === "variables" ? (
        <VariablesTab
          isPending={isPending}
          variables={currentApp.variableConfigs}
          onDelete={handleDeleteVariable}
          onSubmit={handleVariableSubmit}
        />
      ) : null}
      {tab === "template" ? (
        <TemplateTab
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
          onSubmit={handleRunSubmit}
        />
      ) : null}
    </section>
  )
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-10 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
}

function VariablesTab({
  isPending,
  variables,
  onDelete,
  onSubmit,
}: {
  isPending: boolean
  variables: Array<{ id: number; name: string; value: string }>
  onDelete: (id: number) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <form
        className="grid gap-3 rounded-md border bg-card p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        onSubmit={onSubmit}
      >
        <label className="flex flex-col gap-2 text-sm font-medium">
          Name
          <input
            name="name"
            required
            className={inputClassName}
            placeholder="DATABASE_URL"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Value
          <input
            name="value"
            required
            className={inputClassName}
            placeholder="postgres://..."
          />
        </label>
        <Button className="self-end" type="submit" disabled={isPending}>
          <Plus data-icon="inline-start" />
          Add variable
        </Button>
      </form>

      {variables.length ? (
        <div className="flex flex-col gap-3">
          {variables.map((variable) => (
            <form
              key={variable.id}
              className="grid gap-3 rounded-md border p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
              onSubmit={onSubmit}
            >
              <input type="hidden" name="id" value={variable.id} />
              <label className="flex flex-col gap-2 text-sm font-medium">
                Name
                <input
                  name="name"
                  required
                  defaultValue={variable.name}
                  className={inputClassName}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Value
                <input
                  name="value"
                  required
                  defaultValue={variable.value}
                  className={inputClassName}
                />
              </label>
              <Button className="self-end" type="submit" disabled={isPending}>
                Save
              </Button>
              <Button
                className="self-end"
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => onDelete(variable.id)}
              >
                <Trash2 data-icon="inline-start" />
                Delete
              </Button>
            </form>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No variables configured"
          description="Add environment variables or other key-value values for this app."
        />
      )}
    </div>
  )
}

function TemplateTab({
  isPending,
  templates,
  onDelete,
  onSubmit,
}: {
  isPending: boolean
  templates: Array<{ id: number; name: string; templateContent: string }>
  onDelete: (id: number) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-3 rounded-md border bg-card p-4"
        onSubmit={onSubmit}
      >
        <label className="flex flex-col gap-2 text-sm font-medium">
          Name
          <input
            name="name"
            required
            className={inputClassName}
            placeholder="default"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Template content
          <textarea
            name="templateContent"
            required
            className={textareaClassName}
            placeholder="npm run {{script}}"
          />
        </label>
        <Button className="w-fit" type="submit" disabled={isPending}>
          <Plus data-icon="inline-start" />
          Add template
        </Button>
      </form>

      {templates.length ? (
        <div className="flex flex-col gap-3">
          {templates.map((template) => (
            <form
              key={template.id}
              className="flex flex-col gap-3 rounded-md border p-4"
              onSubmit={onSubmit}
            >
              <input type="hidden" name="id" value={template.id} />
              <label className="flex flex-col gap-2 text-sm font-medium">
                Name
                <input
                  name="name"
                  required
                  defaultValue={template.name}
                  className={inputClassName}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Template content
                <textarea
                  name="templateContent"
                  required
                  defaultValue={template.templateContent}
                  className={textareaClassName}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isPending}>
                  Save template
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => onDelete(template.id)}
                >
                  <Trash2 data-icon="inline-start" />
                  Delete
                </Button>
              </div>
            </form>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No templates configured"
          description="Add reusable command or file templates for this app."
        />
      )}
    </div>
  )
}

function RunTab({
  command,
  isPending,
  onSubmit,
}: {
  command: string
  isPending: boolean
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form
      className="flex flex-col gap-4 rounded-md border bg-card p-4"
      onSubmit={onSubmit}
    >
      <label className="flex flex-col gap-2 text-sm font-medium">
        Run command
        <input
          name="command"
          required
          defaultValue={command}
          className={inputClassName}
          placeholder="npm run dev"
        />
      </label>
      <Button className="w-fit" type="submit" disabled={isPending}>
        Save run config
      </Button>
    </form>
  )
}

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-md border border-dashed p-6 text-center">
      <h2 className="text-base font-medium">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function isConfigTab(value: unknown): value is ConfigTab {
  return configTabs.includes(value as ConfigTab)
}

const inputClassName =
  "h-9 rounded-md border border-input bg-background px-3 text-sm font-normal outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const textareaClassName =
  "min-h-32 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm font-normal outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
