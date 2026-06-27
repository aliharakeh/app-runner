import { Dialog } from "@base-ui/react/dialog"

import { Button } from "@/components/ui/button"

export function DeleteWorkspaceDialog({
  error,
  isPending,
  open,
  workspaceName,
  onConfirm,
  onOpenChange,
}: {
  error: string
  isPending: boolean
  open: boolean
  workspaceName: string
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" />
        <Dialog.Popup className="app-panel fixed top-1/2 left-1/2 flex w-[min(calc(100vw-2rem),25rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg bg-popover p-5 text-popover-foreground outline-none">
          <div className="flex flex-col gap-2">
            <Dialog.Title className="text-base font-semibold">
              Delete workspace
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              This will permanently delete {workspaceName} and all apps inside
              it.
            </Dialog.Description>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Dialog.Close
              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
              type="button"
            >
              Cancel
            </Dialog.Close>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={onConfirm}
            >
              Delete
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function DeleteAppDialog({
  appName,
  error,
  isPending,
  open,
  onConfirm,
  onOpenChange,
}: {
  appName: string
  error: string
  isPending: boolean
  open: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" />
        <Dialog.Popup className="app-panel fixed top-1/2 left-1/2 flex w-[min(calc(100vw-2rem),25rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg bg-popover p-5 text-popover-foreground outline-none">
          <div className="flex flex-col gap-2">
            <Dialog.Title className="text-base font-semibold">
              Delete app
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              This will permanently delete {appName} and its template backups.
            </Dialog.Description>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Dialog.Close
              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
              type="button"
            >
              Cancel
            </Dialog.Close>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={onConfirm}
            >
              Delete
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
