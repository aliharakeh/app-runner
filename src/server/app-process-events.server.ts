import "@tanstack/react-start/server-only"

type ProcessUpdateListener = () => void

const listenersByAppId = new Map<number, Set<ProcessUpdateListener>>()
const pendingLogNotify = new Map<number, ReturnType<typeof setTimeout>>()

const LOG_NOTIFY_MS = 50

export function subscribeAppProcessUpdates(
  appId: number,
  listener: ProcessUpdateListener
) {
  let listeners = listenersByAppId.get(appId)

  if (!listeners) {
    listeners = new Set()
    listenersByAppId.set(appId, listeners)
  }

  listeners.add(listener)

  return () => {
    listeners?.delete(listener)

    if (listeners?.size === 0) {
      listenersByAppId.delete(appId)
    }
  }
}

export function notifyAppProcessUpdate(appId: number) {
  const listeners = listenersByAppId.get(appId)

  if (!listeners?.size) {
    return
  }

  for (const listener of listeners) {
    listener()
  }
}

export function scheduleAppProcessLogUpdate(appId: number) {
  if (pendingLogNotify.has(appId)) {
    return
  }

  pendingLogNotify.set(
    appId,
    setTimeout(() => {
      pendingLogNotify.delete(appId)
      notifyAppProcessUpdate(appId)
    }, LOG_NOTIFY_MS)
  )
}
