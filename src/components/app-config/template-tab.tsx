import { Dialog } from "@base-ui/react/dialog"
import {
  ChevronDown,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import * as React from "react"

import { EmptyState } from "@/components/app-config/empty-state"
import { reorderItemsById } from "@/components/app-config/reorder"
import {
  getTemplateLanguage,
  highlightTemplateContent,
} from "@/components/app-config/template-syntax"
import type { AppTemplateConfig } from "@/components/app-config/types"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { cn } from "@/lib/utils"

export function TemplateTab({
  activeConfigSet,
  appFiles,
  isPending,
  templates,
  onDelete,
  onReorder,
  onSubmit,
}: {
  activeConfigSet: string
  appFiles: Array<string>
  isPending: boolean
  templates: Array<AppTemplateConfig>
  onDelete: (id: number) => void
  onReorder: (orderedIds: Array<number>) => void
  onSubmit: (
    event: React.FormEvent<HTMLFormElement>,
    onSaved?: () => void
  ) => void
}) {
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingTemplate, setEditingTemplate] =
    React.useState<AppTemplateConfig | null>(null)
  const [orderedTemplates, setOrderedTemplates] = React.useState(templates)
  const [draggedTemplateId, setDraggedTemplateId] = React.useState<
    number | null
  >(null)

  React.useEffect(() => {
    setOrderedTemplates(templates)
  }, [templates])

  function handleDrop(targetId: number) {
    if (draggedTemplateId === null) {
      return
    }

    const nextTemplates = reorderItemsById(
      orderedTemplates,
      draggedTemplateId,
      targetId
    )

    setDraggedTemplateId(null)

    if (nextTemplates === orderedTemplates) {
      return
    }

    setOrderedTemplates(nextTemplates)
    onReorder(nextTemplates.map((template) => template.id))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="app-panel flex items-center justify-between gap-3 rounded-lg p-4">
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
        activeConfigSet={activeConfigSet}
        appFiles={appFiles}
        isPending={isPending}
        mode="create"
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={onSubmit}
      />

      {editingTemplate ? (
        <TemplateDialog
          key={editingTemplate.id}
          activeConfigSet={activeConfigSet}
          isPending={isPending}
          appFiles={appFiles}
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
          {orderedTemplates.map((template) => (
            <article
              key={template.id}
              className={cn(
                "app-panel flex flex-col gap-3 rounded-lg p-4",
                draggedTemplateId === template.id && "opacity-60"
              )}
              onDragOver={(event) => {
                if (draggedTemplateId !== null) {
                  event.preventDefault()
                }
              }}
              onDrop={(event) => {
                event.preventDefault()
                handleDrop(template.id)
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <Button
                    className="cursor-grab active:cursor-grabbing"
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    draggable
                    disabled={isPending}
                    aria-label={`Drag ${template.filePath}`}
                    title="Drag to reorder"
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move"
                      event.dataTransfer.setData(
                        "text/plain",
                        String(template.id)
                      )
                      setDraggedTemplateId(template.id)
                    }}
                    onDragEnd={() => setDraggedTemplateId(null)}
                  >
                    <GripVertical />
                  </Button>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">
                      {template.filePath}
                    </h3>
                  </div>
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
                filePath={template.filePath}
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
  activeConfigSet,
  appFiles,
  isPending,
  mode,
  open,
  template,
  onOpenChange,
  onSubmit,
}: {
  activeConfigSet: string
  appFiles: Array<string>
  isPending: boolean
  mode: "create" | "edit"
  open: boolean
  template?: AppTemplateConfig
  onOpenChange: (open: boolean) => void
  onSubmit: (
    event: React.FormEvent<HTMLFormElement>,
    onSaved?: () => void
  ) => void
}) {
  const [filePath, setFilePath] = React.useState(template?.filePath ?? "")
  const [content, setContent] = React.useState(template?.templateContent ?? "")
  const title = mode === "create" ? "Add template" : "Edit template"
  const language = getTemplateLanguage(filePath, content)
  const filePathItems = Array.from(
    new Set(
      [template?.filePath, ...appFiles].filter(
        (candidate): candidate is string => Boolean(candidate)
      )
    )
  )
  const normalizedFilePathQuery = filePath.trim().toLowerCase()
  const filteredFilePathItems = normalizedFilePathQuery
    ? filePathItems.filter((file) =>
        file.toLowerCase().includes(normalizedFilePathQuery)
      )
    : filePathItems

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" />
        <Dialog.Popup className="app-panel fixed top-1/2 left-1/2 flex max-h-[min(calc(100svh-2rem),46rem)] w-[min(calc(100vw-2rem),48rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-auto rounded-lg bg-popover p-5 text-popover-foreground outline-none">
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
            <input type="hidden" name="setName" value={activeConfigSet} />
            <label className="flex flex-col gap-2 text-sm font-medium">
              Replaced file path
              <input type="hidden" name="filePath" value={filePath} />
              <Combobox
                items={filePathItems}
                required
                inputValue={filePath}
                value={filePath || null}
                onInputValueChange={setFilePath}
                onValueChange={(value) => {
                  setFilePath(value ?? "")
                }}
              >
                <ComboboxInput
                  autoFocus
                  required
                  showClear
                  className="h-9 w-full bg-background shadow-inner shadow-muted/40"
                  placeholder="Search or type a file path"
                />
                <ComboboxContent>
                  <ComboboxList>
                    {filteredFilePathItems.length ? (
                      filteredFilePathItems.map((file) => (
                        <ComboboxItem key={file} value={file}>
                          <span className="truncate font-mono text-xs">
                            {file}
                          </span>
                        </ComboboxItem>
                      ))
                    ) : (
                      <ComboboxEmpty className="flex">
                        No matching files.
                      </ComboboxEmpty>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
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
  filePath,
  content,
}: {
  filePath: string
  content: string
}) {
  const language = getTemplateLanguage(filePath, content)
  const highlightedContent = highlightTemplateContent(content, language)

  return (
    <details className="group rounded-lg border bg-background">
      <summary className="flex h-10 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-medium transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
        Template content
        <ChevronDown className="transition-transform group-open:rotate-180" />
      </summary>
      <pre className="code-surface max-h-96 overflow-auto border-t p-4 text-sm leading-6">
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
      <div className="code-surface relative min-h-72 rounded-lg border">
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
