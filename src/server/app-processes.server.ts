import "@tanstack/react-start/server-only"

import { spawn } from "node:child_process"
import type { ChildProcessWithoutNullStreams } from "node:child_process"
import fs from "node:fs"
import Handlebars from "handlebars"
import os from "node:os"
import path from "node:path"

import { getApp } from "@/db/services/apps.server"
import { saveRunConfigLastRun } from "@/db/services/run-configs.server"
import { validateAppPathLocation } from "@/server/app-paths.server"
import { getTemplateBackupRoot } from "@/server/template-backups.server"

const MAX_LOG_LENGTH = 20_000
const WINDOWS_SHELL_ENV_KEYS = ["ComSpec", "SystemRoot", "WINDIR"] as const

type AppProcessStatus = "running" | "stopped" | "exited" | "error"

export type AppProcessSnapshot = {
  appId: number
  command: string
  pid: number | null
  status: AppProcessStatus
  stdout: string
  stderr: string
  startedAt: string | null
  stoppedAt: string | null
  exitCode: number | null
  signal: string | null
  error: string | null
}

type AppProcessRecord = AppProcessSnapshot & {
  finishPromise: Promise<void> | null
  mappedFiles: Array<{ backupPath: string; targetPath: string }>
  persistTimer: ReturnType<typeof setTimeout> | null
  process: ChildProcessWithoutNullStreams | null
  requestedStop: boolean
}

const processes = new Map<number, AppProcessRecord>()

export async function startAppProcess(appId: number) {
  const existing = processes.get(appId)

  if (existing?.process && existing.status === "running") {
    return toSnapshot(existing)
  }

  const app = await getApp(appId)

  if (!app) {
    throw new Error("App not found")
  }

  const command = app.runConfig?.command.trim()

  if (!command) {
    throw new Error("Run command is not configured")
  }

  validateAppPathLocation(app.pathLocation)

  const variableConfigs = getActiveVariableConfigs(app)
  const env = buildProcessEnv(variableConfigs)
  const mappedFiles = applyTemplateFiles(app)
  const child = spawn(command, {
    cwd: app.pathLocation,
    env,
    shell: os.platform() === "win32" ? getWindowsShellPath() : true,
    windowsHide: true,
  })

  const record: AppProcessRecord = {
    appId,
    command,
    pid: child.pid ?? null,
    process: child,
    finishPromise: null,
    mappedFiles,
    status: "running",
    stdout: "",
    stderr: "",
    startedAt: new Date().toISOString(),
    stoppedAt: null,
    exitCode: null,
    signal: null,
    error: null,
    persistTimer: null,
    requestedStop: false,
  }

  processes.set(appId, record)
  void persistLastRun(record)

  child.stdout.on("data", (chunk: Buffer) => {
    record.stdout = appendLog(record.stdout, chunk.toString())
    schedulePersistLastRun(record)
  })

  child.stderr.on("data", (chunk: Buffer) => {
    record.stderr = appendLog(record.stderr, chunk.toString())
    schedulePersistLastRun(record)
  })

  child.on("error", (error) => {
    void finishRecord(record, {
      status: record.requestedStop ? "stopped" : "error",
      error: error.message,
    })
  })

  child.on("exit", (code, signal) => {
    void finishRecord(record, {
      status: record.requestedStop ? "stopped" : code === 0 ? "exited" : "error",
      exitCode: code,
      signal,
    })
  })

  return toSnapshot(record)
}

export async function stopAppProcess(appId: number) {
  const record = processes.get(appId)

  if (!record?.process || record.status !== "running") {
    return getAppProcessStatus(appId)
  }

  record.requestedStop = true
  await killProcessTree(record.process)
  await finishRecord(record, { status: "stopped" })

  return toSnapshot(record)
}

export async function restartAppProcess(appId: number) {
  await stopAppProcess(appId)
  return startAppProcess(appId)
}

export function getAppProcessStatus(appId: number) {
  const record = processes.get(appId)

  if (!record) {
    return createStoppedSnapshot(appId)
  }

  return toSnapshot(record)
}

export function getAppProcessStatuses(appIds: Array<number>) {
  return Object.fromEntries(
    appIds.map((appId) => [appId, getAppProcessStatus(appId)])
  )
}

function appendLog(current: string, next: string) {
  const value = `${current}${next}`

  if (value.length <= MAX_LOG_LENGTH) {
    return value
  }

  return value.slice(value.length - MAX_LOG_LENGTH)
}

async function finishRecord(
  record: AppProcessRecord,
  input: Partial<
    Pick<AppProcessRecord, "status" | "exitCode" | "signal" | "error">
  >
) {
  if (!record.finishPromise) {
    record.finishPromise = finishRecordOnce(record, input)
  }

  await record.finishPromise
}

async function finishRecordOnce(
  record: AppProcessRecord,
  input: Partial<
    Pick<AppProcessRecord, "status" | "exitCode" | "signal" | "error">
  >
) {
  record.status = input.status ?? record.status
  record.exitCode = input.exitCode ?? record.exitCode
  record.signal = input.signal ?? record.signal
  record.error = input.error ?? record.error
  record.stoppedAt = new Date().toISOString()
  record.process = null

  try {
    await rollbackTemplateFiles(record.mappedFiles)
  } catch (error) {
    record.status = "error"
    record.error = appendError(record.error, getErrorMessage(error))
  }

  await persistLastRun(record)
}

function schedulePersistLastRun(record: AppProcessRecord) {
  if (record.persistTimer) {
    return
  }

  record.persistTimer = setTimeout(() => {
    record.persistTimer = null
    void persistLastRun(record)
  }, 1000)
}

async function persistLastRun(record: AppProcessRecord) {
  if (record.persistTimer) {
    clearTimeout(record.persistTimer)
    record.persistTimer = null
  }

  await saveRunConfigLastRun(record.appId, {
    lastRunPid: record.pid,
    lastRunStatus: record.status,
    lastRunStdout: record.stdout,
    lastRunStderr: record.stderr,
    lastRunStartedAt: record.startedAt,
    lastRunStoppedAt: record.stoppedAt,
    lastRunExitCode: record.exitCode,
    lastRunSignal: record.signal,
    lastRunError: record.error,
  })
}

function toSnapshot(record: AppProcessRecord): AppProcessSnapshot {
  return {
    appId: record.appId,
    command: record.command,
    pid: record.pid,
    status: record.status,
    stdout: record.stdout,
    stderr: record.stderr,
    startedAt: record.startedAt,
    stoppedAt: record.stoppedAt,
    exitCode: record.exitCode,
    signal: record.signal,
    error: record.error,
  }
}

function createStoppedSnapshot(appId: number): AppProcessSnapshot {
  return {
    appId,
    command: "",
    pid: null,
    status: "stopped",
    stdout: "",
    stderr: "",
    startedAt: null,
    stoppedAt: null,
    exitCode: null,
    signal: null,
    error: null,
  }
}

function applyTemplateFiles(app: NonNullable<Awaited<ReturnType<typeof getApp>>>) {
  if (!app.templateConfigs.length) {
    return []
  }

  const values = Object.fromEntries(
    getActiveVariableConfigs(app).map((variable) => [
      variable.name,
      variable.value,
    ])
  )
  const backupRoot = getTemplateBackupRoot({
    appName: app.name,
    workspaceName: app.workspace.name,
  })
  const mappedFiles: Array<{ backupPath: string; targetPath: string }> = []

  for (const template of app.templateConfigs) {
    const targetPath = resolveInside(
      app.pathLocation,
      Handlebars.compile(template.filePath, { noEscape: true })(values)
    )
    const relativePath = path.relative(app.pathLocation, targetPath)
    const backupPath = path.join(backupRoot, relativePath)
    const content = Handlebars.compile(template.templateContent, {
      noEscape: true,
    })(values)

    if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
      throw new Error(`Template target file does not exist: ${relativePath}`)
    }

    fs.mkdirSync(path.dirname(backupPath), { recursive: true })
    fs.copyFileSync(targetPath, backupPath)
    fs.writeFileSync(targetPath, content)
    mappedFiles.push({ backupPath, targetPath })
  }

  return mappedFiles
}

function getActiveVariableConfigs(
  app: NonNullable<Awaited<ReturnType<typeof getApp>>>
) {
  const activeSet = app.activeVariableSet || "default"
  return app.variableConfigs.filter((variable) => variable.setName === activeSet)
}

async function rollbackTemplateFiles(
  mappedFiles: Array<{ backupPath: string; targetPath: string }>
) {
  for (const file of mappedFiles) {
    await fs.promises.copyFile(file.backupPath, file.targetPath)
  }
}

function resolveInside(root: string, relativePath: string) {
  if (path.isAbsolute(relativePath)) {
    throw new Error(`Template file path must be relative: ${relativePath}`)
  }

  const resolvedPath = path.resolve(root, relativePath)
  const relative = path.relative(root, resolvedPath)

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Template file path escapes app folder: ${relativePath}`)
  }

  return resolvedPath
}

function appendError(current: string | null, next: string) {
  return current ? `${current}\n${next}` : next
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error"
}

function buildProcessEnv(
  variables: Array<{ name: string; value: string }>
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env }

  for (const variable of variables) {
    env[variable.name] = variable.value
  }

  if (os.platform() === "win32") {
    for (const key of WINDOWS_SHELL_ENV_KEYS) {
      deleteEnvKey(env, key)
      const value = getProcessEnvValue(key)

      if (value) {
        env[key] = value
      }
    }

    env.ComSpec = getWindowsShellPath()
  }

  return env
}

function deleteEnvKey(env: NodeJS.ProcessEnv, key: string) {
  for (const envKey of Object.keys(env)) {
    if (envKey.toLowerCase() === key.toLowerCase()) {
      delete env[envKey]
    }
  }
}

function getProcessEnvValue(key: string) {
  return (
    process.env[key] ??
    Object.entries(process.env).find(
      ([envKey]) => envKey.toLowerCase() === key.toLowerCase()
    )?.[1]
  )
}

function getWindowsShellPath() {
  return (
    getProcessEnvValue("ComSpec") ??
    path.join(
      getProcessEnvValue("SystemRoot") ?? "C:\\Windows",
      "System32",
      "cmd.exe"
    )
  )
}

function killProcessTree(child: ChildProcessWithoutNullStreams) {
  return new Promise<void>((resolve) => {
    if (!child.pid || child.killed) {
      resolve()
      return
    }

    if (os.platform() === "win32") {
      const killer = spawn(
        "taskkill",
        ["/pid", String(child.pid), "/t", "/f"],
        {
          windowsHide: true,
        }
      )

      killer.on("close", () => resolve())
      killer.on("error", () => {
        child.kill()
        resolve()
      })
      return
    }

    child.kill("SIGTERM")
    resolve()
  })
}
