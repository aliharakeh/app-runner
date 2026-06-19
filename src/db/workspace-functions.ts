import { createServerFn } from "@tanstack/react-start"

function parseWorkspaceName(input: { name?: string }) {
  const name = input.name?.trim()

  if (!name) {
    throw new Error("Workspace name is required")
  }

  return { name }
}

function parseAppInput(input: {
  workspaceId?: number
  name?: string
  pathLocation?: string
}) {
  const workspaceId = Number(input.workspaceId)
  const name = input.name?.trim()
  const pathLocation = input.pathLocation?.trim()

  if (!Number.isInteger(workspaceId) || workspaceId < 1) {
    throw new Error("Workspace is required")
  }

  if (!name) {
    throw new Error("App name is required")
  }

  if (!pathLocation) {
    throw new Error("App path is required")
  }

  return { workspaceId, name, pathLocation }
}

function parseWorkspaceId(input: { workspaceId?: number | string }) {
  const workspaceId = Number(input.workspaceId)

  if (!Number.isInteger(workspaceId) || workspaceId < 1) {
    throw new Error("Workspace is required")
  }

  return { workspaceId }
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

export const getWorkspaceFn = createServerFn({ method: "GET" })
  .validator(parseWorkspaceId)
  .handler(async ({ data }) => {
    const { getWorkspace } = await import("./services/workspaces.server")

    return getWorkspace(data.workspaceId)
  })

export const deleteWorkspaceFn = createServerFn({ method: "POST" })
  .validator(parseWorkspaceId)
  .handler(async ({ data }) => {
    const { deleteWorkspace } = await import("./services/workspaces.server")

    return deleteWorkspace(data.workspaceId)
  })

export const createAppFn = createServerFn({ method: "POST" })
  .validator(parseAppInput)
  .handler(async ({ data }) => {
    const { createApp } = await import("./services/apps.server")

    return createApp(data)
  })
