import "@tanstack/react-start/server-only"

import { and, asc, desc, eq, sql } from "drizzle-orm"

import { db, ensureDatabaseSchema } from "../client.server"
import { templateConfigs } from "../schema"
import type { NewTemplateConfig } from "../schema"

export async function createTemplateConfig(
  input: Pick<
    NewTemplateConfig,
    "appId" | "setName" | "filePath" | "templateContent"
  >
) {
  ensureDatabaseSchema()
  const setName = input.setName ?? "default"
  const position = getNextTemplatePosition(input.appId, setName)

  const templateConfig = db
    .insert(templateConfigs)
    .values({ ...input, setName, position })
    .returning()
    .get()
  return templateConfig
}

export async function listTemplateConfigs(appId: number) {
  ensureDatabaseSchema()

  return db.query.templateConfigs.findMany({
    where: eq(templateConfigs.appId, appId),
    orderBy: [
      asc(templateConfigs.setName),
      asc(templateConfigs.position),
      asc(templateConfigs.filePath),
    ],
  })
}

export async function getTemplateConfig(id: number) {
  ensureDatabaseSchema()

  return db.query.templateConfigs.findFirst({
    where: eq(templateConfigs.id, id),
  })
}

export async function updateTemplateConfig(
  id: number,
  input: Partial<
    Pick<
      NewTemplateConfig,
      "appId" | "setName" | "filePath" | "templateContent"
    >
  >
) {
  ensureDatabaseSchema()

  const templateConfig = db
    .update(templateConfigs)
    .set({
      ...input,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(templateConfigs.id, id))
    .returning()
    .get()

  return templateConfig
}

export async function deleteTemplateSet(appId: number, setName: string) {
  ensureDatabaseSchema()

  return db
    .delete(templateConfigs)
    .where(
      and(
        eq(templateConfigs.appId, appId),
        eq(templateConfigs.setName, setName)
      )
    )
    .returning()
    .all()
}

export async function deleteTemplateConfig(id: number) {
  ensureDatabaseSchema()

  const templateConfig = db
    .delete(templateConfigs)
    .where(eq(templateConfigs.id, id))
    .returning()
    .get()

  return templateConfig
}

export async function reorderTemplateConfigs(input: {
  appId: number
  setName: string
  orderedIds: Array<number>
}) {
  ensureDatabaseSchema()

  return db.transaction((transaction) => {
    const templates = transaction
      .select({ id: templateConfigs.id })
      .from(templateConfigs)
      .where(
        and(
          eq(templateConfigs.appId, input.appId),
          eq(templateConfigs.setName, input.setName)
        )
      )
      .all()
    const existingIds = new Set(templates.map((template) => template.id))
    const orderedIds = new Set(input.orderedIds)

    if (
      orderedIds.size !== input.orderedIds.length ||
      existingIds.size !== input.orderedIds.length ||
      input.orderedIds.some((id) => !existingIds.has(id))
    ) {
      throw new Error("Template list changed. Reload and try again.")
    }

    input.orderedIds.forEach((id, position) => {
      transaction
        .update(templateConfigs)
        .set({ position, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(templateConfigs.id, id))
        .run()
    })

    return input.orderedIds
  })
}

function getNextTemplatePosition(appId: number, setName: string) {
  const lastTemplate = db
    .select({ position: templateConfigs.position })
    .from(templateConfigs)
    .where(
      and(
        eq(templateConfigs.appId, appId),
        eq(templateConfigs.setName, setName)
      )
    )
    .orderBy(desc(templateConfigs.position))
    .limit(1)
    .get()

  return (lastTemplate?.position ?? -1) + 1
}
