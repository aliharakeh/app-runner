import { FolderOpen, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

export function EmptyApps({ onAddApp }: { onAddApp: () => void }) {
  return (
    <div className="app-panel flex min-h-72 flex-col items-center justify-center gap-4 rounded-lg border-dashed p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-lg bg-secondary text-primary">
        <FolderOpen />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">No apps yet</h2>
        <p className="text-sm text-muted-foreground">
          Add the first app in this workspace.
        </p>
      </div>
      <Button type="button" onClick={onAddApp}>
        <Plus data-icon="inline-start" />
        Add app
      </Button>
    </div>
  )
}
