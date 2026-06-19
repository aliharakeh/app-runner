import "@tanstack/react-start/server-only"

import { asc, eq, sql } from "drizzle-orm"

import { db, ensureDatabaseSchema } from "../client.server"
import { apps, templateConfigs, variableConfigs, workspaces } from "../schema"
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

  return db.query.workspaces.findMany({
    orderBy: [asc(workspaces.name)],
    with: {
      apps: {
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
      },
    },
  })
}

export async function getWorkspace(id: number) {
  ensureDatabaseSchema()

  return db.query.workspaces.findFirst({
    where: eq(workspaces.id, id),
    with: {
      apps: {
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
      },
    },
  })
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
