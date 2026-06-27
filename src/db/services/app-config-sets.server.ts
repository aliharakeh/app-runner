import "@tanstack/react-start/server-only"

import { and, asc, eq, sql } from "drizzle-orm"

import { db, ensureDatabaseSchema } from "../client.server"
import { appConfigSets } from "../schema"
import type { NewAppConfigSet } from "../schema"

export async function createAppConfigSet(
  input: Pick<NewAppConfigSet, "appId" | "setName">
) {
  ensureDatabaseSchema()

  return db
    .insert(appConfigSets)
    .values(input)
    .onConflictDoUpdate({
      target: [appConfigSets.appId, appConfigSets.setName],
      set: {
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    })
    .returning()
    .get()
}

export async function listAppConfigSets(appId: number) {
  ensureDatabaseSchema()

  return db.query.appConfigSets.findMany({
    where: eq(appConfigSets.appId, appId),
    orderBy: [asc(appConfigSets.setName)],
  })
}

export async function deleteAppConfigSet(appId: number, setName: string) {
  ensureDatabaseSchema()

  return db
    .delete(appConfigSets)
    .where(
      and(eq(appConfigSets.appId, appId), eq(appConfigSets.setName, setName))
    )
    .returning()
    .all()
}
