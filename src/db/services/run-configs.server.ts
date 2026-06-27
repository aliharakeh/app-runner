import "@tanstack/react-start/server-only"

import { and, eq, sql } from "drizzle-orm"

import { db, ensureDatabaseSchema } from "../client.server"
import { runConfigs } from "../schema"
import type { NewRunConfig } from "../schema"

export async function createRunConfig(
  input: Pick<NewRunConfig, "appId" | "setName" | "command">
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

export async function getRunConfigForApp(appId: number, setName = "default") {
  ensureDatabaseSchema()

  return db.query.runConfigs.findFirst({
    where: and(eq(runConfigs.appId, appId), eq(runConfigs.setName, setName)),
  })
}

export async function updateRunConfig(
  id: number,
  input: Partial<Pick<NewRunConfig, "appId" | "setName" | "command">>
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
  input: Pick<NewRunConfig, "setName" | "command">
) {
  ensureDatabaseSchema()

  const runConfig = db
    .insert(runConfigs)
    .values({ appId, setName: input.setName, command: input.command })
    .onConflictDoUpdate({
      target: [runConfigs.appId, runConfigs.setName],
      set: {
        command: input.command,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    })
    .returning()
    .get()

  return runConfig
}

export async function saveRunConfigLastRun(
  appId: number,
  setName: string,
  input: Pick<
    NewRunConfig,
    | "lastRunPid"
    | "lastRunStatus"
    | "lastRunStdout"
    | "lastRunStderr"
    | "lastRunStartedAt"
    | "lastRunStoppedAt"
    | "lastRunExitCode"
    | "lastRunSignal"
    | "lastRunError"
  >
) {
  ensureDatabaseSchema()

  const runConfig = db
    .update(runConfigs)
    .set({
      ...input,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(and(eq(runConfigs.appId, appId), eq(runConfigs.setName, setName)))
    .returning()
    .get()

  return runConfig
}

export async function deleteRunConfigForSet(appId: number, setName: string) {
  ensureDatabaseSchema()

  return db
    .delete(runConfigs)
    .where(and(eq(runConfigs.appId, appId), eq(runConfigs.setName, setName)))
    .returning()
    .all()
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
