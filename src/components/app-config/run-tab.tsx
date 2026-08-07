import { Dialog } from "@base-ui/react/dialog"
import { Tabs } from "@base-ui/react/tabs"
import {
  ChevronDown,
  ExternalLink,
  Eye,
  Play,
  Plus,
  RefreshCcw,
  Square,
  Trash2,
  X,
} from "lucide-react"
import * as React from "react"

import { inputClassName } from "@/components/app-config/form-styles"
import {
  getTemplateLanguage,
  highlightTemplateContent,
  renderGeneratedTemplate,
} from "@/components/app-config/template-syntax"
import type {
  AppProcessChildSnapshot,
  AppProcessSnapshot,
  AppTemplateConfig,
  AppVariableConfig,
  RunConfig,
} from "@/components/app-config/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function RunTab({
  activeConfigSet,
  isPending,
  processStatus,
  runConfig,
  templates,
  variables,
  onRestart,
  onStart,
  onStop,
  onSave,
}: {
  activeConfigSet: string
  isPending: boolean
  processStatus: AppProcessSnapshot
  runConfig: RunConfig | null
  templates: Array<AppTemplateConfig>
  variables: Array<AppVariableConfig>
  onRestart: () => void
  onStart: () => void
  onStop: () => void
  onSave: (input: {
    mode: "sequential" | "parallel"
    commands: Array<string>
  }) => void
}) {
  const appPreviewUrl =
    processStatus.status === "running"
      ? getLocalAppUrl(`${processStatus.stdout}\n${processStatus.stderr}`)
      : null
  const [previewOpen, setPreviewOpen] = React.useState(false)

  const initialCommands = React.useMemo(() => {
    const fromChildren = (runConfig?.commands ?? [])
      .map((child) => child.command)
      .filter(Boolean)
    if (fromChildren.length) {
      return fromChildren
    }
    return runConfig?.command ? [runConfig.command] : [""]
  }, [runConfig])

  const [commands, setCommands] = React.useState<Array<string>>(initialCommands)
  const [mode, setMode] = React.useState<"sequential" | "parallel">(
    runConfig?.mode === "parallel" ? "parallel" : "sequential"
  )

  const hasCommand = commands.some((command) => command.trim())

  function updateCommand(index: number, value: string) {
    setCommands((current) =>
      current.map((command, i) => (i === index ? value : command))
    )
  }

  function addCommand() {
    setCommands((current) => [...current, ""])
  }

  function removeCommand(index: number) {
    setCommands((current) =>
      current.length > 1 ? current.filter((_, i) => i !== index) : current
    )
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave({
      mode,
      commands: commands.map((command) => command.trim()).filter(Boolean),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <GeneratedFilesDialog
        open={previewOpen}
        templates={templates}
        variables={variables}
        onOpenChange={setPreviewOpen}
      />

      <form
        className="app-panel flex flex-col gap-4 rounded-lg p-4"
        onSubmit={handleSubmit}
      >
        <input type="hidden" name="setName" value={activeConfigSet} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-60 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium">Run commands</span>
              <label className="flex items-center gap-2 text-sm font-medium">
                Mode
                <Select
                  value={mode}
                  onValueChange={(value) =>
                    setMode(value === "parallel" ? "parallel" : "sequential")
                  }
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="sequential">Sequential</SelectItem>
                      <SelectItem value="parallel">Parallel</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
            </div>
            <div className="flex flex-col gap-2">
              {commands.map((command, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={command}
                    required={index === 0}
                    className={inputClassName}
                    placeholder="npm run dev"
                    onChange={(event) =>
                      updateCommand(index, event.target.value)
                    }
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    aria-label="Remove command"
                    title="Remove command"
                    disabled={commands.length <= 1}
                    onClick={() => removeCommand(index)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-fit"
                onClick={addCommand}
              >
                <Plus data-icon="inline-start" />
                Add command
              </Button>
            </div>
          </div>
          <RunLifecycleControls
            appPreviewUrl={appPreviewUrl}
            commandConfigured={hasCommand}
            isPending={isPending}
            processStatus={processStatus}
            onRestart={onRestart}
            onStart={onStart}
            onStop={onStop}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Status</span>
            <StatusPill status={processStatus.status.toLowerCase()}>
              {formatProcessStatus(processStatus)}
            </StatusPill>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              className="w-fit"
              type="button"
              variant="outline"
              disabled={!templates.length}
              onClick={() => setPreviewOpen(true)}
            >
              <Eye data-icon="inline-start" />
              Preview files
            </Button>
            <Button className="w-fit" type="submit" disabled={isPending}>
              Save run config
            </Button>
          </div>
        </div>
      </form>

      {processStatus.processes.length > 0 ? (
        <section className="app-panel flex flex-col gap-4 rounded-lg p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold">Processes</h2>
              <p className="text-sm text-muted-foreground">
                Live output for each running command.
              </p>
            </div>
          </div>
          <ProcessLogTabs processes={processStatus.processes} />
        </section>
      ) : null}
    </div>
  )
}

function GeneratedFilesDialog({
  open,
  templates,
  variables,
  onOpenChange,
}: {
  open: boolean
  templates: Array<AppTemplateConfig>
  variables: Array<AppVariableConfig>
  onOpenChange: (open: boolean) => void
}) {
  const renderedTemplates = React.useMemo(() => {
    const values = Object.fromEntries(
      variables.map((variable) => [variable.name, variable.value])
    )

    return templates.map((template) =>
      renderGeneratedTemplate(template, values)
    )
  }, [templates, variables])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" />
        <Dialog.Popup className="app-panel fixed top-1/2 left-1/2 flex max-h-[min(calc(100svh-2rem),46rem)] w-[min(calc(100vw-2rem),56rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-auto rounded-lg bg-popover p-5 text-popover-foreground outline-none">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold">
                Generated files
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Templates rendered with the current app variables.
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

          <div className="flex flex-col gap-3">
            {renderedTemplates.map((template) => (
              <GeneratedFilePreview key={template.id} template={template} />
            ))}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function GeneratedFilePreview({
  template,
}: {
  template: {
    id: number
    filePath: string
    content: string
    error: string
  }
}) {
  const language = getTemplateLanguage(template.filePath, template.content)
  const highlightedContent = template.error
    ? ""
    : highlightTemplateContent(template.content, language)

  return (
    <details className="group rounded-lg border bg-background" open>
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
        <span className="truncate">{template.filePath}</span>
        <ChevronDown className="shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      {template.error ? (
        <p className="border-t px-3 py-2 text-sm text-destructive">
          {template.error}
        </p>
      ) : (
        <pre className="code-surface max-h-96 overflow-auto border-t p-4 text-sm leading-6">
          <code
            className={`language-${language}`}
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
          />
        </pre>
      )}
    </details>
  )
}

function RunLifecycleControls({
  appPreviewUrl,
  commandConfigured,
  isPending,
  processStatus,
  onRestart,
  onStart,
  onStop,
}: {
  appPreviewUrl: string | null
  commandConfigured: boolean
  isPending: boolean
  processStatus: AppProcessSnapshot
  onRestart: () => void
  onStart: () => void
  onStop: () => void
}) {
  const isRunning = processStatus.status === "running"

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        size="icon-sm"
        aria-label="Run app"
        title="Run"
        disabled={isPending || isRunning || !commandConfigured}
        onClick={onStart}
      >
        <Play />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label="Open web preview"
        title={appPreviewUrl ? `Open ${appPreviewUrl}` : "No local web preview"}
        disabled={!appPreviewUrl}
        onClick={() => {
          if (appPreviewUrl) {
            window.open(appPreviewUrl, "_blank", "noopener,noreferrer")
          }
        }}
      >
        <ExternalLink />
      </Button>
      <Button
        type="button"
        size="icon-sm"
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
        size="icon-sm"
        variant="outline"
        aria-label="Restart app"
        title="Restart"
        disabled={isPending || !commandConfigured}
        onClick={onRestart}
      >
        <RefreshCcw />
      </Button>
    </div>
  )
}

const processTabClassName =
  "flex h-9 max-w-xs min-w-0 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm text-muted-foreground hover:bg-muted hover:text-foreground"

function ProcessLogTabs({
  processes,
}: {
  processes: Array<AppProcessChildSnapshot>
}) {
  const [activeTab, setActiveTab] = React.useState(0)

  React.useEffect(() => {
    if (activeTab >= processes.length) {
      setActiveTab(Math.max(0, processes.length - 1))
    }
  }, [activeTab, processes.length])

  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={setActiveTab}
      className="flex flex-col gap-4"
    >
      <Tabs.List className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
        {processes.map((process, index) => (
          <Tabs.Tab
            key={`${process.pid ?? "new"}-${index}`}
            value={index}
            className={processTabClassName}
          >
            <span
              className={cn(
                "font-mono text-xs font-semibold tracking-[0.12em] uppercase",
                "opacity-80"
              )}
            >
              #{index + 1}
            </span>
            <code className="truncate font-mono text-xs">{process.command}</code>
            <StatusPill
              className="shrink-0"
              status={process.status.toLowerCase()}
            >
              {process.status}
            </StatusPill>
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {processes.map((process, index) => (
        <Tabs.Panel
          key={`${process.pid ?? "new"}-${index}`}
          value={index}
          keepMounted
          className="min-w-0"
        >
          <ProcessLogPanel process={process} />
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  )
}

function ProcessLogPanel({ process }: { process: AppProcessChildSnapshot }) {
  const stdout = sanitizeRunLog(process.stdout).trim()
  const stderr = sanitizeRunLog(process.stderr).trim()
  const exitInfo = [
    process.exitCode !== null ? `exit ${process.exitCode}` : null,
    process.signal ? `signal ${process.signal}` : null,
    process.error,
  ]
    .filter(Boolean)
    .join(" - ")

  return (
    <div className="min-w-0 rounded-lg border bg-background">
      {process.pid || exitInfo ? (
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/50 px-3 py-2 text-xs">
          {process.pid ? (
            <span className="font-mono text-muted-foreground">
              PID {process.pid}
            </span>
          ) : null}
          {exitInfo ? (
            <span className="font-mono text-destructive">{exitInfo}</span>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-3 xl:grid-cols-2">
        <RunLogPanel label="stdout" value={stdout} />
        <RunLogPanel label="stderr" value={stderr} />
      </div>
    </div>
  )
}

function RunLogPanel({ label, value }: { label: string; value: string }) {
  const readableValue = sanitizeRunLog(value).trim()

  return (
    <div className="min-w-0 rounded-lg border bg-background">
      <div className="border-b bg-muted/50 px-3 py-2 font-mono text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </div>
      <pre className="code-surface max-h-[28rem] overflow-auto p-3 font-mono text-sm leading-6 break-words whitespace-pre-wrap">
        {readableValue || "No output"}
      </pre>
    </div>
  )
}

function StatusPill({
  children,
  className,
  status,
}: {
  children: React.ReactNode
  className?: string
  status: string
}) {
  return (
    <span
      className={cn("status-pill max-w-full truncate", className)}
      data-status={status}
    >
      {children}
    </span>
  )
}

/* eslint-disable no-control-regex */
const ANSI_ESCAPE_PATTERN =
  /(?:\u001B\][^\u0007]*(?:\u0007|\u001B\\))|(?:[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~])))/g

const ESCAPED_ANSI_PATTERN =
  /(?:\\u001[bB]|\\x1[bB]|\\e|\\033)\[[0-?]*[ -/]*[@-~]/g

export function sanitizeRunLog(log: string) {
  return log
    .replace(ESCAPED_ANSI_PATTERN, "")
    .replace(ANSI_ESCAPE_PATTERN, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
}
/* eslint-enable no-control-regex */

export function getLocalAppUrl(log: string) {
  const readableLog = sanitizeRunLog(log)
  const matches = Array.from(
    readableLog.matchAll(
      /https?:\/\/(?:localhost|127\.0\.0\.1):\d+(?:\/[^\s"'<>)]*)?/gi
    )
  )
  const lastMatch = matches.at(-1)?.[0]

  return lastMatch?.replace(/[.,;:!?]+$/, "") ?? null
}

function formatProcessStatus(status: { pid: number | null; status: string }) {
  if (status.status === "running" && status.pid) {
    return `Running (${status.pid})`
  }

  return status.status
}
