import { Link } from "@tanstack/react-router"
import {
  Activity,
  CircleAlert,
  Clock,
  ExternalLink,
  FolderOpen,
  Hash,
  Pencil,
  Play,
  RefreshCcw,
  Server,
  Square,
  Terminal,
  Trash2,
} from "lucide-react"
import type * as React from "react"

import { getLocalAppUrl } from "@/components/app-config/run-tab"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  AppProcessStatus,
  WorkspaceOverviewApp,
} from "@/components/workspace-overview/types"
import { cn } from "@/lib/utils"

export function WorkspaceAppsGrid({
  apps,
  isPending,
  processStatuses,
  workspaceId,
  onActiveVariableSetChange,
  onDeleteApp,
  onEditApp,
  onProcessAction,
}: {
  apps: Array<WorkspaceOverviewApp>
  isPending: boolean
  processStatuses: Record<number, AppProcessStatus>
  workspaceId: number
  onActiveVariableSetChange: (
    app: WorkspaceOverviewApp,
    activeVariableSet: string
  ) => void
  onDeleteApp: (app: WorkspaceOverviewApp) => void
  onEditApp: (app: WorkspaceOverviewApp) => void
  onProcessAction: (action: "start" | "stop" | "restart", appId: number) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {apps.map((app) => (
        <WorkspaceAppCard
          key={app.id}
          app={app}
          isPending={isPending}
          processStatus={processStatuses[app.id]}
          workspaceId={workspaceId}
          onActiveVariableSetChange={(activeVariableSet) =>
            onActiveVariableSetChange(app, activeVariableSet)
          }
          onDelete={() => onDeleteApp(app)}
          onEdit={() => onEditApp(app)}
          onRestart={() => onProcessAction("restart", app.id)}
          onStart={() => onProcessAction("start", app.id)}
          onStop={() => onProcessAction("stop", app.id)}
        />
      ))}
    </div>
  )
}

function WorkspaceAppCard({
  app,
  isPending,
  processStatus,
  workspaceId,
  onDelete,
  onEdit,
  onActiveVariableSetChange,
  onRestart,
  onStart,
  onStop,
}: {
  app: WorkspaceOverviewApp
  isPending: boolean
  processStatus: AppProcessStatus
  workspaceId: number
  onDelete: () => void
  onEdit: () => void
  onActiveVariableSetChange: (activeVariableSet: string) => void
  onRestart: () => void
  onStart: () => void
  onStop: () => void
}) {
  const appParams = {
    workspaceId: String(workspaceId),
    appId: String(app.id),
  }
  const activeVariableSet = app.activeVariableSet || "default"
  const variableSetNames = getVariableSetNames(
    app.configSets,
    app.variableConfigs,
    app.templateConfigs,
    app.runConfigs,
    activeVariableSet
  )
  const activeRunConfig =
    app.runConfigs.find(
      (runConfig) => runConfig.setName === activeVariableSet
    ) ?? null
  const detectedPreviewUrl = getLocalAppUrl(
    `${processStatus.stdout}\n${processStatus.stderr}`
  )
  const processState = processStatus.status.toLowerCase()
  const isRunning = processState === "running"
  const appPreviewUrl = isRunning ? detectedPreviewUrl : null
  const uptimeLabel = formatUptime(processStatus.startedAt)
  const exitLabel = formatExitInfo(processStatus)
  const errorLabel = formatErrorInfo(processStatus)

  return (
    <article className="app-panel flex min-h-48 flex-col gap-4 rounded-lg p-4 text-card-foreground transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <Link
          to="/workspaces/$workspaceId/apps/$appId"
          params={appParams}
          search={{ tab: "variables" }}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-md transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <FolderOpen />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-medium">{app.name}</h2>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
              {app.pathLocation}
            </p>
          </div>
        </Link>
        <AppLifecycleControls
          appPreviewUrl={appPreviewUrl}
          commandConfigured={Boolean(activeRunConfig?.command)}
          isPending={isPending}
          processStatus={processStatus}
          onDelete={onDelete}
          onEdit={onEdit}
          onRestart={onRestart}
          onStart={onStart}
          onStop={onStop}
        />
      </div>

      <Link
        to="/workspaces/$workspaceId/apps/$appId"
        params={appParams}
        search={{ tab: "variables" }}
        className="flex flex-1 flex-col rounded-lg bg-muted/55 p-3 transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <dl className="grid gap-3 text-sm">
          <ConfigStat
            icon={<Server />}
            label="Config set"
            value={activeVariableSet}
          />
          <ConfigStat
            icon={<Activity />}
            label="Status"
            value={
              <StatusPill status={processState}>
                {formatProcessStatus(processStatus)}
              </StatusPill>
            }
          />
          {isRunning && processStatus.pid ? (
            <>
              <ConfigStat
                icon={<Hash />}
                label="PID"
                value={String(processStatus.pid)}
              />
              {uptimeLabel && (
                <ConfigStat
                  icon={<Clock />}
                  label="Uptime"
                  value={uptimeLabel}
                />
              )}
            </>
          ) : (
            exitLabel && (
              <ConfigStat
                icon={<Terminal />}
                label="Last run"
                value={exitLabel}
              />
            )
          )}
          {errorLabel && (
            <ConfigStat
              icon={<CircleAlert />}
              label="Last error"
              value={
                <span className="text-destructive" title={errorLabel.full}>
                  {errorLabel.short}
                </span>
              }
            />
          )}
        </dl>
      </Link>
      <ActiveVariableSetControl
        activeVariableSet={activeVariableSet}
        disabled={isPending}
        variableSetNames={variableSetNames}
        onChange={onActiveVariableSetChange}
      />
    </article>
  )
}

function AppLifecycleControls({
  appPreviewUrl,
  commandConfigured,
  isPending,
  processStatus,
  onEdit,
  onDelete,
  onRestart,
  onStart,
  onStop,
}: {
  appPreviewUrl: string | null
  commandConfigured: boolean
  isPending: boolean
  processStatus: AppProcessStatus
  onEdit: () => void
  onDelete: () => void
  onRestart: () => void
  onStart: () => void
  onStop: () => void
}) {
  const state = processStatus.status.toLowerCase()
  const isRunning = state === "running"
  const isFailed = state === "failed" || state === "error" || state === "exited"
  const canStart = !isPending && !isRunning && commandConfigured
  const canStop = !isPending && isRunning
  const canRestart = !isPending && commandConfigured
  const canModify = !isPending && !isRunning

  const runTitle = isRunning
    ? "Already running"
    : !commandConfigured
      ? "No run command configured"
      : isPending
        ? "Working…"
        : "Run app"
  const stopTitle = isRunning ? "Stop app" : "Not running"
  const restartTitle = !commandConfigured
    ? "No run command configured"
    : isRunning
      ? "Restart app"
      : "Start app"
  const editTitle = isRunning ? "Stop the app to edit" : "Edit app"
  const deleteTitle = isRunning ? "Stop the app to delete" : "Delete app"

  return (
    <div className="flex shrink-0 items-center gap-1">
      <span
        role="status"
        aria-label={`Process status: ${state}`}
        title={`Status: ${state}`}
        className={cn(
          "mr-0.5 size-2 shrink-0 rounded-full",
          isRunning && "animate-pulse bg-emerald-500",
          isFailed && "bg-destructive",
          !isRunning && !isFailed && "bg-muted-foreground/40"
        )}
      />
      <Button
        type="button"
        size="icon-xs"
        variant="outline"
        aria-label="Run app"
        title={runTitle}
        disabled={!canStart}
        className={cn(
          canStart &&
            "border-transparent bg-emerald-600 text-white hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        )}
        onClick={onStart}
      >
        <Play />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        variant="outline"
        aria-label="Open web preview"
        title={appPreviewUrl ? `Open ${appPreviewUrl}` : "No local web preview"}
        disabled={!appPreviewUrl}
        className={cn(
          appPreviewUrl &&
            "border-transparent bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
        )}
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
        size="icon-xs"
        variant="outline"
        aria-label="Stop app"
        title={stopTitle}
        disabled={!canStop}
        className={cn(
          "border-transparent bg-red-600/10 text-white hover:bg-red-600/20 dark:bg-red-500/10 dark:hover:bg-red-500/20",
          canStop &&
            "bg-red-600 text-white hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-400"
        )}
        onClick={onStop}
      >
        <Square />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        variant="outline"
        aria-label="Restart app"
        title={restartTitle}
        disabled={!canRestart}
        className={cn(
          canRestart &&
            isRunning &&
            "border-transparent bg-amber-500 text-white hover:bg-amber-400 dark:bg-amber-500 dark:hover:bg-amber-400"
        )}
        onClick={onRestart}
      >
        <RefreshCcw />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        variant="outline"
        aria-label="Edit app"
        title={editTitle}
        disabled={!canModify}
        onClick={onEdit}
      >
        <Pencil />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        variant="destructive"
        aria-label="Delete app"
        title={deleteTitle}
        disabled={!canModify}
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </div>
  )
}

function ActiveVariableSetControl({
  activeVariableSet,
  disabled,
  variableSetNames,
  onChange,
}: {
  activeVariableSet: string
  disabled: boolean
  variableSetNames: Array<string>
  onChange: (activeVariableSet: string) => void
}) {
  const variableSetItems = variableSetNames.map((setName) => ({
    label: setName,
    value: setName,
  }))

  if (variableSetNames.length === 1) {
    return (
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="shrink-0 text-muted-foreground">Config set</span>
        <span className="min-w-0 flex-1 truncate rounded-lg border border-input bg-background px-2 py-1.5 font-mono text-xs font-semibold">
          {activeVariableSet}
        </span>
      </div>
    )
  }

  return (
    <label className="flex min-w-0 items-center gap-2 text-sm">
      <span className="shrink-0 text-muted-foreground">Config set</span>
      <Select
        items={variableSetItems}
        value={activeVariableSet}
        disabled={disabled}
        onValueChange={(value) => {
          if (value) {
            onChange(value)
          }
        }}
      >
        <SelectTrigger
          className="h-8 min-w-0 flex-1 bg-background px-2 font-mono text-xs font-semibold"
          size="sm"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} align="start">
          <SelectGroup>
            {variableSetItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </label>
  )
}

function ConfigStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-background text-primary [&_svg]:size-3.5">
        {icon}
      </div>
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-right font-medium">
        {value}
      </dd>
    </div>
  )
}

function StatusPill({
  children,
  status,
}: {
  children: React.ReactNode
  status: string
}) {
  return (
    <span className="status-pill max-w-full truncate" data-status={status}>
      {children}
    </span>
  )
}

function formatProcessStatus(status: { pid: number | null; status: string }) {
  if (status.status === "running" && status.pid) {
    return `Running (${status.pid})`
  }

  return status.status
}

function formatUptime(startedAt: string | null): string | null {
  if (!startedAt) {
    return null
  }
  const start = new Date(startedAt).getTime()
  if (Number.isNaN(start)) {
    return null
  }
  const elapsed = Date.now() - start
  if (elapsed < 0) {
    return null
  }
  const seconds = Math.floor(elapsed / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

function formatExitInfo(status: {
  status: string
  exitCode: number | null
  signal: string | null
  stoppedAt: string | null
  error: string | null
}): string | null {
  if (status.status === "running" || status.status === "stopped") {
    return null
  }
  const parts: Array<string> = []
  if (status.exitCode !== null) {
    parts.push(`exit ${status.exitCode}`)
  }
  if (status.signal) {
    parts.push(`signal ${status.signal}`)
  }
  if (status.error) {
    parts.push(status.error)
  }
  return parts.length > 0 ? parts.join(" · ") : null
}

function formatErrorInfo(status: {
  status: string
  stderr: string
  error: string | null
}): { short: string; full: string } | null {
  if (status.status !== "error" && status.status !== "failed") {
    return null
  }

  const lines = status.stderr
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  const full =
    lines.length > 0 ? lines.slice(-5).join("\n") : (status.error ?? null)

  if (!full) {
    return null
  }

  const short = lines.at(-1) ?? status.error ?? full
  return { short, full }
}

function getVariableSetNames(
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
