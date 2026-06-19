import { createServerFn } from "@tanstack/react-start"

function parseWorkspaceName(input: { name?: string }) {
  const name = input.name?.trim()

  if (!name) {
    throw new Error("Workspace name is required")
  }

  return { name }
}

export const listWorkspacesFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { listWorkspaces } = await import("./services/workspaces.server")

    return listWorkspaces()
  }
)

export const createWorkspaceFn = createServerFn({ method: "POST" })
  .validator(parseWorkspaceName)
  .handler(async ({ data }) => {
    const { createWorkspace } = await import("./services/workspaces.server")

    return createWorkspace(data)
  })
