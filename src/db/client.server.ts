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
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS template_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      template_content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS run_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      command TEXT NOT NULL,
      last_run_pid INTEGER,
      last_run_status TEXT,
      last_run_stdout TEXT NOT NULL DEFAULT '',
      last_run_stderr TEXT NOT NULL DEFAULT '',
      last_run_started_at TEXT,
      last_run_stopped_at TEXT,
      last_run_exit_code INTEGER,
      last_run_signal TEXT,
      last_run_error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS run_configs_app_id_unique
      ON run_configs(app_id);
  `)

  ensureColumn("apps", "active_variable_set", "TEXT NOT NULL DEFAULT 'default'")
  ensureColumn(
    "variable_configs",
    "set_name",
    "TEXT NOT NULL DEFAULT 'default'"
  )
  ensureColumn("run_configs", "last_run_pid", "INTEGER")
  ensureColumn("run_configs", "last_run_status", "TEXT")
  ensureColumn("run_configs", "last_run_stdout", "TEXT NOT NULL DEFAULT ''")
  ensureColumn("run_configs", "last_run_stderr", "TEXT NOT NULL DEFAULT ''")
  ensureColumn("run_configs", "last_run_started_at", "TEXT")
  ensureColumn("run_configs", "last_run_stopped_at", "TEXT")
  ensureColumn("run_configs", "last_run_exit_code", "INTEGER")
  ensureColumn("run_configs", "last_run_signal", "TEXT")
  ensureColumn("run_configs", "last_run_error", "TEXT")

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
