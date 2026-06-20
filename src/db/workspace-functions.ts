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

function parseAppUpdateInput(input: {
  appId?: number | string
  name?: string
  pathLocation?: string
}) {
  const { appId } = parseAppId(input)
  const name = input.name?.trim()
  const pathLocation = input.pathLocation?.trim()

  if (!name) {
    throw new Error("App name is required")
  }

  if (!pathLocation) {
    throw new Error("App path is required")
  }

  return { appId, name, pathLocation }
}

function parseWorkspaceId(input: { workspaceId?: number | string }) {
  const workspaceId = Number(input.workspaceId)

  if (!Number.isInteger(workspaceId) || workspaceId < 1) {
    throw new Error("Workspace is required")
  }

  return { workspaceId }
}

function parseAppId(input: { appId?: number | string }) {
  const appId = Number(input.appId)

  if (!Number.isInteger(appId) || appId < 1) {
    throw new Error("App is required")
  }

  return { appId }
}

function parseConfigId(input: { id?: number | string }) {
  const id = Number(input.id)

  if (!Number.isInteger(id) || id < 1) {
    throw new Error("Configuration is required")
  }

  return { id }
}

function parseVariableConfigInput(input: {
  appId?: number | string
  name?: string
  value?: string
}) {
  const { appId } = parseAppId(input)
  const name = input.name?.trim()
  const value = input.value?.trim()

  if (!name) {
    throw new Error("Variable name is required")
  }

  if (!value) {
    throw new Error("Variable value is required")
  }

  return { appId, name, value }
}

function parseTemplateConfigInput(input: {
  appId?: number | string
  name?: string
  templateContent?: string
}) {
  const { appId } = parseAppId(input)
  const name = input.name?.trim()
  const templateContent = input.templateContent?.trim()

  if (!name) {
    throw new Error("Template name is required")
  }

  if (!templateContent) {
    throw new Error("Template content is required")
  }

  return { appId, name, templateContent }
}

function parseRunConfigInput(input: {
  appId?: number | string
  command?: string
}) {
  const { appId } = parseAppId(input)
  const command = input.command?.trim()

  if (!command) {
    throw new Error("Run command is required")
  }

  return { appId, command }
}

function parseAppIds(input: { appIds?: Array<number | string> }) {
  const appIds = input.appIds?.map(Number) ?? []

  if (
    !appIds.length ||
    appIds.some((appId) => !Number.isInteger(appId) || appId < 1)
  ) {
    throw new Error("Apps are required")
  }

  return { appIds }
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

export const updateAppFn = createServerFn({ method: "POST" })
  .validator(parseAppUpdateInput)
  .handler(async ({ data }) => {
    const { updateApp } = await import("./services/apps.server")

    return updateApp(data.appId, {
      name: data.name,
      pathLocation: data.pathLocation,
    })
  })

export const getAppFn = createServerFn({ method: "GET" })
  .validator(parseAppId)
  .handler(async ({ data }) => {
    const { getApp } = await import("./services/apps.server")

    return getApp(data.appId)
  })

export const createVariableConfigFn = createServerFn({ method: "POST" })
  .validator(parseVariableConfigInput)
  .handler(async ({ data }) => {
    const { createVariableConfig } =
      await import("./services/variable-configs.server")

    return createVariableConfig(data)
  })

export const updateVariableConfigFn = createServerFn({ method: "POST" })
  .validator(
    (input: {
      id?: number | string
      appId?: number | string
      name?: string
      value?: string
    }) => ({
      ...parseConfigId(input),
      ...parseVariableConfigInput(input),
    })
  )
  .handler(async ({ data }) => {
    const { updateVariableConfig } =
      await import("./services/variable-configs.server")

    return updateVariableConfig(data.id, {
      appId: data.appId,
      name: data.name,
      value: data.value,
    })
  })

export const deleteVariableConfigFn = createServerFn({ method: "POST" })
  .validator(parseConfigId)
  .handler(async ({ data }) => {
    const { deleteVariableConfig } =
      await import("./services/variable-configs.server")

    return deleteVariableConfig(data.id)
  })

export const createTemplateConfigFn = createServerFn({ method: "POST" })
  .validator(parseTemplateConfigInput)
  .handler(async ({ data }) => {
    const { createTemplateConfig } =
      await import("./services/template-configs.server")

    return createTemplateConfig(data)
  })

export const updateTemplateConfigFn = createServerFn({ method: "POST" })
  .validator(
    (input: {
      id?: number | string
      appId?: number | string
      name?: string
      templateContent?: string
    }) => ({
      ...parseConfigId(input),
      ...parseTemplateConfigInput(input),
    })
  )
  .handler(async ({ data }) => {
    const { updateTemplateConfig } =
      await import("./services/template-configs.server")

    return updateTemplateConfig(data.id, {
      appId: data.appId,
      name: data.name,
      templateContent: data.templateContent,
    })
  })

export const deleteTemplateConfigFn = createServerFn({ method: "POST" })
  .validator(parseConfigId)
  .handler(async ({ data }) => {
    const { deleteTemplateConfig } =
      await import("./services/template-configs.server")

    return deleteTemplateConfig(data.id)
  })

export const upsertRunConfigFn = createServerFn({ method: "POST" })
  .validator(parseRunConfigInput)
  .handler(async ({ data }) => {
    const { upsertRunConfigForApp } =
      await import("./services/run-configs.server")

    return upsertRunConfigForApp(data.appId, { command: data.command })
  })

export const startAppProcessFn = createServerFn({ method: "POST" })
  .validator(parseAppId)
  .handler(async ({ data }) => {
    const { startAppProcess } = await import("@/server/app-processes.server")

    return startAppProcess(data.appId)
  })

export const stopAppProcessFn = createServerFn({ method: "POST" })
  .validator(parseAppId)
  .handler(async ({ data }) => {
    const { stopAppProcess } = await import("@/server/app-processes.server")

    return stopAppProcess(data.appId)
  })

export const restartAppProcessFn = createServerFn({ method: "POST" })
  .validator(parseAppId)
  .handler(async ({ data }) => {
    const { restartAppProcess } = await import("@/server/app-processes.server")

    return restartAppProcess(data.appId)
  })

export const getAppProcessStatusesFn = createServerFn({ method: "GET" })
  .validator(parseAppIds)
  .handler(async ({ data }) => {
    const { getAppProcessStatuses } =
      await import("@/server/app-processes.server")

    return getAppProcessStatuses(data.appIds)
  })
