import "@tanstack/react-start/server-only"

import fs from "node:fs"
import path from "node:path"

export function getTemplateBackupRoot(input: {
  appName: string
  workspaceName: string
}) {
  return path.join(
    process.cwd(),
    "data",
    "template-backups",
    safePathPart(input.workspaceName),
    safePathPart(input.appName)
  )
}

export async function deleteTemplateBackup(input: {
  appName: string
  workspaceName: string
}) {
  await fs.promises.rm(getTemplateBackupRoot(input), {
    recursive: true,
    force: true,
  })
}

function safePathPart(value: string) {
  const cleaned = [...value]
    .map((character) =>
      character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character)
        ? "_"
        : character
    )
    .join("")
    .trim()

  return cleaned || "unnamed"
}
