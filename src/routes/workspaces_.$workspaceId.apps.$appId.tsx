import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { Dialog } from "@base-ui/react/dialog"
import {
  ChevronDown,
  FileCode,
  Pencil,
  Play,
  Plus,
  Settings2,
  Trash2,
  Variable,
  X,
} from "lucide-react"
import Prism from "prismjs"
import * as React from "react"
import "prismjs/themes/prism-tomorrow.css"

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

;(globalThis as typeof globalThis & { Prism?: typeof Prism }).Prism = Prism
await import("prismjs/components/prism-bash")
await import("prismjs/components/prism-json")
await import("prismjs/components/prism-yaml")
await import("prismjs/components/prism-jsx")
await import("prismjs/components/prism-typescript")
await import("prismjs/components/prism-tsx")

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

  function handleTemplateSubmit(
    event: React.FormEvent<HTMLFormElement>,
    onSaved?: () => void
  ) {
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
  onSubmit: (
    event: React.FormEvent<HTMLFormElement>,
    onSaved?: () => void
  ) => void
}) {
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingTemplate, setEditingTemplate] = React.useState<{
    id: number
    name: string
    templateContent: string
  } | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Templates</h2>
          <p className="text-sm text-muted-foreground">
            Reusable commands and file templates for this app.
          </p>
        </div>
        <Button
          className="shrink-0"
          type="button"
          disabled={isPending}
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus data-icon="inline-start" />
          Add template
        </Button>
      </div>

      <TemplateDialog
        isPending={isPending}
        mode="create"
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={onSubmit}
      />

      {editingTemplate ? (
        <TemplateDialog
          key={editingTemplate.id}
          isPending={isPending}
          mode="edit"
          open
          template={editingTemplate}
          onOpenChange={(open) => {
            if (!open) {
              setEditingTemplate(null)
            }
          }}
          onSubmit={onSubmit}
        />
      ) : null}

      {templates.length ? (
        <div className="flex flex-col gap-3">
          {templates.map((template) => (
            <article
              key={template.id}
              className="flex flex-col gap-3 rounded-md border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">
                    {template.name}
                  </h3>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => setEditingTemplate(template)}
                  >
                    <Pencil data-icon="inline-start" />
                    Edit
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
              </div>
              <TemplateContentPreview
                name={template.name}
                content={template.templateContent}
              />
            </article>
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

function TemplateDialog({
  isPending,
  mode,
  open,
  template,
  onOpenChange,
  onSubmit,
}: {
  isPending: boolean
  mode: "create" | "edit"
  open: boolean
  template?: { id: number; name: string; templateContent: string }
  onOpenChange: (open: boolean) => void
  onSubmit: (
    event: React.FormEvent<HTMLFormElement>,
    onSaved?: () => void
  ) => void
}) {
  const [name, setName] = React.useState(template?.name ?? "")
  const [content, setContent] = React.useState(template?.templateContent ?? "")
  const title = mode === "create" ? "Add template" : "Edit template"
  const language = getTemplateLanguage(name, content)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 flex max-h-[min(calc(100svh-2rem),46rem)] w-[min(calc(100vw-2rem),48rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-auto rounded-md border bg-popover p-5 text-popover-foreground shadow-lg outline-none">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Edit the template content in the highlighted code surface.
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

          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => onSubmit(event, () => onOpenChange(false))}
          >
            {template ? (
              <input type="hidden" name="id" value={template.id} />
            ) : null}
            <label className="flex flex-col gap-2 text-sm font-medium">
              Name
              <input
                autoFocus
                name="name"
                required
                value={name}
                className={inputClassName}
                placeholder="default"
                onChange={(event) => setName(event.currentTarget.value)}
              />
            </label>
            <TemplateCodeEditor
              content={content}
              language={language}
              onContentChange={setContent}
            />
            <div className="flex justify-end gap-2">
              <Dialog.Close
                className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
                type="button"
              >
                Cancel
              </Dialog.Close>
              <Button type="submit" disabled={isPending}>
                {mode === "create" ? "Create template" : "Save template"}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function TemplateContentPreview({
  name,
  content,
}: {
  name: string
  content: string
}) {
  const language = getTemplateLanguage(name, content)
  const highlightedContent = highlightTemplateContent(content, language)

  return (
    <details className="group rounded-md border">
      <summary className="flex h-10 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-medium transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
        Template content
        <ChevronDown className="transition-transform group-open:rotate-180" />
      </summary>
      <pre className="max-h-96 overflow-auto border-t bg-[#2d2d2d] p-4 text-sm leading-6">
        <code
          className={`language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlightedContent }}
        />
      </pre>
    </details>
  )
}

function TemplateCodeEditor({
  content,
  language,
  onContentChange,
}: {
  content: string
  language: string
  onContentChange: (content: string) => void
}) {
  const previewRef = React.useRef<HTMLPreElement>(null)
  const highlightedContent = highlightTemplateContent(`${content}\n`, language)

  function handleScroll(event: React.UIEvent<HTMLTextAreaElement>) {
    const preview = previewRef.current
    if (!preview) {
      return
    }

    preview.scrollTop = event.currentTarget.scrollTop
    preview.scrollLeft = event.currentTarget.scrollLeft
  }

  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      Template content
      <div className="relative min-h-72 rounded-md border bg-[#2d2d2d]">
        <pre
          ref={previewRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-auto p-4 font-mono text-sm leading-6"
        >
          <code
            className={`language-${language}`}
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
          />
        </pre>
        <textarea
          aria-label="Template content"
          className="absolute inset-0 resize-none overflow-auto bg-transparent p-4 font-mono text-sm leading-6 text-transparent caret-white outline-none"
          name="templateContent"
          required
          spellCheck={false}
          value={content}
          onChange={(event) => onContentChange(event.currentTarget.value)}
          onScroll={handleScroll}
        />
      </div>
    </label>
  )
}

function highlightTemplateContent(content: string, language: string) {
  const grammar = Prism.languages[language] ?? Prism.languages.markup
  return Prism.highlight(content, grammar, language)
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

function getTemplateLanguage(name: string, content: string) {
  const normalizedName = name.toLowerCase()
  const trimmedContent = content.trimStart()

  if (normalizedName.endsWith(".tsx")) {
    return "tsx"
  }

  if (normalizedName.endsWith(".ts")) {
    return "typescript"
  }

  if (normalizedName.endsWith(".jsx")) {
    return "jsx"
  }

  if (normalizedName.endsWith(".js")) {
    return "javascript"
  }

  if (
    normalizedName.endsWith(".json") ||
    (trimmedContent.startsWith("{") && trimmedContent.endsWith("}")) ||
    (trimmedContent.startsWith("[") && trimmedContent.endsWith("]"))
  ) {
    return "json"
  }

  if (normalizedName.endsWith(".yaml") || normalizedName.endsWith(".yml")) {
    return "yaml"
  }

  if (normalizedName.endsWith(".css")) {
    return "css"
  }

  if (
    normalizedName.endsWith(".html") ||
    normalizedName.endsWith(".xml") ||
    trimmedContent.startsWith("<")
  ) {
    return "markup"
  }

  return "bash"
}

const inputClassName =
  "h-9 rounded-md border border-input bg-background px-3 text-sm font-normal outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
