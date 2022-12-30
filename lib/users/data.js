import { UsersDB } from './database.js'

export const db = new UsersDB()

// accounts table
const deleteAccount = db.prepare('DELETE FROM "accounts" WHERE "source" = :source AND "user" = :user')
const selectUserAccounts = db.prepare('SELECT * FROM "accounts" WHERE "user" = ?')
const selectAccountsById = db.prepare('SELECT * FROM "accounts" WHERE "id" = ?')
const selectSourceAccount = db.prepare('SELECT * FROM "accounts" WHERE "source" = :source AND "id" = :id')
const updateAccountUser = db.prepare('UPDATE "accounts" SET "user" = :user WHERE "source" = :source AND "id" = :id')
const upsertAccount = db.prepare(`INSERT INTO "accounts" ("source", "id", "data", "user") VALUES (:source, :id, :data, :user) ON CONFLICT("source", "id") DO UPDATE SET "data" = excluded.data, "user" = excluded.user, "updated" = ${db.now}`)
const selectSourceAccounts = db.prepare('SELECT * FROM "accounts" WHERE "source" = ?')
export const accounts = {
  user: id => selectUserAccounts.all(id),
  byID: id => selectAccountsById.all(id),
  delete: data => deleteAccount.run(data),
  get: data => selectSourceAccount.get(data),
  set: data => upsertAccount.run(data),
  setUser: data => updateAccountUser.run(data),
  source: source => selectSourceAccounts.all(source)
}

// users table
const deleteUser = db.prepare('DELETE FROM "users" WHERE "id" = ?')
const insertUser = db.prepare('INSERT INTO "users" ("id", "login", "access", "disabled", "last_ip", "last_ua") VALUES (:id, :login, :access, :disabled, :last_ip, :last_ua)')
const selectUser = db.prepare('SELECT * FROM "users" WHERE "id" = ?')
const updateAccess = db.prepare(`UPDATE "users" SET "access" = ${db.now} WHERE id = ?`)
const updateDisabled = db.prepare('UPDATE "users" SET "disabled" = :option WHERE "id" = :id')
const updateLogin = db.prepare(`UPDATE "users" SET "last_ip" = :ip, "last_ua" = :ua, "login" = ${db.now} WHERE id = :id`)
const updateUser = db.prepare('UPDATE "users" SET "created" = :created, "login" = :login, "access" = :access, "disabled" = :disabled, "last_ip" = :last_ip, "last_ua" = :last_ua WHERE "id" = :id')
export const users = {
  access: id => updateAccess.run(id),
  add: user => insertUser.run(user),
  delete: id => deleteUser.run(id),
  disabled: data => updateDisabled.run(data),
  get: id => selectUser.get(id),
  login: data => updateLogin.run(data),
  set: user => updateUser.run(user)
}

// profiles table
const deleteProfile = db.prepare('DELETE FROM "profiles" WHERE "user" = ?')
const insertProfile = db.prepare('INSERT INTO "profiles" ("user", "title") VALUES (:user, :title)')
const selectProfile = db.prepare('SELECT * FROM "profiles" WHERE "user" = ?')
const updateProfile = db.prepare(`UPDATE "profiles" SET "title" = :title, "updated" = ${db.now} WHERE "user" = :user`)
const updateTitle = db.prepare(`UPDATE "profiles" SET "title" = :title, "updated" = ${db.now} WHERE user = :user`)
export const profiles = {
  add: profile => insertProfile.run(profile),
  set: profile => updateProfile.run(profile),
  get: uid => selectProfile.get(uid),
  delete: uid => deleteProfile.run(uid),
  setTitle: (uid, value) => updateTitle.run({ user: uid, title: value })
}

// names table
const deleteName = db.prepare('DELETE FROM "names" WHERE "user" = ?')
const selectFullNames = db.prepare('SELECT "user", "full", "sort" FROM "names"')
const selectMatchingNames = db.prepare('SELECT * FROM "names" WHERE lower("family") = lower(:family) AND lower("given") = lower(:given)')
const selectName = db.prepare('SELECT * FROM "names" WHERE "user" = ?')
const updateName = db.prepare(`UPDATE "names" SET "prefix" = :prefix, "given" = :given, "additional" = :additional, "family" = :family, "suffix" = :suffix, "nickname" = :nickname, "full" = :full, "custom" = :custom, "sort" = :sort, "subjective" = :subjective, "objective" = :objective, "possessive" = :possessive, "updated" = ${db.now} WHERE "user" = :user`)
const upsertName = db.prepare(`INSERT INTO "names" ("user", "prefix", "given", "additional", "family", "suffix", "nickname", "full", "custom", "sort", "subjective", "objective", "possessive") VALUES (:user, :prefix, :given, :additional, :family, :suffix, :nickname, :full, :custom, :sort, :subjective, :objective, :possessive) ON CONFLICT("user") DO UPDATE SET "prefix" = excluded.prefix, "given" = excluded.given, "additional" = excluded.additional, "family" = excluded.family, "suffix" = excluded.suffix, "nickname" = excluded.nickname, "full" = excluded.full, "custom" = excluded.custom, "sort" = excluded.sort, "subjective" = excluded.subjective, "objective" = excluded.objective, "possessive" = excluded.possessive, "updated" = ${db.now}`)
export const names = {
  add: (id, name) => upsertName.run(Object.assign(name, { user: id })),
  delete: id => deleteName.run(id),
  fulls: _ => selectFullNames.all(),
  get: id => selectName.get(id),
  matching: (given, family) => selectMatchingNames.all({ given, family }),
  set: data => updateName.run(data)
}

// emails table
const deleteEmail = db.prepare('DELETE FROM "emails" WHERE "address" = ?')
const insertEmail = db.prepare('INSERT INTO "emails" ("address", "user", "primary", "subscribed") VALUES (:address, :user, :primary, :subscribed)')
const selectEmail = db.prepare('SELECT * FROM "emails" WHERE "address" = ?')
const selectEmailAddresses = db.prepare('SELECT "address", "user" FROM "emails" ORDER BY "user", "primary" DESC, "verified" DESC, "created" ASC, "address" ASC')
const selectUserEmails = db.prepare('SELECT * FROM "emails" WHERE "user" = ? ORDER BY "primary" DESC, "verified" DESC, "created" ASC, "address" ASC')
const updateEmailClearBounced = db.prepare(`UPDATE "emails" SET "bounced" = NULL, "updated" = ${db.now} WHERE "address" = ?`)
const updateEmailClearUserPrimary = db.prepare(`UPDATE "emails" SET "primary" = 0, "updated" = ${db.now} WHERE "user" = ?`)
const updateEmailSubscribed = db.prepare(`UPDATE "emails" SET "subscribed" = ${db.now}, "updated" = ${db.now} WHERE "address" = ?`)
const updateEmailUnsubscribe = db.prepare(`UPDATE "emails" SET "subscribed" = NULL, "updated" = ${db.now} WHERE "address" = ?`)
const updateEmailPrimary = db.prepare(`UPDATE "emails" SET "primary" = :primary, "updated" = ${db.now} WHERE "address" = :address`)
const updateEmailReadonly = db.prepare(`UPDATE "emails" SET "readonly" = :readonly, "updated" = ${db.now} WHERE "address" = :address`)
const updateEmailSetBounced = db.prepare(`UPDATE "emails" SET "bounced" = ${db.now}, "updated" = ${db.now} WHERE "address" = ?`)
const updateEmailUnverified = db.prepare(`UPDATE "emails" SET "verified" = NULL, "updated" = ${db.now} WHERE "address" = ?`)
const updateEmailUser = db.prepare(`UPDATE "emails" SET "user" = :user, "updated" = ${db.now} WHERE "address" = :address`)
const updateEmailVerified = db.prepare(`UPDATE "emails" SET "verified" = ${db.now}, "updated" = ${db.now} WHERE "address" = ?`)
const upsertEmail = db.prepare(`INSERT INTO "emails" ("user", "address") VALUES (:user, :address) ON CONFLICT("user", "address") DO UPDATE SET "updated" = ${db.now}`)
export const emails = {
  add: (uid, address, primary, subscribed) => insertEmail.run({ user: uid, address: address.toLowerCase(), primary: primary ? 1 : 0, subscribed }),
  all: _ => selectEmailAddresses.all(),
  delete: address => deleteEmail.run(address),
  get: address => selectEmail.get(address),
  set: (uid, address) => upsertEmail.run({ user: uid, address: address.toLowerCase() }),
  clearBounced: address => updateEmailClearBounced.run(address),
  clearPrimary: uid => updateEmailClearUserPrimary.run(uid),
  subscribe: address => updateEmailSubscribed.run(address),
  unsubscribe: address => updateEmailUnsubscribe.run(address),
  setPrimary: (address, primary = true) => updateEmailPrimary.run({ address, primary: primary ? 1 : 0 }),
  setReadonly: (address, readonly = true) => updateEmailReadonly.run({ address, readonly: readonly ? 1 : 0 }),
  setBounced: address => updateEmailSetBounced.run(address),
  clearVerified: address => updateEmailUnverified.run(address),
  setUser: (address, uid) => updateEmailUser.run({ address, user: uid }),
  setVerified: address => updateEmailVerified.run(address),
  user: id => selectUserEmails.all(id)
}

// identifiers table
const deleteIdentifier = db.prepare('DELETE FROM "identifiers" WHERE "type" = :type AND "user" = :user')
const deleteUserIdentifiers = db.prepare('DELETE FROM "identifiers" WHERE "user" = ?')
const pluckUserIdentifier = db.prepare('SELECT "id" FROM "identifiers" WHERE "type" = :type AND "user" = :user ORDER BY "updated" DESC, "created" ASC').pluck(true)
const selectIdentifier = db.prepare('SELECT * FROM "identifiers" WHERE "type" = :type AND "id" = :id')
const selectUserIdentifiers = db.prepare('SELECT * FROM "identifiers" WHERE "user" = ?')
const updateIdentifierUser = db.prepare('UPDATE "identifiers" SET "user" = :user WHERE "type" = :type AND "id" = :id')
const upsertIdentifier = db.prepare(`INSERT INTO "identifiers" ("type", "id", "user") VALUES (:type, :id, :user) ON CONFLICT("type", "id", "user") DO UPDATE SET "updated" = ${db.now}`)
export const identifiers = {
  all: id => selectUserIdentifiers.all(id),
  delete: (uid, type) => deleteIdentifier.run({ type, user: uid }),
  deleteUser: uid => deleteUserIdentifiers.run(uid),
  get: (uid, type) => pluckUserIdentifier.get({ type, user: uid }),
  info: (type, id) => selectIdentifier.get({ type, id }),
  set: (uid, type, id) => upsertIdentifier.run({ user: uid, type, id }),
  setUser: (uid, type, id) => updateIdentifierUser.run({ user: uid, type, id })
}

// roles and users_roles tables
const deleteUserRoles = db.prepare('DELETE FROM "users_roles" WHERE "user" = ?')
const insertUserRole = db.prepare('INSERT OR IGNORE INTO "users_roles" ("user", "role") VALUES (:user, (SELECT "id" FROM "roles" WHERE "name" = :role))')
const pluckUserRoles = db.prepare('SELECT r."name" FROM "users_roles" m, "roles" r WHERE r."id" = m."role" AND m."user" = ?').pluck(true)
const selectRoles = db.prepare('SELECT "id", "name" FROM "roles"')
const pluckUsersByRole = db.prepare('SELECT users.id FROM users, users_roles, roles WHERE users.disabled IS NULL AND users.id = users_roles.user AND users_roles.role = roles.id AND roles.name = ?').pluck(true)
export const roles = {
  addUser: (uid, role) => insertUserRole.run({ user: uid, role }),
  all: _ => selectRoles.all(),
  deleteUser: uid => deleteUserRoles.run(uid),
  get: id => pluckUserRoles.all(id),
  users: role => pluckUsersByRole.all(role)
}
