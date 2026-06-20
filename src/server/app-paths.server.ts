import "@tanstack/react-start/server-only"

import fs from "node:fs"
import path from "node:path"

const IGNORED_FILE_DIRS = new Set([
  ".git",
  ".next",
  "build",
  "dist",
  "node_modules",
])

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

  collectFiles(root, root, files)

  return files.sort((left, right) => left.localeCompare(right))
}

function collectFiles(root: string, currentPath: string, files: Array<string>) {
  for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_FILE_DIRS.has(entry.name)) {
      continue
    }

    const entryPath = path.join(currentPath, entry.name)

    if (entry.isDirectory()) {
      collectFiles(root, entryPath, files)
      continue
    }

    if (entry.isFile()) {
      files.push(path.relative(root, entryPath))
    }
  }
}
