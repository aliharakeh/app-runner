import { FolderOpen, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

export function EmptyApps({ onAddApp }: { onAddApp: () => void }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-md border border-dashed p-8 text-center">
      <FolderOpen className="text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-medium">No apps yet</h2>
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
