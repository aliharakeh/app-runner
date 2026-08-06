import "@tanstack/react-start/server-only"

import Handlebars from "handlebars"
import type { ChildProcessWithoutNullStreams } from "node:child_process"
import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { getApp } from "@/db/services/apps.server"
import { validateAppPathLocation } from "@/server/app-paths.server"
import {
  notifyAppProcessUpdate,
  scheduleAppProcessLogUpdate,
} from "@/server/app-process-events.server"
import { getTemplateBackupRoot } from "@/server/template-backups.server"

const MAX_LOG_LENGTH = 20_000
const WINDOWS_SHELL_ENV_KEYS = ["ComSpec", "SystemRoot", "WINDIR"] as const

type AppProcessStatus = "running" | "stopped" | "exited" | "error"

export type AppProcessChildSnapshot = {
  command: string
  pid: number | null
  status: AppProcessStatus
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
  status: AppProcessStatus
  stdout: string
  stderr: string
  startedAt: string | null
  stoppedAt: string | null
  exitCode: number | null
  signal: string | null
  error: string | null
  processes: Array<AppProcessChildSnapshot>
}

type ChildEntry = {
  command: string
  process: ChildProcessWithoutNullStreams | null
  pid: number | null
  status: AppProcessStatus
  stdout: string
  stderr: string
  exitCode: number | null
  signal: string | null
  error: string | null
}

type AppProcessRecord = {
  appId: number
  mode: "series" | "parallel"
  commands: Array<string>
  children: Array<ChildEntry>
  mappedFiles: Array<{ backupPath: string; targetPath: string }>
  requestedStop: boolean
  setName: string
  startedAt: string
  stoppedAt: string | null
  finishPromise: Promise<void> | null
}

const processes = new Map<number, AppProcessRecord>()

export async function startAppProcess(appId: number) {
  const existing = processes.get(appId)

  if (existing && getRecordStatus(existing) === "running") {
    return toSnapshot(existing)
  }

  const app = await getApp(appId)

  if (!app) {
    throw new Error("App not found")
  }

  const activeSet = getActiveSetName(app)
  const runConfig = getActiveRunConfig(app)
  const rawCommands = getRunCommands(runConfig)

  if (!rawCommands.length) {
    throw new Error("Run command is not configured")
  }

  validateAppPathLocation(app.pathLocation)

  const mode = runConfig?.mode === "parallel" ? "parallel" : "series"
  const variableConfigs = getActiveVariableConfigs(app)
  const commands = rawCommands.map((command) =>
    renderCommandWithVariables(command, variableConfigs)
  )
  const env = buildProcessEnv(variableConfigs)
  const mappedFiles = applyTemplateFiles(app)

  const record: AppProcessRecord = {
    appId,
    mode,
    commands,
    children: [],
    mappedFiles,
    requestedStop: false,
    setName: activeSet,
    startedAt: new Date().toISOString(),
    stoppedAt: null,
    finishPromise: null,
  }

  processes.set(appId, record)

  if (mode === "parallel") {
    for (const command of commands) {
      spawnChild(record, command, env, app.pathLocation)
    }
  } else {
    spawnChild(record, commands[0], env, app.pathLocation)
  }

  notifyAppProcessUpdate(appId)

  return toSnapshot(record)
}

export async function stopAppProcess(appId: number) {
  const record = processes.get(appId)

  if (!record || getRecordStatus(record) !== "running") {
    return getAppProcessStatus(appId)
  }

  record.requestedStop = true
  await Promise.all(
    record.children
      .filter((child) => child.process && child.status === "running")
      .map((child) => killProcessTree(child.process!))
  )
  await finishRecord(record)

  notifyAppProcessUpdate(appId)

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

function spawnChild(
  record: AppProcessRecord,
  command: string,
  env: NodeJS.ProcessEnv,
  cwd: string
) {
  const child = spawn(command, {
    cwd,
    env,
    shell: os.platform() === "win32" ? getWindowsShellPath() : true,
    windowsHide: true,
  })

  const entry: ChildEntry = {
    command,
    process: child,
    pid: child.pid ?? null,
    status: "running",
    stdout: "",
    stderr: "",
    exitCode: null,
    signal: null,
    error: null,
  }

  record.children.push(entry)
  notifyAppProcessUpdate(record.appId)

  child.stdout.on("data", (chunk: Buffer) => {
    entry.stdout = appendLog(entry.stdout, chunk.toString())
    scheduleAppProcessLogUpdate(record.appId)
  })

  child.stderr.on("data", (chunk: Buffer) => {
    entry.stderr = appendLog(entry.stderr, chunk.toString())
    scheduleAppProcessLogUpdate(record.appId)
  })

  child.on("error", (error) => {
    entry.error = error.message
    entry.status = record.requestedStop ? "stopped" : "error"
    entry.process = null
    notifyAppProcessUpdate(record.appId)
    void onChildFinished(record, entry)
  })

  child.on("exit", (code, signal) => {
    entry.exitCode = code
    entry.signal = signal
    entry.status = record.requestedStop
      ? "stopped"
      : code === 0
        ? "exited"
        : "error"
    entry.process = null
    notifyAppProcessUpdate(record.appId)
    void onChildFinished(record, entry)
  })

  return entry
}

async function onChildFinished(record: AppProcessRecord, entry: ChildEntry) {
  if (record.requestedStop) {
    if (record.children.every((child) => child.status !== "running")) {
      await finishRecord(record)
    }
    return
  }

  if (entry.status === "error") {
    // A command failed: stop any remaining children and finish as error.
    record.requestedStop = true
    await Promise.all(
      record.children
        .filter((child) => child.process && child.status === "running")
        .map((child) => killProcessTree(child.process!))
    )
    await finishRecord(record)
    return
  }

  if (record.mode === "series") {
    const nextIndex = record.children.length
    if (nextIndex < record.commands.length) {
      const app = await getApp(record.appId)
      if (!app) {
        await finishRecord(record)
        return
      }
      const variableConfigs = getActiveVariableConfigs(app)
      const env = buildProcessEnv(variableConfigs)
      // record.commands already hold rendered commands.
      spawnChild(record, record.commands[nextIndex], env, app.pathLocation)
      return
    }
  }

  if (record.children.every((child) => child.status !== "running")) {
    await finishRecord(record)
  }
}

function getRecordStatus(record: AppProcessRecord): AppProcessStatus {
  if (record.children.some((child) => child.status === "running")) {
    return "running"
  }

  if (!record.stoppedAt) {
    // Spawned but no children yet (shouldn't normally happen).
    return "running"
  }

  if (record.children.some((child) => child.status === "error")) {
    return "error"
  }

  if (record.requestedStop) {
    return "stopped"
  }

  return "exited"
}

function appendLog(current: string, next: string) {
  const value = `${current}${next}`

  if (value.length <= MAX_LOG_LENGTH) {
    return value
  }

  return value.slice(value.length - MAX_LOG_LENGTH)
}

async function finishRecord(record: AppProcessRecord) {
  if (!record.finishPromise) {
    record.finishPromise = finishRecordOnce(record)
  }

  await record.finishPromise
}

async function finishRecordOnce(record: AppProcessRecord) {
  record.stoppedAt = new Date().toISOString()

  try {
    await rollbackTemplateFiles(record.mappedFiles)
  } catch (error) {
    const message = getErrorMessage(error)
    const target = record.children.at(-1)
    if (target) {
      target.status = "error"
      target.error = appendError(target.error, message)
    }
  }

  notifyAppProcessUpdate(record.appId)
}

function toSnapshot(record: AppProcessRecord): AppProcessSnapshot {
  const status = getRecordStatus(record)
  const runningChild = record.children.find(
    (child) => child.status === "running"
  )
  const firstError = record.children.find((child) => child.status === "error")
  const lastChild = record.children.at(-1)
  const firstChild = record.children.at(0)

  return {
    appId: record.appId,
    command: record.commands.join(record.mode === "parallel" ? " & " : " && "),
    pid: runningChild?.pid ?? firstChild?.pid ?? null,
    status,
    stdout: record.children.map((child) => child.stdout).join(""),
    stderr: record.children.map((child) => child.stderr).join(""),
    startedAt: record.startedAt,
    stoppedAt: record.stoppedAt,
    exitCode: firstError?.exitCode ?? lastChild?.exitCode ?? null,
    signal: firstError?.signal ?? lastChild?.signal ?? null,
    error: firstError?.error ?? null,
    processes: record.children.map((child) => ({
      command: child.command,
      pid: child.pid,
      status: child.status,
      stdout: child.stdout,
      stderr: child.stderr,
      exitCode: child.exitCode,
      signal: child.signal,
      error: child.error,
    })),
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
    processes: [],
  }
}

function getRunCommands(
  runConfig:
    | ({
        command: string
        mode?: string
        commands?: Array<{ command: string }>
      } | null)
    | undefined
) {
  if (!runConfig) {
    return []
  }

  const fromChildren = (runConfig.commands ?? [])
    .map((child) => child.command.trim())
    .filter(Boolean)

  if (fromChildren.length) {
    return fromChildren
  }

  const fallback = runConfig.command.trim()
  return fallback ? [fallback] : []
}

function applyTemplateFiles(
  app: NonNullable<Awaited<ReturnType<typeof getApp>>>
) {
  const templateConfigs = getActiveTemplateConfigs(app)

  if (!templateConfigs.length) {
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

  for (const template of templateConfigs) {
    const targetPath = resolveInside(
      app.pathLocation,
      Handlebars.compile(template.filePath, { noEscape: true })(values)
    )
    const relativePath = path.relative(app.pathLocation, targetPath)
    const backupPath = path.join(backupRoot, path.basename(targetPath))
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
  const activeSet = getActiveSetName(app)
  return app.variableConfigs.filter(
    (variable) => variable.setName === activeSet
  )
}

function getActiveTemplateConfigs(
  app: NonNullable<Awaited<ReturnType<typeof getApp>>>
) {
  const activeSet = getActiveSetName(app)
  return app.templateConfigs.filter(
    (template) => template.setName === activeSet
  )
}

function getActiveRunConfig(
  app: NonNullable<Awaited<ReturnType<typeof getApp>>>
) {
  const activeSet = getActiveSetName(app)
  return (
    app.runConfigs.find((runConfig) => runConfig.setName === activeSet) ?? null
  )
}

function getActiveSetName(app: { activeVariableSet: string }) {
  return app.activeVariableSet || "default"
}

function renderCommandWithVariables(
  command: string,
  variables: Array<{ name: string; value: string }>
) {
  const values = Object.fromEntries(
    variables.map((variable) => [variable.name, variable.value])
  )

  return Handlebars.compile(command, { noEscape: true })(values)
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
