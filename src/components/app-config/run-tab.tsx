import { Dialog } from "@base-ui/react/dialog"
import {
  ChevronDown,
  ExternalLink,
  Eye,
  Play,
  RefreshCcw,
  Square,
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
  AppProcessSnapshot,
  AppTemplateConfig,
  AppVariableConfig,
  RunConfigLastRun,
} from "@/components/app-config/types"
import { Button } from "@/components/ui/button"

export function RunTab({
  command,
  isPending,
  processStatus,
  runConfig,
  templates,
  variables,
  onRestart,
  onStart,
  onStop,
  onSubmit,
}: {
  command: string
  isPending: boolean
  processStatus: AppProcessSnapshot
  runConfig: RunConfigLastRun | null
  templates: Array<AppTemplateConfig>
  variables: Array<AppVariableConfig>
  onRestart: () => void
  onStart: () => void
  onStop: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  const lastRunConfig = runConfig?.lastRunStartedAt ? runConfig : null
  const appPreviewUrl = lastRunConfig
    ? getLocalAppUrl(
        `${lastRunConfig.lastRunStdout}\n${lastRunConfig.lastRunStderr}`
      )
    : null
  const [previewOpen, setPreviewOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-4">
      <GeneratedFilesDialog
        open={previewOpen}
        templates={templates}
        variables={variables}
        onOpenChange={setPreviewOpen}
      />

      <form
        className="flex flex-col gap-4 rounded-md border bg-card p-4"
        onSubmit={onSubmit}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <label className="flex min-w-60 flex-1 flex-col gap-2 text-sm font-medium">
            Run command
            <input
              name="command"
              required
              defaultValue={command}
              className={inputClassName}
              placeholder="npm run dev"
            />
          </label>
          <RunLifecycleControls
            appPreviewUrl={appPreviewUrl}
            commandConfigured={Boolean(command)}
            isPending={isPending}
            processStatus={processStatus}
            onRestart={onRestart}
            onStart={onStart}
            onStop={onStop}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Status: {formatProcessStatus(processStatus)}
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

      <section className="flex flex-col gap-4 rounded-md border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Last run log</h2>
            <p className="text-sm text-muted-foreground">
              {lastRunConfig
                ? formatRunSummary(lastRunConfig)
                : "No run has been recorded yet."}
            </p>
          </div>
          {lastRunConfig ? (
            <div className="grid gap-1 text-right text-xs text-muted-foreground">
              <span>
                Started {formatDateTime(lastRunConfig.lastRunStartedAt)}
              </span>
              <span>
                Stopped {formatDateTime(lastRunConfig.lastRunStoppedAt)}
              </span>
            </div>
          ) : null}
        </div>

        {lastRunConfig ? (
          <div className="grid gap-3 xl:grid-cols-2">
            <RunLogPanel label="stdout" value={lastRunConfig.lastRunStdout} />
            <RunLogPanel label="stderr" value={lastRunConfig.lastRunStderr} />
          </div>
        ) : null}
      </section>
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
        <Dialog.Backdrop className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 flex max-h-[min(calc(100svh-2rem),46rem)] w-[min(calc(100vw-2rem),56rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-auto rounded-md border bg-popover p-5 text-popover-foreground shadow-lg outline-none">
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
    <details className="group rounded-md border" open>
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
        <span className="truncate">{template.filePath}</span>
        <ChevronDown className="shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      {template.error ? (
        <p className="border-t px-3 py-2 text-sm text-destructive">
          {template.error}
        </p>
      ) : (
        <pre className="max-h-96 overflow-auto border-t bg-[#2d2d2d] p-4 text-sm leading-6">
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

function RunLogPanel({ label, value }: { label: string; value: string }) {
  const readableValue = sanitizeRunLog(value).trim()

  return (
    <div className="min-w-0 rounded-md border bg-muted/30">
      <div className="border-b px-3 py-2 text-sm font-medium text-muted-foreground">
        {label}
      </div>
      <pre className="max-h-[28rem] overflow-auto p-3 font-mono text-sm leading-6 break-words whitespace-pre-wrap">
        {readableValue || "No output"}
      </pre>
    </div>
  )
}

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

function formatRunSummary(runConfig: RunConfigLastRun) {
  const parts = [
    runConfig.lastRunStatus ?? "unknown",
    runConfig.lastRunPid ? `PID ${runConfig.lastRunPid}` : null,
    runConfig.lastRunExitCode !== null
      ? `exit ${runConfig.lastRunExitCode}`
      : null,
    runConfig.lastRunSignal ? `signal ${runConfig.lastRunSignal}` : null,
    runConfig.lastRunError,
  ].filter(Boolean)

  return parts.join(" - ")
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "not recorded"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value))
}

function formatProcessStatus(status: { pid: number | null; status: string }) {
  if (status.status === "running" && status.pid) {
    return `Running (${status.pid})`
  }

  return status.status
}
