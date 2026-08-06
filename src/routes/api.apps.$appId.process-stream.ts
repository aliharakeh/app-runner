import { createFileRoute } from "@tanstack/react-router"

import { subscribeAppProcessUpdates } from "@/server/app-process-events.server"
import { getAppProcessStatus } from "@/server/app-processes.server"

const KEEP_ALIVE_MS = 15_000

export const Route = createFileRoute("/api/apps/$appId/process-stream")({
  server: {
    handlers: {
      GET: ({ params }) => {
        const appId = Number(params.appId)

        if (!Number.isInteger(appId) || appId < 1) {
          return new Response("Invalid app ID", { status: 400 })
        }

        const encoder = new TextEncoder()
        let closed = false
        let unsubscribe: (() => void) | null = null
        let keepAliveInterval: ReturnType<typeof setInterval> | null = null

        const stream = new ReadableStream({
          start(controller) {
            const sendSnapshot = () => {
              if (closed) {
                return
              }

              const snapshot = getAppProcessStatus(appId)
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`)
              )
            }

            sendSnapshot()

            unsubscribe = subscribeAppProcessUpdates(appId, sendSnapshot)

            keepAliveInterval = setInterval(() => {
              if (closed) {
                return
              }

              controller.enqueue(encoder.encode(": keepalive\n\n"))
            }, KEEP_ALIVE_MS)
          },
          cancel() {
            closed = true

            if (unsubscribe) {
              unsubscribe()
            }

            if (keepAliveInterval) {
              clearInterval(keepAliveInterval)
            }
          },
        })

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        })
      },
    },
  },
})
