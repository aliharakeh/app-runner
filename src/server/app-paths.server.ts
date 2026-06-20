import "@tanstack/react-start/server-only"

import fs from "node:fs"
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
