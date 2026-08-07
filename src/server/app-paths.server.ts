import "@tanstack/react-start/server-only"

import ignore from "ignore"
import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

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

export function toRelativeAppFilePath(
  appPathLocation: string,
  absolutePath: string
) {
  const root = normalizeAppPathLocation(appPathLocation)
  const resolvedPath = path.resolve(absolutePath)
  const relativePath = path.relative(root, resolvedPath)

  if (
    !relativePath ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error("Selected file must be inside the app folder.")
  }

  let stats: fs.Stats

  try {
    stats = fs.statSync(resolvedPath)
  } catch {
    throw new Error(`Selected file does not exist: ${relativePath}`)
  }

  if (!stats.isFile()) {
    throw new Error(`Selected path is not a file: ${relativePath}`)
  }

  return relativePath
}

export async function pickFile(
  appPathLocation: string,
  initialRelativePath?: string
): Promise<string | null> {
  const root = normalizeAppPathLocation(appPathLocation)
  const initialDirectory = initialRelativePath
    ? path.dirname(path.join(root, initialRelativePath))
    : root
  const platform = os.platform()

  if (platform === "win32") {
    return pickFileWindows(initialDirectory)
  }

  if (platform === "darwin") {
    return pickFileMac(initialDirectory)
  }

  return pickFileLinux(initialDirectory)
}

export async function pickAppFolder(initialPath?: string): Promise<string | null> {
  const selected = await pickFolder(initialPath)

  if (!selected) {
    return null
  }

  validateAppPathLocation(selected)

  return selected
}

export async function pickFolder(initialPath?: string): Promise<string | null> {
  const platform = os.platform()

  if (platform === "win32") {
    return pickFolderWindows(initialPath)
  }

  if (platform === "darwin") {
    return pickFolderMac(initialPath)
  }

  return pickFolderLinux(initialPath)
}

async function pickFileWindows(
  initialDirectory: string
): Promise<string | null> {
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$browser = New-Object System.Windows.Forms.OpenFileDialog",
    "$browser.Title = 'Select template file'",
    "$browser.Filter = 'All files (*.*)|*.*'",
    "$initial = $env:APP_RUNNER_INITIAL_PATH",
    "if ($initial) { $browser.InitialDirectory = $initial }",
    "$result = $browser.ShowDialog()",
    "if ($result -eq [System.Windows.Forms.DialogResult]::OK) {",
    "  [Console]::Out.Write($browser.FileName)",
    "}",
  ].join("; ")

  return runDialogCommand(
    "powershell",
    ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-Command", script],
    { APP_RUNNER_INITIAL_PATH: initialDirectory },
    { showWindow: true }
  )
}

async function pickFileMac(initialDirectory: string): Promise<string | null> {
  const escapedDirectory = initialDirectory
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')

  return runDialogCommand("osascript", [
    "-e",
    `POSIX path of (choose file with prompt "Select template file" default location POSIX file "${escapedDirectory}")`,
  ])
}

async function pickFileLinux(initialDirectory: string): Promise<string | null> {
  const filenameArg = `${initialDirectory.replace(/\/$/, "")}/`

  try {
    return await runDialogCommand("zenity", [
      "--file-selection",
      "--title=Select template file",
      `--filename=${filenameArg}`,
    ])
  } catch (error) {
    if (!isCommandNotFoundError(error)) {
      throw error
    }
  }

  try {
    return await runDialogCommand("kdialog", [
      "--getopenfilename",
      initialDirectory,
      "*",
      "--title",
      "Select template file",
    ])
  } catch (error) {
    if (isCommandNotFoundError(error)) {
      throw new Error(
        "No file picker found. Install zenity or kdialog to browse for files on Linux."
      )
    }

    throw error
  }
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
    ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-Command", script],
    initialPath ? { APP_RUNNER_INITIAL_PATH: initialPath } : undefined,
    { showWindow: true }
  )
}

async function pickFolderMac(initialPath?: string): Promise<string | null> {
  if (initialPath) {
    const escapedDirectory = initialPath
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')

    return runDialogCommand("osascript", [
      "-e",
      `POSIX path of (choose folder with prompt "Select app folder" default location POSIX file "${escapedDirectory}")`,
    ])
  }

  return runDialogCommand("osascript", [
    "-e",
    'POSIX path of (choose folder with prompt "Select app folder")',
  ])
}

async function pickFolderLinux(initialPath?: string): Promise<string | null> {
  const filenameArg = initialPath
    ? `${initialPath.replace(/\/$/, "")}/`
    : undefined

  try {
    return await runDialogCommand("zenity", [
      "--file-selection",
      "--directory",
      "--title=Select app folder",
      ...(filenameArg ? [`--filename=${filenameArg}`] : []),
    ])
  } catch (error) {
    if (!isCommandNotFoundError(error)) {
      throw error
    }
  }

  try {
    return await runDialogCommand("kdialog", [
      "--getexistingdirectory",
      initialPath ?? ".",
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
  extraEnv?: Record<string, string>,
  options?: { showWindow?: boolean }
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
      windowsHide: options?.showWindow ? false : true,
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
