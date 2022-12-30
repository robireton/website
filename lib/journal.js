import process from 'node:process'
import { parse, format } from 'node:path'
import { rmSync, existsSync } from 'node:fs'
import Database from 'better-sqlite3'
import { datetag } from '@robireton/chrono'
import config from './config.js'
import { log } from './logging.js'
import { ensureDirSync } from './tools.js'

const types = {
  now: "INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))",
  textNull: 'TEXT DEFAULT NULL'
}

class JournalDB extends Database {
  constructor (drop = false) {
    const dbPath = parse(config.journal.db)
    ensureDirSync(dbPath.dir)
    delete dbPath.root
    delete dbPath.base
    dbPath.name = `${dbPath.name}.${datetag()}`
    const dbFilePath = format(dbPath)
    if (drop) rmSync(dbFilePath)
    const dbExists = existsSync(dbFilePath)
    log(`opening sqlite database at ${dbFilePath}`, 'startup', 'journal')
    super(dbFilePath)
    if (!dbExists) this.init()
    process.on('exit', this.shutdown.bind(this))
  }

  init () {
    this.prepare(`CREATE TABLE IF NOT EXISTS "events" ("time" ${types.now}, "source" ${types.textNull}, "context" ${types.textNull}, "event" ${types.textNull}, "details" ${types.textNull})`).run()
    this.prepare('CREATE INDEX IF NOT EXISTS "event_source" ON "events" ("source")').run()
  }

  shutdown (code) {
    log(`closing sqlite database at ${this.name}`, `exit(${code})`, 'journal')
    this.close()
  }
}

const db = new JournalDB()
const insertEntry = db.prepare('INSERT INTO "events" ("source", "context", "event", "details") VALUES (:source, :context, :event, :details)')

export function write (source, context = null, event = null, details = null) {
  try {
    if (config.debug) console.log(`${source}\t${context}\t${event}`)
    insertEntry.run({
      source,
      context,
      event,
      details: details !== null ? JSON.stringify(details) : null
    })
  } catch (err) {
    console.error(err)
  }
}

if (config.debug) write('Journal', 'debug', 'config', config)
