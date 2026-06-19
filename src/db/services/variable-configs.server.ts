import "@tanstack/react-start/server-only"

import { asc, eq, sql } from "drizzle-orm"

import { db, ensureDatabaseSchema } from "../client.server"
import { variableConfigs } from "../schema"
import type { NewVariableConfig } from "../schema"

export async function createVariableConfig(
  input: Pick<NewVariableConfig, "appId" | "name" | "value">
) {
  ensureDatabaseSchema()

  const variableConfig = db
    .insert(variableConfigs)
    .values(input)
    .returning()
    .get()
  return variableConfig
}

export async function listVariableConfigs(appId: number) {
  ensureDatabaseSchema()

  return db.query.variableConfigs.findMany({
    where: eq(variableConfigs.appId, appId),
    orderBy: [asc(variableConfigs.name)],
  })
}

export async function getVariableConfig(id: number) {
  ensureDatabaseSchema()

  return db.query.variableConfigs.findFirst({
    where: eq(variableConfigs.id, id),
  })
}

export async function updateVariableConfig(
  id: number,
  input: Partial<Pick<NewVariableConfig, "appId" | "name" | "value">>
) {
  ensureDatabaseSchema()

  const variableConfig = db
    .update(variableConfigs)
    .set({
      ...input,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(variableConfigs.id, id))
    .returning()
    .get()

  return variableConfig
}

export async function deleteVariableConfig(id: number) {
  ensureDatabaseSchema()

  const variableConfig = db
    .delete(variableConfigs)
    .where(eq(variableConfigs.id, id))
    .returning()
    .get()

  return variableConfig
}
