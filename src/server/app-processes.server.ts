import "@tanstack/react-start/server-only"

import { spawn } from "node:child_process"
import type { ChildProcessWithoutNullStreams } from "node:child_process"
import os from "node:os"

import { getApp } from "@/db/services/apps.server"
import { saveRunConfigLastRun } from "@/db/services/run-configs.server"

const MAX_LOG_LENGTH = 20_000

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

  const child = spawn(command, {
    cwd: app.pathLocation,
    env: {
      ...process.env,
      ...Object.fromEntries(
        app.variableConfigs.map((variable) => [variable.name, variable.value])
      ),
    },
    shell: true,
    windowsHide: true,
  })

  const record: AppProcessRecord = {
    appId,
    command,
    pid: child.pid ?? null,
    process: child,
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
    record.status = record.requestedStop ? "stopped" : "error"
    record.error = error.message
    record.stoppedAt = new Date().toISOString()
    record.process = null
    void persistLastRun(record)
  })

  child.on("exit", (code, signal) => {
    record.status = record.requestedStop
      ? "stopped"
      : code === 0
        ? "exited"
        : "error"
    record.exitCode = code
    record.signal = signal
    record.stoppedAt = new Date().toISOString()
    record.process = null
    void persistLastRun(record)
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
  record.status = "stopped"
  record.stoppedAt = new Date().toISOString()
  record.process = null
  await persistLastRun(record)

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
