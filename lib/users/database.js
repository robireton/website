import process from 'node:process'
import { dirname } from 'node:path'
import { rmSync, existsSync } from 'node:fs'
import Database from 'better-sqlite3'
import config from '../config.js'
import { log } from '../logging.js'
import { ensureDirSync } from '../tools.js'

const types = {
  now: "INTEGER NOT NULL DEFAULT(strftime('%s', 'now'))",
  uid: 'text COLLATE NOCASE NOT NULL',
  uidNull: 'text COLLATE NOCASE DEFAULT(NULL)',
  text: 'TEXT NOT NULL',
  textKey: 'text PRIMARY KEY COLLATE NOCASE NOT NULL',
  textNull: 'TEXT DEFAULT(NULL)',
  textUnique: 'TEXT NOT NULL UNIQUE',
  int: 'INTEGER NOT NULL',
  int0: 'INTEGER NOT NULL DEFAULT(0)',
  int1: 'INTEGER NOT NULL DEFAULT(1)',
  intNull: 'INTEGER DEFAULT(NULL)'
}

export class UsersDB extends Database {
  constructor (drop = false) {
    ensureDirSync(dirname(config.users.db))
    if (drop) {
      rmSync(config.users.db)
    }
    const dbExists = existsSync(config.users.db)
    log(`opening sqlite database at ${config.users.db}`, 'startup', 'users')
    super(config.users.db)
    this.pragma('foreign_keys = ON')
    if (!dbExists) this.init()
    process.on('exit', this.shutdown.bind(this))
  }

  get now () {
    return "strftime('%s', 'now')"
  }

  init () {
    this.prepare(`CREATE TABLE "users" ("id" ${types.textKey}, "created" ${types.now}, "login" ${types.intNull}, "access" ${types.intNull}, "disabled" ${types.intNull}, "last_ip" ${types.textNull}, "last_ua" ${types.textNull})`).run()
    this.prepare('CREATE INDEX "disabled_users" ON "users" ("disabled")').run()

    this.prepare(`CREATE TABLE "profiles" ("user" ${types.textKey}, "title" ${types.textNull}, "created" ${types.now}, "updated" ${types.intNull}, FOREIGN KEY (user) REFERENCES "users" (id) ON DELETE CASCADE)`).run()
    this.prepare('CREATE INDEX "user_profile" ON "profiles" ("user")').run()

    this.prepare(`CREATE TABLE "names" ("user" ${types.textKey}, "prefix" ${types.textNull}, "given" ${types.text}, "additional" ${types.textNull}, "family" ${types.text}, "suffix" ${types.textNull}, "nickname" ${types.textNull}, "full" ${types.text}, "custom" ${types.int0}, "sort" text COLLATE NOCASE NOT NULL, "subjective" ${types.text} DEFAULT('they'), "objective" ${types.text} DEFAULT('them'), "possessive" ${types.text} DEFAULT('theirs'), "created" ${types.now}, "updated" ${types.intNull}, FOREIGN KEY (user) REFERENCES "users" (id) ON DELETE CASCADE)`).run()
    this.prepare('CREATE INDEX "sort_names" ON "names" ("sort")').run()
    this.prepare('CREATE INDEX "name_updated" ON "names" ("updated")').run()
    this.prepare('CREATE INDEX "name_matches" ON "names" ("given", "family")').run()

    this.prepare(`CREATE TABLE "emails" ("address" ${types.textKey}, "user" ${types.uid}, "primary" ${types.int0}, "readonly" ${types.int0}, "created" ${types.now}, "updated" ${types.intNull}, "verify" ${types.intNull}, "verified" ${types.intNull}, "bounced" ${types.intNull}, "subscribed" ${types.intNull}, "synced" ${types.intNull}, FOREIGN KEY("user") REFERENCES "users"("id") ON DELETE CASCADE)`).run()
    this.prepare('CREATE INDEX "user_emails" ON "emails" ("user")').run()
    this.prepare('CREATE INDEX "email_sort" ON "emails" ("user" ASC, "primary" DESC, "verified" DESC, "created" ASC, "address" ASC)').run()
    this.prepare('CREATE INDEX "email_updated" ON "emails" ("updated")').run()
    this.prepare('CREATE INDEX "email_synced" ON "emails" ("synced")').run()
    this.prepare('CREATE UNIQUE INDEX "user_email" ON "emails" ("address", "user")').run()

    this.prepare(`CREATE TABLE "identifiers" ("type" ${types.text} COLLATE NOCASE, "id" ${types.text} COLLATE NOCASE, "user" ${types.uid}, "created" ${types.now}, "updated" ${types.intNull}, FOREIGN KEY("user") REFERENCES "users"("id") ON DELETE CASCADE, PRIMARY KEY("type", "id"))`).run()
    this.prepare('CREATE INDEX "user_identifier" ON "identifiers" ("type", "user")').run()
    this.prepare('CREATE INDEX "user_identifiers" ON "identifiers" ("user")').run()
    this.prepare('CREATE INDEX "identifiers_sort" ON "identifiers" ("type", "user", "updated" DESC, "created" ASC)').run()
    this.prepare('CREATE UNIQUE INDEX "user_identification" ON "identifiers" ("type", "id", "user")').run()

    this.prepare(`CREATE TABLE "roles" ("id" INTEGER PRIMARY KEY, "name" ${types.textUnique})`).run()
    this.prepare('CREATE INDEX "role_name" ON "roles" ("name")').run()
    this.prepare(`CREATE TABLE "users_roles" ("user" ${types.text} COLLATE NOCASE, "role" ${types.int}, FOREIGN KEY("user") REFERENCES "users"("id") ON DELETE CASCADE, FOREIGN KEY("role") REFERENCES "roles"("id") ON DELETE CASCADE, PRIMARY KEY("user", "role"))`).run()

    this.prepare(`CREATE TABLE "accounts" ("source" ${types.text} COLLATE NOCASE, "id" ${types.text} COLLATE NOCASE, "data" ${types.text}, "user" ${types.uidNull}, "created" ${types.now}, "updated" ${types.intNull}, FOREIGN KEY("user") REFERENCES "users"("id") ON DELETE SET NULL, PRIMARY KEY("source", "id"))`).run()
    this.prepare('CREATE INDEX "account_id" ON "accounts" ("id")').run()
    this.prepare('CREATE INDEX "user_accounts" ON "accounts" ("user")').run()
  }

  shutdown (code) {
    log(`closing sqlite database at ${this.name}`, `exit(${code})`, 'users')
    this.close()
  }
}
