import { createServerFn } from "@tanstack/react-start"

type ConfigConflictChoice = "source" | "target"

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
  activeVariableSet?: string
}) {
  const { appId } = parseAppId(input)
  const name = input.name?.trim()
  const pathLocation = input.pathLocation?.trim()
  const activeVariableSet = input.activeVariableSet?.trim()

  if (!name) {
    throw new Error("App name is required")
  }

  if (!pathLocation) {
    throw new Error("App path is required")
  }

  return { appId, name, pathLocation, activeVariableSet }
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
  setName?: string
  name?: string
  value?: string
}) {
  const { appId } = parseAppId(input)
  const setName = input.setName?.trim() || "default"
  const name = input.name?.trim()
  const value = input.value?.trim()

  if (!name) {
    throw new Error("Variable name is required")
  }

  if (!value) {
    throw new Error("Variable value is required")
  }

  return { appId, setName, name, value }
}

function parseVariableSetInput(input: {
  appId?: number | string
  setName?: string
}) {
  const { appId } = parseAppId(input)
  const setName = input.setName?.trim()

  if (!setName) {
    throw new Error("Config set is required")
  }

  return { appId, setName }
}

function parseAppConfigSetInput(input: {
  appId?: number | string
  setName?: string
  sourceSetName?: string
  copyVariables?: boolean | string
  copyTemplates?: boolean | string
  copyRunConfig?: boolean | string
  variableConflictChoices?: Array<{
    name?: string
    choice?: string
  }>
  templateConflictChoices?: Array<{
    filePath?: string
    choice?: string
  }>
}) {
  const { appId, setName } = parseVariableSetInput(input)
  const sourceSetName = input.sourceSetName?.trim()
  const copyVariables = parseFormBoolean(input.copyVariables)
  const copyTemplates = parseFormBoolean(input.copyTemplates)
  const copyRunConfig = parseFormBoolean(input.copyRunConfig)
  const shouldCopy = copyVariables || copyTemplates || copyRunConfig
  const variableConflictChoices = parseVariableConflictChoices(
    input.variableConflictChoices
  )
  const templateConflictChoices = parseTemplateConflictChoices(
    input.templateConflictChoices
  )

  if (shouldCopy && !sourceSetName) {
    throw new Error("Source config set is required")
  }

  if (sourceSetName && sourceSetName === setName) {
    throw new Error("Source and target config sets must be different")
  }

  return {
    appId,
    setName,
    sourceSetName,
    copyVariables,
    copyTemplates,
    copyRunConfig,
    variableConflictChoices,
    templateConflictChoices,
  }
}

function parseTemplateConfigInput(input: {
  appId?: number | string
  setName?: string
  filePath?: string
  templateContent?: string
}) {
  const { appId } = parseAppId(input)
  const setName = input.setName?.trim() || "default"
  const filePath = input.filePath?.trim()
  const templateContent = input.templateContent?.trim()

  if (!filePath) {
    throw new Error("Replaced file path is required")
  }

  if (!templateContent) {
    throw new Error("Template content is required")
  }

  return { appId, setName, filePath, templateContent }
}

function parseRunConfigInput(input: {
  appId?: number | string
  setName?: string
  command?: string
}) {
  const { appId } = parseAppId(input)
  const setName = input.setName?.trim() || "default"
  const command = input.command?.trim()

  if (!command) {
    throw new Error("Run command is required")
  }

  return { appId, setName, command }
}

function parseConfigOrderInput(input: {
  appId?: number | string
  setName?: string
  orderedIds?: Array<number | string>
}) {
  const { appId } = parseAppId(input)
  const setName = input.setName?.trim() || "default"
  const orderedIds = input.orderedIds?.map(Number) ?? []
  const uniqueIds = new Set(orderedIds)

  if (
    !orderedIds.length ||
    uniqueIds.size !== orderedIds.length ||
    orderedIds.some((id) => !Number.isInteger(id) || id < 1)
  ) {
    throw new Error("Configuration order is required")
  }

  return { appId, setName, orderedIds }
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

function parseFormBoolean(value: boolean | string | undefined) {
  return value === true || value === "true" || value === "on"
}

function parseVariableConflictChoices(
  input:
    | Array<{
        name?: string
        choice?: string
      }>
    | undefined
) {
  return (input ?? []).map((conflict) => {
    const name = conflict.name?.trim()

    if (!name) {
      throw new Error("Variable conflict is required")
    }

    return {
      name,
      choice: parseConflictChoice(conflict.choice),
    }
  })
}

function parseTemplateConflictChoices(
  input:
    | Array<{
        filePath?: string
        choice?: string
      }>
    | undefined
) {
  return (input ?? []).map((conflict) => {
    const filePath = conflict.filePath?.trim()

    if (!filePath) {
      throw new Error("Template conflict is required")
    }

    return {
      filePath,
      choice: parseConflictChoice(conflict.choice),
    }
  })
}

function parseConflictChoice(choice: string | undefined): ConfigConflictChoice {
  if (choice === "source" || choice === "target") {
    return choice
  }

  throw new Error("Conflict choice is required")
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
      activeVariableSet: data.activeVariableSet,
    })
  })

export const deleteAppFn = createServerFn({ method: "POST" })
  .validator(parseAppId)
  .handler(async ({ data }) => {
    const { deleteApp } = await import("./services/apps.server")

    return deleteApp(data.appId)
  })

export const getAppFn = createServerFn({ method: "GET" })
  .validator(parseAppId)
  .handler(async ({ data }) => {
    const { getApp } = await import("./services/apps.server")

    return getApp(data.appId)
  })

export const listAppFilesFn = createServerFn({ method: "GET" })
  .validator(parseAppId)
  .handler(async ({ data }) => {
    const { getApp } = await import("./services/apps.server")
    const { listAppPathFiles } = await import("@/server/app-paths.server")
    const app = await getApp(data.appId)

    if (!app) {
      throw new Error("App not found")
    }

    return listAppPathFiles(app.pathLocation)
  })

export const createVariableConfigFn = createServerFn({ method: "POST" })
  .validator(parseVariableConfigInput)
  .handler(async ({ data }) => {
    const { createAppConfigSet } =
      await import("./services/app-config-sets.server")
    const { createVariableConfig } =
      await import("./services/variable-configs.server")

    await createAppConfigSet({
      appId: data.appId,
      setName: data.setName,
    })

    return createVariableConfig(data)
  })

export const updateVariableConfigFn = createServerFn({ method: "POST" })
  .validator(
    (input: {
      id?: number | string
      appId?: number | string
      setName?: string
      name?: string
      value?: string
    }) => ({
      ...parseConfigId(input),
      ...parseVariableConfigInput(input),
    })
  )
  .handler(async ({ data }) => {
    const { createAppConfigSet } =
      await import("./services/app-config-sets.server")
    const { updateVariableConfig } =
      await import("./services/variable-configs.server")

    await createAppConfigSet({
      appId: data.appId,
      setName: data.setName,
    })

    return updateVariableConfig(data.id, {
      appId: data.appId,
      setName: data.setName,
      name: data.name,
      value: data.value,
    })
  })

export const reorderVariableConfigsFn = createServerFn({ method: "POST" })
  .validator(parseConfigOrderInput)
  .handler(async ({ data }) => {
    const { reorderVariableConfigs } =
      await import("./services/variable-configs.server")

    return reorderVariableConfigs(data)
  })

export const createAppConfigSetFn = createServerFn({ method: "POST" })
  .validator(parseAppConfigSetInput)
  .handler(async ({ data }) => {
    const { createAppConfigSet, createAppConfigSetFromSet } =
      await import("./services/app-config-sets.server")

    if (
      data.sourceSetName &&
      (data.copyVariables || data.copyTemplates || data.copyRunConfig)
    ) {
      return createAppConfigSetFromSet({
        appId: data.appId,
        setName: data.setName,
        sourceSetName: data.sourceSetName,
        copyVariables: data.copyVariables,
        copyTemplates: data.copyTemplates,
        copyRunConfig: data.copyRunConfig,
        variableConflictChoices: data.variableConflictChoices,
        templateConflictChoices: data.templateConflictChoices,
      })
    }

    return createAppConfigSet({
      appId: data.appId,
      setName: data.setName,
    })
  })

export const deleteVariableConfigFn = createServerFn({ method: "POST" })
  .validator(parseConfigId)
  .handler(async ({ data }) => {
    const { deleteVariableConfig } =
      await import("./services/variable-configs.server")

    return deleteVariableConfig(data.id)
  })

export const deleteAppConfigSetFn = createServerFn({ method: "POST" })
  .validator(parseVariableSetInput)
  .handler(async ({ data }) => {
    const { deleteAppConfigSet } =
      await import("./services/app-config-sets.server")
    const { deleteVariableSet } =
      await import("./services/variable-configs.server")
    const { deleteTemplateSet } =
      await import("./services/template-configs.server")
    const { deleteRunConfigForSet } =
      await import("./services/run-configs.server")

    const [configSets, variables, templates, runConfigs] = await Promise.all([
      deleteAppConfigSet(data.appId, data.setName),
      deleteVariableSet(data.appId, data.setName),
      deleteTemplateSet(data.appId, data.setName),
      deleteRunConfigForSet(data.appId, data.setName),
    ])

    return { configSets, variables, templates, runConfigs }
  })

export const createTemplateConfigFn = createServerFn({ method: "POST" })
  .validator(parseTemplateConfigInput)
  .handler(async ({ data }) => {
    const { createAppConfigSet } =
      await import("./services/app-config-sets.server")
    const { createTemplateConfig } =
      await import("./services/template-configs.server")

    await createAppConfigSet({
      appId: data.appId,
      setName: data.setName,
    })

    return createTemplateConfig(data)
  })

export const updateTemplateConfigFn = createServerFn({ method: "POST" })
  .validator(
    (input: {
      id?: number | string
      appId?: number | string
      setName?: string
      filePath?: string
      templateContent?: string
    }) => ({
      ...parseConfigId(input),
      ...parseTemplateConfigInput(input),
    })
  )
  .handler(async ({ data }) => {
    const { createAppConfigSet } =
      await import("./services/app-config-sets.server")
    const { updateTemplateConfig } =
      await import("./services/template-configs.server")

    await createAppConfigSet({
      appId: data.appId,
      setName: data.setName,
    })

    return updateTemplateConfig(data.id, {
      appId: data.appId,
      setName: data.setName,
      filePath: data.filePath,
      templateContent: data.templateContent,
    })
  })

export const reorderTemplateConfigsFn = createServerFn({ method: "POST" })
  .validator(parseConfigOrderInput)
  .handler(async ({ data }) => {
    const { reorderTemplateConfigs } =
      await import("./services/template-configs.server")

    return reorderTemplateConfigs(data)
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
    const { createAppConfigSet } =
      await import("./services/app-config-sets.server")
    const { upsertRunConfigForApp } =
      await import("./services/run-configs.server")

    await createAppConfigSet({
      appId: data.appId,
      setName: data.setName,
    })

    return upsertRunConfigForApp(data.appId, {
      setName: data.setName,
      command: data.command,
    })
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
