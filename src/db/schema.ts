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
  name: text("name").notNull(),
  value: text("value").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export const templateConfigs = sqliteTable("template_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  templateContent: text("template_content").notNull(),
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
    command: text("command").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("run_configs_app_id_unique").on(table.appId)]
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
  templateConfigs: many(templateConfigs),
  runConfig: one(runConfigs),
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
export type VariableConfig = typeof variableConfigs.$inferSelect
export type NewVariableConfig = typeof variableConfigs.$inferInsert
export type TemplateConfig = typeof templateConfigs.$inferSelect
export type NewTemplateConfig = typeof templateConfigs.$inferInsert
export type RunConfig = typeof runConfigs.$inferSelect
export type NewRunConfig = typeof runConfigs.$inferInsert
