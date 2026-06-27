export type AppVariableConfig = {
  id: number
  setName: string
  name: string
  value: string
}

export type AppTemplateConfig = {
  id: number
  setName: string
  filePath: string
  templateContent: string
}

export type RunConfigLastRun = {
  setName: string
  command: string
  lastRunPid: number | null
  lastRunStatus: string | null
  lastRunStdout: string
  lastRunStderr: string
  lastRunStartedAt: string | null
  lastRunStoppedAt: string | null
  lastRunExitCode: number | null
  lastRunSignal: string | null
  lastRunError: string | null
}

export type AppProcessSnapshot = {
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
