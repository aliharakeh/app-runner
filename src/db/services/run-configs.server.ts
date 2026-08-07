import "@tanstack/react-start/server-only"

import { and, asc, eq, sql } from "drizzle-orm"

import { db, ensureDatabaseSchema } from "../client.server"
import type { NewRunConfig } from "../schema"
import { runConfigCommands, runConfigs } from "../schema"

export type RunMode = "sequential" | "parallel"

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
    with: {
      commands: {
        orderBy: [asc(runConfigCommands.position)],
      },
    },
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
  input: {
    setName: string
    mode: RunMode
    commands: Array<string>
  }
) {
  ensureDatabaseSchema()

  const commands = input.commands
    .map((command) => command.trim())
    .filter(Boolean)
  const primaryCommand = commands[0] ?? ""

  const runConfig = db.transaction((transaction) => {
    const config = transaction
      .insert(runConfigs)
      .values({
        appId,
        setName: input.setName,
        command: primaryCommand,
        mode: input.mode,
      })
      .onConflictDoUpdate({
        target: [runConfigs.appId, runConfigs.setName],
        set: {
          command: primaryCommand,
          mode: input.mode,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .returning()
      .get()

    transaction
      .delete(runConfigCommands)
      .where(eq(runConfigCommands.runConfigId, config.id))
      .run()

    if (commands.length) {
      transaction
        .insert(runConfigCommands)
        .values(
          commands.map((command, position) => ({
            runConfigId: config.id,
            command,
            position,
          }))
        )
        .run()
    }

    return config
  })

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
