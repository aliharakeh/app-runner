import "@tanstack/react-start/server-only"

import { and, asc, eq, sql } from "drizzle-orm"

import { db, ensureDatabaseSchema } from "../client.server"
import {
  appConfigSets,
  runConfigs,
  templateConfigs,
  variableConfigs,
} from "../schema"
import type { NewAppConfigSet } from "../schema"

type ConfigConflictChoice = "source" | "target"

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

export async function createAppConfigSetFromSet(input: {
  appId: number
  setName: string
  sourceSetName: string
  copyVariables: boolean
  copyTemplates: boolean
  copyRunConfig: boolean
  variableConflictChoices: Array<{
    name: string
    choice: ConfigConflictChoice
  }>
  templateConflictChoices: Array<{
    filePath: string
    choice: ConfigConflictChoice
  }>
}) {
  ensureDatabaseSchema()

  if (input.setName === input.sourceSetName) {
    throw new Error("Source and target config sets must be different")
  }

  return db.transaction((transaction) => {
    const configSet = transaction
      .insert(appConfigSets)
      .values({ appId: input.appId, setName: input.setName })
      .onConflictDoUpdate({
        target: [appConfigSets.appId, appConfigSets.setName],
        set: {
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .returning()
      .get()

    let variables = 0
    let templates = 0
    let runConfig = 0

    if (input.copyVariables) {
      const variableConflictChoices = new Map(
        input.variableConflictChoices.map((conflict) => [
          conflict.name,
          conflict.choice,
        ])
      )
      const sourceVariables = transaction
        .select({
          name: variableConfigs.name,
          position: variableConfigs.position,
          value: variableConfigs.value,
        })
        .from(variableConfigs)
        .where(
          and(
            eq(variableConfigs.appId, input.appId),
            eq(variableConfigs.setName, input.sourceSetName)
          )
        )
        .orderBy(asc(variableConfigs.position), asc(variableConfigs.name))
        .all()
      const targetVariables = transaction
        .select({ name: variableConfigs.name })
        .from(variableConfigs)
        .where(
          and(
            eq(variableConfigs.appId, input.appId),
            eq(variableConfigs.setName, input.setName)
          )
        )
        .all()
      const targetVariableNames = new Set(
        targetVariables.map((variable) => variable.name)
      )
      const overwrittenVariables = new Set<string>()
      const variablesToCopy = sourceVariables.filter((variable) => {
        if (!targetVariableNames.has(variable.name)) {
          return true
        }

        return variableConflictChoices.get(variable.name) === "source"
      })

      for (const variable of variablesToCopy) {
        if (
          targetVariableNames.has(variable.name) &&
          !overwrittenVariables.has(variable.name)
        ) {
          transaction
            .delete(variableConfigs)
            .where(
              and(
                eq(variableConfigs.appId, input.appId),
                eq(variableConfigs.setName, input.setName),
                eq(variableConfigs.name, variable.name)
              )
            )
            .run()
          overwrittenVariables.add(variable.name)
        }
      }

      if (variablesToCopy.length) {
        transaction
          .insert(variableConfigs)
          .values(
            variablesToCopy.map((variable) => ({
              appId: input.appId,
              setName: input.setName,
              name: variable.name,
              position: variable.position,
              value: variable.value,
            }))
          )
          .run()
      }

      variables = variablesToCopy.length
    }

    if (input.copyTemplates) {
      const templateConflictChoices = new Map(
        input.templateConflictChoices.map((conflict) => [
          conflict.filePath,
          conflict.choice,
        ])
      )
      const sourceTemplates = transaction
        .select({
          filePath: templateConfigs.filePath,
          position: templateConfigs.position,
          templateContent: templateConfigs.templateContent,
        })
        .from(templateConfigs)
        .where(
          and(
            eq(templateConfigs.appId, input.appId),
            eq(templateConfigs.setName, input.sourceSetName)
          )
        )
        .orderBy(asc(templateConfigs.position), asc(templateConfigs.filePath))
        .all()
      const targetTemplates = transaction
        .select({ filePath: templateConfigs.filePath })
        .from(templateConfigs)
        .where(
          and(
            eq(templateConfigs.appId, input.appId),
            eq(templateConfigs.setName, input.setName)
          )
        )
        .all()
      const targetTemplatePaths = new Set(
        targetTemplates.map((template) => template.filePath)
      )
      const overwrittenTemplates = new Set<string>()
      const templatesToCopy = sourceTemplates.filter((template) => {
        if (!targetTemplatePaths.has(template.filePath)) {
          return true
        }

        return templateConflictChoices.get(template.filePath) === "source"
      })

      for (const template of templatesToCopy) {
        if (
          targetTemplatePaths.has(template.filePath) &&
          !overwrittenTemplates.has(template.filePath)
        ) {
          transaction
            .delete(templateConfigs)
            .where(
              and(
                eq(templateConfigs.appId, input.appId),
                eq(templateConfigs.setName, input.setName),
                eq(templateConfigs.filePath, template.filePath)
              )
            )
            .run()
          overwrittenTemplates.add(template.filePath)
        }
      }

      if (templatesToCopy.length) {
        transaction
          .insert(templateConfigs)
          .values(
            templatesToCopy.map((template) => ({
              appId: input.appId,
              setName: input.setName,
              filePath: template.filePath,
              position: template.position,
              templateContent: template.templateContent,
            }))
          )
          .run()
      }

      templates = templatesToCopy.length
    }

    if (input.copyRunConfig) {
      const sourceRunConfig = transaction
        .select({ command: runConfigs.command })
        .from(runConfigs)
        .where(
          and(
            eq(runConfigs.appId, input.appId),
            eq(runConfigs.setName, input.sourceSetName)
          )
        )
        .get()

      if (sourceRunConfig) {
        transaction
          .insert(runConfigs)
          .values({
            appId: input.appId,
            setName: input.setName,
            command: sourceRunConfig.command,
          })
          .onConflictDoUpdate({
            target: [runConfigs.appId, runConfigs.setName],
            set: {
              command: sourceRunConfig.command,
              updatedAt: sql`CURRENT_TIMESTAMP`,
            },
          })
          .run()
        runConfig = 1
      }
    }

    return { configSet, variables, templates, runConfig }
  })
}
