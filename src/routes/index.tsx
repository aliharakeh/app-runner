import { createFileRoute, redirect } from "@tanstack/react-router"

import { listWorkspacesFn } from "@/db/workspace-functions"

export const Route = createFileRoute("/")({
  loader: async () => {
    const workspaces = await listWorkspacesFn()

    if (workspaces.length > 0) {
      const firstWorkspace = workspaces[0]

      throw redirect({
        to: "/workspaces/$workspaceId",
        params: { workspaceId: String(firstWorkspace.id) },
      })
    }
  },
  component: App,
})

function App() {
  return (
    <section className="flex flex-col gap-2 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">No workspaces</h1>
      <p className="text-sm text-muted-foreground">
        Create a workspace from the sidebar to get started.
      </p>
    </section>
  )
}
