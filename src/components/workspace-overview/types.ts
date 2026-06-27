export type AppProcessStatus = {
  appId: number
  command: string
  pid: number | null
  status: string
  stdout: string
  stderr: string
  startedAt: string | null
  stoppedAt: string | null
  exitCode: number | null
  signal: string | null
  error: string | null
}

export type WorkspaceOverviewApp = {
  id: number
  name: string
  pathLocation: string
  activeVariableSet: string
  runConfig?: { command: string } | null
  runConfigs: Array<{ setName: string; command: string }>
  configSets: Array<{ setName: string }>
  variableConfigs: Array<{ setName: string }>
  templateConfigs: Array<{ setName: string }>
}

export type WorkspaceOverviewWorkspace = {
  id: number
  name: string
  apps: Array<WorkspaceOverviewApp>
}
