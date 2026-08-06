import "@tanstack/react-start/server-only"

import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import ignore from "ignore"

export function normalizeAppPathLocation(pathLocation: string) {
  const normalizedPath = path.resolve(pathLocation)

  validateAppPathLocation(normalizedPath)

  return normalizedPath
}

export function validateAppPathLocation(pathLocation: string) {
  let stats: fs.Stats

  try {
    stats = fs.statSync(pathLocation)
  } catch {
    throw new Error(`App path does not exist: ${pathLocation}`)
  }

  if (!stats.isDirectory()) {
    throw new Error(`App path is not a directory: ${pathLocation}`)
  }
}

export function listAppPathFiles(pathLocation: string) {
  const root = normalizeAppPathLocation(pathLocation)
  const files: Array<string> = []
  const ignoresDirectory = createGitignoreDirectoryMatcher(root)

  collectFiles(root, root, files, ignoresDirectory)

  return files.sort((left, right) => left.localeCompare(right))
}

function createGitignoreDirectoryMatcher(root: string) {
  const gitignorePath = path.join(root, ".gitignore")

  if (!fs.existsSync(gitignorePath)) {
    return () => false
  }

  const matcher = ignore().add(fs.readFileSync(gitignorePath, "utf8"))

  return (relativePath: string) => {
    const normalizedPath = toGitignorePath(relativePath)

    return (
      matcher.ignores(normalizedPath) || matcher.ignores(`${normalizedPath}/`)
    )
  }
}

function collectFiles(
  root: string,
  currentPath: string,
  files: Array<string>,
  ignoresDirectory: (relativePath: string) => boolean
) {
  for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
    const entryPath = path.join(currentPath, entry.name)
    const relativePath = path.relative(root, entryPath)

    if (entry.isDirectory()) {
      if (ignoresDirectory(relativePath)) {
        continue
      }

      collectFiles(root, entryPath, files, ignoresDirectory)
      continue
    }

    if (entry.isFile()) {
      files.push(relativePath)
    }
  }
}

function toGitignorePath(filePath: string) {
  return filePath.split(path.sep).join("/")
}

export async function pickFolder(initialPath?: string): Promise<string | null> {
  const platform = os.platform()

  if (platform === "win32") {
    return pickFolderWindows(initialPath)
  }

  if (platform === "darwin") {
    return pickFolderMac()
  }

  return pickFolderLinux()
}

async function pickFolderWindows(initialPath?: string): Promise<string | null> {
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$browser = New-Object System.Windows.Forms.FolderBrowserDialog",
    "$browser.Description = 'Select app folder'",
    "$browser.UseDescriptionForTitle = $true",
    "$initial = $env:APP_RUNNER_INITIAL_PATH",
    "if ($initial) { $browser.SelectedPath = $initial }",
    "$result = $browser.ShowDialog()",
    "if ($result -eq [System.Windows.Forms.DialogResult]::OK) {",
    "  [Console]::Out.Write($browser.SelectedPath)",
    "}",
  ].join("; ")

  return runDialogCommand(
    "powershell",
    [
      "-NoProfile",
      "-STA",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script,
    ],
    initialPath ? { APP_RUNNER_INITIAL_PATH: initialPath } : undefined
  )
}

async function pickFolderMac(): Promise<string | null> {
  return runDialogCommand("osascript", [
    "-e",
    'POSIX path of (choose folder with prompt "Select app folder")',
  ])
}

async function pickFolderLinux(): Promise<string | null> {
  try {
    return await runDialogCommand("zenity", [
      "--file-selection",
      "--directory",
      "--title=Select app folder",
    ])
  } catch (error) {
    if (!isCommandNotFoundError(error)) {
      throw error
    }
  }

  try {
    return await runDialogCommand("kdialog", [
      "--getexistingdirectory",
      ".",
      "--title",
      "Select app folder",
    ])
  } catch (error) {
    if (isCommandNotFoundError(error)) {
      throw new Error(
        "No folder picker found. Install zenity or kdialog to browse for folders on Linux."
      )
    }

    throw error
  }
}

function runDialogCommand(
  command: string,
  args: Array<string>,
  extraEnv?: Record<string, string>
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString()
    })

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    child.on("error", reject)

    child.on("close", (code) => {
      const result = stdout.trim()

      if (code === 0 && result) {
        resolve(result)
        return
      }

      if (!result) {
        resolve(null)
        return
      }

      reject(
        new Error(
          stderr.trim() ||
            `Folder picker failed with exit code ${code ?? "unknown"}`
        )
      )
    })
  })
}

function isCommandNotFoundError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  )
}
