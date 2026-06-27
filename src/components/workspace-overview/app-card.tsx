import { Link } from "@tanstack/react-router"
import {
  Activity,
  ExternalLink,
  FileCode,
  FolderOpen,
  Pencil,
  Play,
  RefreshCcw,
  Square,
  Trash2,
  Variable,
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
    app.variableConfigs,
    activeVariableSet
  )
  const activeVariableCount = app.variableConfigs.filter(
    (variable) => variable.setName === activeVariableSet
  ).length
  const appPreviewUrl = getLocalAppUrl(
    `${processStatus.stdout}\n${processStatus.stderr}`
  )
  const processState = processStatus.status.toLowerCase()

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
          commandConfigured={Boolean(app.runConfig?.command)}
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
            icon={<Variable />}
            label="Active variables"
            value={String(activeVariableCount)}
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
          <ConfigStat
            icon={<Activity />}
            label="Status"
            value={
              <StatusPill status={processState}>
                {formatProcessStatus(processStatus)}
              </StatusPill>
            }
          />
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
  const isRunning = processStatus.status === "running"

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        size="icon-xs"
        aria-label="Run app"
        title="Run"
        disabled={isPending || isRunning || !commandConfigured}
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
        title="Stop"
        disabled={isPending || !isRunning}
        onClick={onStop}
      >
        <Square />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        variant="outline"
        aria-label="Restart app"
        title="Restart"
        disabled={isPending || !commandConfigured}
        onClick={onRestart}
      >
        <RefreshCcw />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        variant="outline"
        aria-label="Edit app"
        title="Edit"
        disabled={isPending || isRunning}
        onClick={onEdit}
      >
        <Pencil />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        variant="destructive"
        aria-label="Delete app"
        title="Delete"
        disabled={isPending || isRunning}
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
        <span className="shrink-0 text-muted-foreground">Applied set</span>
        <span className="min-w-0 flex-1 truncate rounded-lg border border-input bg-background px-2 py-1.5 font-mono text-xs font-semibold">
          {activeVariableSet}
        </span>
      </div>
    )
  }

  return (
    <label className="flex min-w-0 items-center gap-2 text-sm">
      <span className="shrink-0 text-muted-foreground">Applied set</span>
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
