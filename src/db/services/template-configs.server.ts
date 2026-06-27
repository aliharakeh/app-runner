import "@tanstack/react-start/server-only"

import { and, asc, eq, sql } from "drizzle-orm"

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

  const templateConfig = db
    .insert(templateConfigs)
    .values(input)
    .returning()
    .get()
  return templateConfig
}

export async function listTemplateConfigs(appId: number) {
  ensureDatabaseSchema()

  return db.query.templateConfigs.findMany({
    where: eq(templateConfigs.appId, appId),
    orderBy: [asc(templateConfigs.setName), asc(templateConfigs.filePath)],
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
