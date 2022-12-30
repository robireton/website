import process from 'node:process'
import { dirname } from 'node:path'
import { rmSync, existsSync } from 'node:fs'
import Database from 'better-sqlite3'
import config from '../config.js'
import { log } from '../logging.js'
import { ensureDirSync } from '../tools.js'

class VariablesDB extends Database {
  constructor (drop = false) {
    ensureDirSync(dirname(config.variables.db))
    if (drop) {
      rmSync(config.variables.db)
    }
    const dbExists = existsSync(config.variables.db)
    log(`opening sqlite database at ${config.variables.db}`, 'startup', 'users')
    super(config.variables.db)
    this.pragma('foreign_keys = ON')
    if (!dbExists) this.init()
    process.on('exit', this.shutdown.bind(this))
  }

  init () {
    this.prepare('CREATE TABLE IF NOT EXISTS "variables" ("name" TEXT NOT NULL UNIQUE COLLATE NOCASE, "value" TEXT DEFAULT NULL, PRIMARY KEY("name"))').run()
  }

  shutdown (code) {
    log(`closing sqlite database at ${this.name}`, `exit(${code})`, 'variables')
    this.close()
  }
}

const db = new VariablesDB()
const upsertVariable = db.prepare('INSERT INTO "variables" ("name", "value") VALUES (:name, :value) ON CONFLICT("name") DO UPDATE SET "value" = excluded.value')
const pluckVariable = db.prepare('SELECT "value" FROM "variables" WHERE "name" = ?').pluck(true)

export function getVariable (name) {
  const value = pluckVariable.get(name)
  return typeof value === 'string' ? JSON.parse(value) : value
}

export function setVariable (name, value) {
  return upsertVariable.run({ name, value: JSON.stringify(value) })
}
