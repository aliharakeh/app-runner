import "@tanstack/react-start/server-only"

import { and, asc, desc, eq, sql } from "drizzle-orm"

import { db, ensureDatabaseSchema } from "../client.server"
import { variableConfigs } from "../schema"
import type { NewVariableConfig } from "../schema"

export async function createVariableConfig(
  input: Pick<NewVariableConfig, "appId" | "setName" | "name" | "value">
) {
  ensureDatabaseSchema()
  const setName = input.setName ?? "default"
  const position = getNextVariablePosition(input.appId, setName)

  const variableConfig = db
    .insert(variableConfigs)
    .values({ ...input, setName, position })
    .returning()
    .get()
  return variableConfig
}

export async function listVariableConfigs(appId: number) {
  ensureDatabaseSchema()

  return db.query.variableConfigs.findMany({
    where: eq(variableConfigs.appId, appId),
    orderBy: [
      asc(variableConfigs.setName),
      asc(variableConfigs.position),
      asc(variableConfigs.name),
    ],
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
  input: Partial<
    Pick<NewVariableConfig, "appId" | "setName" | "name" | "value">
  >
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

export async function deleteVariableSet(appId: number, setName: string) {
  ensureDatabaseSchema()

  return db
    .delete(variableConfigs)
    .where(
      and(
        eq(variableConfigs.appId, appId),
        eq(variableConfigs.setName, setName)
      )
    )
    .returning()
    .all()
}

export async function reorderVariableConfigs(input: {
  appId: number
  setName: string
  orderedIds: Array<number>
}) {
  ensureDatabaseSchema()

  return db.transaction((transaction) => {
    const variables = transaction
      .select({ id: variableConfigs.id })
      .from(variableConfigs)
      .where(
        and(
          eq(variableConfigs.appId, input.appId),
          eq(variableConfigs.setName, input.setName)
        )
      )
      .all()
    const existingIds = new Set(variables.map((variable) => variable.id))
    const orderedIds = new Set(input.orderedIds)

    if (
      orderedIds.size !== input.orderedIds.length ||
      existingIds.size !== input.orderedIds.length ||
      input.orderedIds.some((id) => !existingIds.has(id))
    ) {
      throw new Error("Variable list changed. Reload and try again.")
    }

    input.orderedIds.forEach((id, position) => {
      transaction
        .update(variableConfigs)
        .set({ position, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(variableConfigs.id, id))
        .run()
    })

    return input.orderedIds
  })
}

function getNextVariablePosition(appId: number, setName: string) {
  const lastVariable = db
    .select({ position: variableConfigs.position })
    .from(variableConfigs)
    .where(
      and(
        eq(variableConfigs.appId, appId),
        eq(variableConfigs.setName, setName)
      )
    )
    .orderBy(desc(variableConfigs.position))
    .limit(1)
    .get()

  return (lastVariable?.position ?? -1) + 1
}
