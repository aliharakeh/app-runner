import { Plus, Trash2 } from "lucide-react"
import type * as React from "react"

import { EmptyState } from "@/components/app-config/empty-state"
import { inputClassName } from "@/components/app-config/form-styles"
import type { AppVariableConfig } from "@/components/app-config/types"
import { Button } from "@/components/ui/button"

export function VariablesTab({
  isPending,
  activeVariableSet,
  variables,
  onDelete,
  onSubmit,
}: {
  isPending: boolean
  activeVariableSet: string
  variables: Array<AppVariableConfig>
  onDelete: (id: number) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="flex flex-col gap-4">
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
