import "@tanstack/react-start/server-only"

import { asc, eq, sql } from "drizzle-orm"

import { db, ensureDatabaseSchema } from "../client.server"
import {
  appConfigSets,
  apps,
  runConfigs,
  templateConfigs,
  variableConfigs,
  workspaces,
} from "../schema"
import type { NewWorkspace } from "../schema"

export type WorkspaceWithApps = Awaited<
  ReturnType<typeof listWorkspaces>
>[number]

export async function createWorkspace(input: Pick<NewWorkspace, "name">) {
  ensureDatabaseSchema()

  const workspace = db
    .insert(workspaces)
    .values({ name: input.name.trim() })
    .returning()
    .get()

  return workspace
}

export async function listWorkspaces() {
  ensureDatabaseSchema()

  const workspaceRows = await db.query.workspaces.findMany({
    orderBy: [asc(workspaces.name)],
    with: {
      apps: {
        orderBy: [asc(apps.name)],
        with: {
          variableConfigs: {
            orderBy: [asc(variableConfigs.setName), asc(variableConfigs.name)],
          },
          configSets: {
            orderBy: [asc(appConfigSets.setName)],
          },
          templateConfigs: {
            orderBy: [
              asc(templateConfigs.setName),
              asc(templateConfigs.filePath),
            ],
          },
          runConfigs: {
            orderBy: [asc(runConfigs.setName)],
          },
        },
      },
    },
  })

  return workspaceRows.map(withActiveAppRunConfigs)
}

export async function getWorkspace(id: number) {
  ensureDatabaseSchema()

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, id),
    with: {
      apps: {
        orderBy: [asc(apps.name)],
        with: {
          variableConfigs: {
            orderBy: [asc(variableConfigs.setName), asc(variableConfigs.name)],
          },
          configSets: {
            orderBy: [asc(appConfigSets.setName)],
          },
          templateConfigs: {
            orderBy: [
              asc(templateConfigs.setName),
              asc(templateConfigs.filePath),
            ],
          },
          runConfigs: {
            orderBy: [asc(runConfigs.setName)],
          },
        },
      },
    },
  })

  return workspace ? withActiveAppRunConfigs(workspace) : workspace
}

export async function updateWorkspace(
  id: number,
  input: Partial<Pick<NewWorkspace, "name">>
) {
  ensureDatabaseSchema()

  const workspace = db
    .update(workspaces)
    .set({
      ...input,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(workspaces.id, id))
    .returning()
    .get()

  return workspace
}

export async function deleteWorkspace(id: number) {
  ensureDatabaseSchema()

  const workspace = db
    .delete(workspaces)
    .where(eq(workspaces.id, id))
    .returning()
    .get()

  return workspace
}

function withActiveAppRunConfigs<
  TWorkspace extends {
    apps: Array<{
      activeVariableSet: string
      runConfigs: Array<{ setName: string }>
    }>
  },
>(workspace: TWorkspace) {
  return {
    ...workspace,
    apps: workspace.apps.map((app) => {
      const activeSet = app.activeVariableSet || "default"

      return {
        ...app,
        runConfig:
          app.runConfigs.find((runConfig) => runConfig.setName === activeSet) ??
          null,
      }
    }),
  }
}
