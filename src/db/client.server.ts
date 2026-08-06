import "@tanstack/react-start/server-only"

import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"

import * as schema from "./schema"

const databasePath = resolve(process.cwd(), "data", "app-runner.sqlite")

mkdirSync(dirname(databasePath), { recursive: true })

const sqlite = new Database(databasePath)
sqlite.pragma("foreign_keys = ON")

export const db = drizzle(sqlite, { schema })

let schemaReady = false

export function ensureDatabaseSchema() {
  if (schemaReady) {
    return
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS apps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      path_location TEXT NOT NULL,
      active_variable_set TEXT NOT NULL DEFAULT 'default',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS variable_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      set_name TEXT NOT NULL DEFAULT 'default',
      name TEXT NOT NULL,
      value TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_config_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      set_name TEXT NOT NULL DEFAULT 'default',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS template_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      set_name TEXT NOT NULL DEFAULT 'default',
      file_path TEXT NOT NULL,
      template_content TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS run_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      set_name TEXT NOT NULL DEFAULT 'default',
      command TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'series',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS run_config_commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_config_id INTEGER NOT NULL REFERENCES run_configs(id) ON DELETE CASCADE,
      command TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

  `)

  ensureColumn("apps", "active_variable_set", "TEXT NOT NULL DEFAULT 'default'")
  ensureColumn(
    "variable_configs",
    "set_name",
    "TEXT NOT NULL DEFAULT 'default'"
  )
  ensureColumn("variable_configs", "position", "INTEGER NOT NULL DEFAULT 0")
  ensureColumn(
    "template_configs",
    "set_name",
    "TEXT NOT NULL DEFAULT 'default'"
  )
  ensureColumn("template_configs", "position", "INTEGER NOT NULL DEFAULT 0")
  ensureColumn("run_configs", "set_name", "TEXT NOT NULL DEFAULT 'default'")
  ensureColumn("run_configs", "mode", "TEXT NOT NULL DEFAULT 'series'")

  sqlite.exec(`
    DROP INDEX IF EXISTS run_configs_app_id_unique;

    CREATE UNIQUE INDEX IF NOT EXISTS app_config_sets_app_set_name_unique
      ON app_config_sets(app_id, set_name);

    CREATE UNIQUE INDEX IF NOT EXISTS run_configs_app_set_name_unique
      ON run_configs(app_id, set_name);

    CREATE UNIQUE INDEX IF NOT EXISTS run_config_commands_config_position_unique
      ON run_config_commands(run_config_id, position);

    INSERT OR IGNORE INTO run_config_commands (run_config_id, command, position)
      SELECT id, command, 0
      FROM run_configs
      WHERE command != '';

    INSERT OR IGNORE INTO app_config_sets (app_id, set_name)
      SELECT id, COALESCE(active_variable_set, 'default')
      FROM apps;

    INSERT OR IGNORE INTO app_config_sets (app_id, set_name)
      SELECT id, 'default'
      FROM apps;

    INSERT OR IGNORE INTO app_config_sets (app_id, set_name)
      SELECT app_id, set_name
      FROM variable_configs;

    INSERT OR IGNORE INTO app_config_sets (app_id, set_name)
      SELECT app_id, set_name
      FROM template_configs;

    INSERT OR IGNORE INTO app_config_sets (app_id, set_name)
      SELECT app_id, set_name
      FROM run_configs;
  `)

  schemaReady = true
}

function ensureColumn(
  tableName: string,
  columnName: string,
  definition: string
) {
  const columns = sqlite
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{ name: string }>

  if (columns.some((column) => column.name === columnName)) {
    return
  }

  sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`)
}
