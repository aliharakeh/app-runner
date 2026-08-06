import { useServerFn } from "@tanstack/react-start"
import { FolderOpen } from "lucide-react"
import * as React from "react"

import { inputClassName } from "@/components/app-config/form-styles"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
} from "@/components/ui/input-group"
import { pickFolderFn } from "@/db/workspace-functions"
import { cn } from "@/lib/utils"

export function AppPathField({
  defaultValue = "",
  disabled,
  name = "pathLocation",
}: {
  defaultValue?: string
  disabled?: boolean
  name?: string
}) {
  const pickFolder = useServerFn(pickFolderFn)
  const [pathLocation, setPathLocation] = React.useState(defaultValue)
  const [isPicking, startPicking] = React.useTransition()
  const [pickerError, setPickerError] = React.useState("")

  React.useEffect(() => {
    setPathLocation(defaultValue)
    setPickerError("")
  }, [defaultValue])

  function handleBrowse() {
    startPicking(async () => {
      try {
        setPickerError("")
        const result = await pickFolder({
          data: { initialPath: pathLocation || undefined },
        })

        if (result.path) {
          setPathLocation(result.path)
        }
      } catch (error) {
        setPickerError(getErrorMessage(error))
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-2 text-sm font-medium">
        Path
        <input type="hidden" name={name} value={pathLocation} />
        <InputGroup className="h-9">
          <input
            required
            value={pathLocation}
            disabled={disabled || isPicking}
            placeholder="C:\Workspace\GitHub\my-app"
            aria-label="App folder path"
            className={cn(
              inputClassName,
              "min-w-0 flex-1 rounded-none border-0 bg-transparent px-2.5 shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent"
            )}
            onChange={(event) => {
              setPathLocation(event.target.value)
              setPickerError("")
            }}
          />
          <InputGroupAddon align="inline-end" className="pr-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || isPicking}
              aria-label="Browse for folder"
              title="Browse for folder"
              className={cn("h-7 shrink-0 gap-1.5 px-2")}
              onClick={handleBrowse}
            >
              <FolderOpen />
              {isPicking ? "Opening…" : "Browse"}
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </label>
      {pickerError ? (
        <p className="text-sm text-destructive" role="alert">
          {pickerError}
        </p>
      ) : null}
    </div>
  )
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong"
}
