import { Dialog } from "@base-ui/react/dialog"
import { Plus, Trash2, X } from "lucide-react"
import type * as React from "react"

import { EmptyState } from "@/components/app-config/empty-state"
import { inputClassName } from "@/components/app-config/form-styles"
import type { AppVariableConfig } from "@/components/app-config/types"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function VariablesTab({
  isPending,
  activeVariableSet,
  deleteVariableSetOpen,
  newVariableSetOpen,
  variableSetNames,
  variables,
  onDelete,
  onDeleteSet,
  onDeleteSetOpenChange,
  onNewSetOpenChange,
  onNewSetSubmit,
  onSetChange,
  onSubmit,
}: {
  isPending: boolean
  activeVariableSet: string
  deleteVariableSetOpen: boolean
  newVariableSetOpen: boolean
  variableSetNames: Array<string>
  variables: Array<AppVariableConfig>
  onDelete: (id: number) => void
  onDeleteSet: () => void
  onDeleteSetOpenChange: (open: boolean) => void
  onNewSetOpenChange: (open: boolean) => void
  onNewSetSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onSetChange: (setName: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  const variableSetItems = variableSetNames.map((setName) => ({
    label: setName,
    value: setName,
  }))

  return (
    <div className="flex flex-col gap-4">
      <NewVariableSetDialog
        isPending={isPending}
        open={newVariableSetOpen}
        onOpenChange={onNewSetOpenChange}
        onSubmit={onNewSetSubmit}
      />
      <DeleteVariableSetDialog
        activeVariableSet={activeVariableSet}
        isPending={isPending}
        open={deleteVariableSetOpen}
        variableCount={variables.length}
        onDelete={onDeleteSet}
        onOpenChange={onDeleteSetOpenChange}
      />
      <div className="app-panel flex flex-wrap items-end gap-3 rounded-lg p-4">
        <label className="flex w-fit min-w-52 flex-col gap-2 text-sm font-medium">
          Applied set
          <Select
            items={variableSetItems}
            value={activeVariableSet}
            disabled={isPending}
            onValueChange={(value) => {
              if (value) {
                onSetChange(value)
              }
            }}
          >
            <SelectTrigger className="h-9 w-full bg-background shadow-inner shadow-muted/40">
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
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => onNewSetOpenChange(true)}
        >
          <Plus data-icon="inline-start" />
          New set
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={isPending}
          onClick={() => onDeleteSetOpenChange(true)}
        >
          <Trash2 data-icon="inline-start" />
          Delete set
        </Button>
      </div>
      <form
        className="app-panel grid gap-3 rounded-lg p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        onSubmit={onSubmit}
      >
        <input type="hidden" name="setName" value={activeVariableSet} />
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
              className="app-panel grid gap-3 rounded-lg p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
              onSubmit={onSubmit}
            >
              <input type="hidden" name="id" value={variable.id} />
              <input type="hidden" name="setName" value={activeVariableSet} />
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

function NewVariableSetDialog({
  isPending,
  open,
  onOpenChange,
  onSubmit,
}: {
  isPending: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" />
        <Dialog.Popup className="app-panel fixed top-1/2 left-1/2 flex w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg bg-popover p-5 text-popover-foreground outline-none">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="text-base font-semibold">
              New variable set
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              type="button"
            >
              <X />
            </Dialog.Close>
          </div>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Set name
              <input
                autoFocus
                name="setName"
                required
                className={inputClassName}
                placeholder="staging"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Dialog.Close
                className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
                type="button"
              >
                Cancel
              </Dialog.Close>
              <Button type="submit" disabled={isPending}>
                Create set
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DeleteVariableSetDialog({
  activeVariableSet,
  isPending,
  open,
  variableCount,
  onDelete,
  onOpenChange,
}: {
  activeVariableSet: string
  isPending: boolean
  open: boolean
  variableCount: number
  onDelete: () => void
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" />
        <Dialog.Popup className="app-panel fixed top-1/2 left-1/2 flex w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg bg-popover p-5 text-popover-foreground outline-none">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold">
                Delete variable set
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Delete {activeVariableSet} and {variableCount} variables.
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
              onClick={onDelete}
            >
              Delete set
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
