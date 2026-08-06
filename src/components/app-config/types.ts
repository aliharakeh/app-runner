export type AppVariableConfig = {
  id: number
  setName: string
  name: string
  value: string
  position: number
}

export type AppTemplateConfig = {
  id: number
  setName: string
  filePath: string
  templateContent: string
  position: number
}

export type RunConfigCommand = {
  id: number
  command: string
  position: number
}

export type RunConfig = {
  setName: string
  command: string
  mode: string
  commands: Array<RunConfigCommand>
}

export type AppProcessChildSnapshot = {
  command: string
  pid: number | null
  status: string
  stdout: string
  stderr: string
  exitCode: number | null
  signal: string | null
  error: string | null
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
  processes: Array<AppProcessChildSnapshot>
}
