import { relations, sql } from "drizzle-orm"
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

export const workspaces = sqliteTable("workspaces", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export const apps = sqliteTable("apps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  pathLocation: text("path_location").notNull(),
  activeVariableSet: text("active_variable_set").notNull().default("default"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export const variableConfigs = sqliteTable("variable_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),
  setName: text("set_name").notNull().default("default"),
  name: text("name").notNull(),
  value: text("value").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export const appConfigSets = sqliteTable(
  "app_config_sets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    appId: integer("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    setName: text("set_name").notNull().default("default"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("app_config_sets_app_set_name_unique").on(
      table.appId,
      table.setName
    ),
  ]
)

export const templateConfigs = sqliteTable("template_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),
  setName: text("set_name").notNull().default("default"),
  filePath: text("file_path").notNull(),
  templateContent: text("template_content").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export const runConfigs = sqliteTable(
  "run_configs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    appId: integer("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    setName: text("set_name").notNull().default("default"),
    command: text("command").notNull(),
    lastRunPid: integer("last_run_pid"),
    lastRunStatus: text("last_run_status"),
    lastRunStdout: text("last_run_stdout").notNull().default(""),
    lastRunStderr: text("last_run_stderr").notNull().default(""),
    lastRunStartedAt: text("last_run_started_at"),
    lastRunStoppedAt: text("last_run_stopped_at"),
    lastRunExitCode: integer("last_run_exit_code"),
    lastRunSignal: text("last_run_signal"),
    lastRunError: text("last_run_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("run_configs_app_set_name_unique").on(
      table.appId,
      table.setName
    ),
  ]
)

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  apps: many(apps),
}))

export const appsRelations = relations(apps, ({ many, one }) => ({
  workspace: one(workspaces, {
    fields: [apps.workspaceId],
    references: [workspaces.id],
  }),
  variableConfigs: many(variableConfigs),
  configSets: many(appConfigSets),
  templateConfigs: many(templateConfigs),
  runConfigs: many(runConfigs),
}))

export const variableConfigsRelations = relations(
  variableConfigs,
  ({ one }) => ({
    app: one(apps, {
      fields: [variableConfigs.appId],
      references: [apps.id],
    }),
  })
)

export const appConfigSetsRelations = relations(appConfigSets, ({ one }) => ({
  app: one(apps, {
    fields: [appConfigSets.appId],
    references: [apps.id],
  }),
}))

export const templateConfigsRelations = relations(
  templateConfigs,
  ({ one }) => ({
    app: one(apps, {
      fields: [templateConfigs.appId],
      references: [apps.id],
    }),
  })
)

export const runConfigsRelations = relations(runConfigs, ({ one }) => ({
  app: one(apps, {
    fields: [runConfigs.appId],
    references: [apps.id],
  }),
}))

export type Workspace = typeof workspaces.$inferSelect
export type NewWorkspace = typeof workspaces.$inferInsert
export type App = typeof apps.$inferSelect
export type NewApp = typeof apps.$inferInsert
export type AppConfigSet = typeof appConfigSets.$inferSelect
export type NewAppConfigSet = typeof appConfigSets.$inferInsert
export type VariableConfig = typeof variableConfigs.$inferSelect
export type NewVariableConfig = typeof variableConfigs.$inferInsert
export type TemplateConfig = typeof templateConfigs.$inferSelect
export type NewTemplateConfig = typeof templateConfigs.$inferInsert
export type RunConfig = typeof runConfigs.$inferSelect
export type NewRunConfig = typeof runConfigs.$inferInsert
