import "@tanstack/react-start/server-only"

import fs from "node:fs"
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
