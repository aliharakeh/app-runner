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
  runConfig?: { command: string } | null
  variableConfigs: Array<unknown>
  templateConfigs: Array<unknown>
}

export type WorkspaceOverviewWorkspace = {
  id: number
  name: string
  apps: Array<WorkspaceOverviewApp>
}
