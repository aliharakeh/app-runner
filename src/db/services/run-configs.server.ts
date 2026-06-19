import "@tanstack/react-start/server-only"

import { eq, sql } from "drizzle-orm"

import { db, ensureDatabaseSchema } from "../client.server"
import { runConfigs } from "../schema"
import type { NewRunConfig } from "../schema"

export async function createRunConfig(
  input: Pick<NewRunConfig, "appId" | "command">
) {
  ensureDatabaseSchema()

  const runConfig = db.insert(runConfigs).values(input).returning().get()
  return runConfig
}

export async function getRunConfig(id: number) {
  ensureDatabaseSchema()

  return db.query.runConfigs.findFirst({
    where: eq(runConfigs.id, id),
  })
}

export async function getRunConfigForApp(appId: number) {
  ensureDatabaseSchema()

  return db.query.runConfigs.findFirst({
    where: eq(runConfigs.appId, appId),
  })
}

export async function updateRunConfig(
  id: number,
  input: Partial<Pick<NewRunConfig, "appId" | "command">>
) {
  ensureDatabaseSchema()

  const runConfig = db
    .update(runConfigs)
    .set({
      ...input,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(runConfigs.id, id))
    .returning()
    .get()

  return runConfig
}

export async function upsertRunConfigForApp(
  appId: number,
  input: Pick<NewRunConfig, "command">
) {
  ensureDatabaseSchema()

  const runConfig = db
    .insert(runConfigs)
    .values({ appId, command: input.command })
    .onConflictDoUpdate({
      target: runConfigs.appId,
      set: {
        command: input.command,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    })
    .returning()
    .get()

  return runConfig
}

export async function deleteRunConfig(id: number) {
  ensureDatabaseSchema()

  const runConfig = db
    .delete(runConfigs)
    .where(eq(runConfigs.id, id))
    .returning()
    .get()

  return runConfig
}
