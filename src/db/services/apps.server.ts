import "@tanstack/react-start/server-only"

import { asc, eq, sql } from "drizzle-orm"

import { normalizeAppPathLocation } from "@/server/app-paths.server"
import { deleteTemplateBackup } from "@/server/template-backups.server"

import { db, ensureDatabaseSchema } from "../client.server"
import {
  appConfigSets,
  apps,
  runConfigs,
  templateConfigs,
  variableConfigs,
} from "../schema"
import type { NewApp } from "../schema"

export async function createApp(
  input: Pick<NewApp, "workspaceId" | "name" | "pathLocation">
) {
  ensureDatabaseSchema()

  const app = db
    .insert(apps)
    .values({
      ...input,
      pathLocation: normalizeAppPathLocation(input.pathLocation),
    })
    .returning()
    .get()

  db.insert(appConfigSets)
    .values({
      appId: app.id,
      setName: "default",
    })
    .onConflictDoNothing()
    .run()

  return app
}

export async function listApps(workspaceId: number) {
  ensureDatabaseSchema()

  const workspaceApps = await db.query.apps.findMany({
    where: eq(apps.workspaceId, workspaceId),
    orderBy: [asc(apps.name)],
    with: {
      variableConfigs: {
        orderBy: [
          asc(variableConfigs.setName),
          asc(variableConfigs.position),
          asc(variableConfigs.name),
        ],
      },
      configSets: {
        orderBy: [asc(appConfigSets.setName)],
      },
      templateConfigs: {
        orderBy: [
          asc(templateConfigs.setName),
          asc(templateConfigs.position),
          asc(templateConfigs.filePath),
        ],
      },
      runConfigs: {
        orderBy: [asc(runConfigs.setName)],
      },
    },
  })

  return workspaceApps.map(withActiveRunConfig)
}

export async function getApp(id: number) {
  ensureDatabaseSchema()

  const app = await db.query.apps.findFirst({
    where: eq(apps.id, id),
    with: {
      workspace: true,
      variableConfigs: {
        orderBy: [
          asc(variableConfigs.setName),
          asc(variableConfigs.position),
          asc(variableConfigs.name),
        ],
      },
      configSets: true,
      templateConfigs: {
        orderBy: [
          asc(templateConfigs.setName),
          asc(templateConfigs.position),
          asc(templateConfigs.filePath),
        ],
      },
      runConfigs: true,
    },
  })

  return app ? withActiveRunConfig(app) : app
}

export async function updateApp(
  id: number,
  input: Partial<
    Pick<NewApp, "workspaceId" | "name" | "pathLocation" | "activeVariableSet">
  >
) {
  ensureDatabaseSchema()
  const pathLocation =
    input.pathLocation === undefined
      ? undefined
      : normalizeAppPathLocation(input.pathLocation)

  const app = db
    .update(apps)
    .set({
      ...input,
      pathLocation,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(apps.id, id))
    .returning()
    .get()

  return app
}

export async function deleteApp(id: number) {
  ensureDatabaseSchema()

  const existingApp = await getApp(id)
  const app = db.delete(apps).where(eq(apps.id, id)).returning().get()

  if (existingApp) {
    await deleteTemplateBackup({
      appName: existingApp.name,
      workspaceName: existingApp.workspace.name,
    })
  }

  return app
}

export async function createAppWithConfig(input: {
  workspaceId: number
  name: string
  pathLocation: string
  variables?: Array<{ name: string; value: string }>
  templates?: Array<{ filePath: string; templateContent: string }>
  runCommand?: string
}) {
  ensureDatabaseSchema()
  const pathLocation = normalizeAppPathLocation(input.pathLocation)

  return db.transaction((transaction) => {
    const app = transaction
      .insert(apps)
      .values({
        workspaceId: input.workspaceId,
        name: input.name,
        pathLocation,
      })
      .returning()
      .get()

    transaction.insert(appConfigSets).values({
      appId: app.id,
      setName: "default",
    })

    if (input.variables?.length) {
      transaction.insert(variableConfigs).values(
        input.variables.map((variable, position) => ({
          appId: app.id,
          setName: "default",
          name: variable.name,
          position,
          value: variable.value,
        }))
      )
    }

    if (input.templates?.length) {
      transaction.insert(templateConfigs).values(
        input.templates.map((template, position) => ({
          appId: app.id,
          setName: "default",
          filePath: template.filePath,
          position,
          templateContent: template.templateContent,
        }))
      )
    }

    if (input.runCommand) {
      transaction.insert(runConfigs).values({
        appId: app.id,
        setName: "default",
        command: input.runCommand,
      })
    }

    return app
  })
}

function withActiveRunConfig<
  TApp extends {
    activeVariableSet: string
    runConfigs: Array<{ setName: string }>
  },
>(app: TApp) {
  const activeSet = app.activeVariableSet || "default"

  return {
    ...app,
    runConfig:
      app.runConfigs.find((runConfig) => runConfig.setName === activeSet) ??
      null,
  }
}
