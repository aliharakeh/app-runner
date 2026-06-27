import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"

export function WorkspaceOverviewHeader({
  appCount,
  workspaceName,
  onAddApp,
  onDeleteWorkspace,
}: {
  appCount: number
  workspaceName: string
  onAddApp: () => void
  onDeleteWorkspace: () => void
}) {
  return (
    <div className="app-panel flex flex-wrap items-start justify-between gap-4 rounded-lg p-4 sm:p-5">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          Workspace
        </p>
        <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight">
          {workspaceName}
        </h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          {appCount} {appCount === 1 ? "app" : "apps"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onAddApp}>
          <Plus data-icon="inline-start" />
          Add app
        </Button>
        <Button type="button" variant="destructive" onClick={onDeleteWorkspace}>
          <Trash2 data-icon="inline-start" />
          Delete
        </Button>
      </div>
    </div>
  )
}
