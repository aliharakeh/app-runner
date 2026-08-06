import * as React from "react"

import type { AppProcessSnapshot } from "@/components/app-config/types"

function parseProcessSnapshot(data: string): AppProcessSnapshot | null {
  try {
    return JSON.parse(data) as AppProcessSnapshot
  } catch {
    return null
  }
}

export function useAppProcessStream(
  appId: number,
  initialStatus: AppProcessSnapshot
) {
  const [processStatus, setProcessStatus] =
    React.useState<AppProcessSnapshot>(initialStatus)

  React.useEffect(() => {
    setProcessStatus(initialStatus)
  }, [appId, initialStatus])

  React.useEffect(() => {
    const eventSource = new EventSource(
      `/api/apps/${appId}/process-stream`
    )

    eventSource.onmessage = (event) => {
      const snapshot = parseProcessSnapshot(event.data)

      if (snapshot) {
        setProcessStatus(snapshot)
      }
    }

    return () => {
      eventSource.close()
    }
  }, [appId])

  return processStatus
}

export function useWorkspaceProcessStreams(
  initialStatuses: Record<number, AppProcessSnapshot>
) {
  const [processStatuses, setProcessStatuses] =
    React.useState<Record<number, AppProcessSnapshot>>(initialStatuses)

  React.useEffect(() => {
    setProcessStatuses(initialStatuses)
  }, [initialStatuses])

  const runningAppIds = React.useMemo(
    () =>
      Object.entries(processStatuses)
        .filter(([, status]) => status.status === "running")
        .map(([appId]) => Number(appId)),
    [processStatuses]
  )

  React.useEffect(() => {
    if (!runningAppIds.length) {
      return
    }

    const sources = runningAppIds.map((appId) => {
      const eventSource = new EventSource(
        `/api/apps/${appId}/process-stream`
      )

      eventSource.onmessage = (event) => {
        const snapshot = parseProcessSnapshot(event.data)

        if (!snapshot) {
          return
        }

        setProcessStatuses((current) => ({
          ...current,
          [appId]: snapshot,
        }))
      }

      return eventSource
    })

    return () => {
      for (const eventSource of sources) {
        eventSource.close()
      }
    }
  }, [runningAppIds.join(",")])

  const updateProcessStatus = React.useCallback(
    (appId: number, status: AppProcessSnapshot) => {
      setProcessStatuses((current) => ({
        ...current,
        [appId]: status,
      }))
    },
    []
  )

  return { processStatuses, updateProcessStatus }
}
