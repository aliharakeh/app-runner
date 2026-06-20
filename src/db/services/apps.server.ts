import "@tanstack/react-start/server-only"

import { asc, eq, sql } from "drizzle-orm"

import { normalizeAppPathLocation } from "@/server/app-paths.server"

import { db, ensureDatabaseSchema } from "../client.server"
import { apps, runConfigs, templateConfigs, variableConfigs } from "../schema"
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
  return app
}

export async function listApps(workspaceId: number) {
  ensureDatabaseSchema()

  return db.query.apps.findMany({
    where: eq(apps.workspaceId, workspaceId),
    orderBy: [asc(apps.name)],
    with: {
      variableConfigs: {
        orderBy: [asc(variableConfigs.name)],
      },
      templateConfigs: {
        orderBy: [asc(templateConfigs.name)],
      },
      runConfig: true,
    },
  })
}

export async function getApp(id: number) {
  ensureDatabaseSchema()

  return db.query.apps.findFirst({
    where: eq(apps.id, id),
    with: {
      variableConfigs: true,
      templateConfigs: true,
      runConfig: true,
    },
  })
}

export async function updateApp(
  id: number,
  input: Partial<Pick<NewApp, "workspaceId" | "name" | "pathLocation">>
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

  const app = db.delete(apps).where(eq(apps.id, id)).returning().get()
  return app
}

export async function createAppWithConfig(input: {
  workspaceId: number
  name: string
  pathLocation: string
  variables?: Array<{ name: string; value: string }>
  templates?: Array<{ name: string; templateContent: string }>
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

    if (input.variables?.length) {
      transaction.insert(variableConfigs).values(
        input.variables.map((variable) => ({
          appId: app.id,
          name: variable.name,
          value: variable.value,
        }))
      )
    }

    if (input.templates?.length) {
      transaction.insert(templateConfigs).values(
        input.templates.map((template) => ({
          appId: app.id,
          name: template.name,
          templateContent: template.templateContent,
        }))
      )
    }

    if (input.runCommand) {
      transaction.insert(runConfigs).values({
        appId: app.id,
        command: input.runCommand,
      })
    }

    return app
  })
}
