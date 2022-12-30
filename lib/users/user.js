import { v4 as uuid, NIL as systemID } from 'uuid'
import { dateFromUnix, unixTime } from '@robireton/chrono'
import config from '../config.js'
import { text } from '../tools.js'
import * as journal from '../journal.js'
import * as data from './data.js'
import { Account } from './account.js'

export class User {
  constructor (params = {}) {
    if (config.debug) console.log(`new User(${JSON.stringify(params)})`)
    if (params === null) throw new Error('can’t create User from null')
    if (typeof params === 'string' && params.length > 0) params = { id: params }
    if (!('id' in params)) {
      params.id = createUserID()
      journal.write('Users', 'constructor', 'creating User', params)
      data.users.add({
        id: params.id,
        login: params.login || null,
        access: params.access || null,
        disabled: null,
        last_ip: params.ip || null,
        last_ua: params.ua || null
      })

      if ('email' in params && params.email.address) {
        params.email.address = text(params.email.address)
        data.emails.add(params.id, params.email.address, true, params.subscribed ? unixTime() : null)
        if ('readonly' in params.email) data.emails.setReadonly(params.email.address, params.email.readonly)
        if ('verified' in params.email) params.email.verified ? data.emails.setVerified(params.email.address) : data.emails.clearVerified(params.email.address)
      }

      if ('name' in params && params.name.given && params.name.family) {
        params.name.sort = sortName(params.name.given, params.name.additional, params.name.family)
        params.name.custom = params.name.custom ? 1 : 0
        if (!params.name.nickname) params.name.nickname = params.name.given
        if (!params.name.full || !params.name.custom) params.name.full = fullName(params.name.prefix, params.name.given, params.name.additional, params.name.family, params.name.suffix)
        if (!params.name.prefix) params.name.prefix = null
        if (!params.name.additional) params.name.additional = null
        if (!params.name.suffix) params.name.suffix = null
        if (!params.name.subjective) params.name.subjective = 'they'
        if (!params.name.objective) params.name.objective = 'them'
        if (!params.name.possessive) params.name.possessive = 'theirs'
        data.names.add(params.id, params.name)
      }

      data.profiles.add({
        user: params.id,
        title: params.title || null
      })
    }

    if ('id' in params) {
      this.meta = data.users.get(params.id)
      if (!this.meta) throw new Error(`unknown user id: ‘${params.id}’`)
      this.deserialize()
    } else {
      throw new Error('can’t instantiate User object')
    }
  }

  get id () {
    return this.meta.id
  }

  get created () {
    return dateFromUnix(this.meta.created)
  }

  get login () {
    return dateFromUnix(this.meta.login)
  }

  get access () {
    return dateFromUnix(this.meta.access)
  }

  get disabled () {
    return dateFromUnix(this.meta.disabled)
  }

  set disabled (disabled) {
    disabled = disabled ? unixTime() : null
    if (Boolean(disabled) !== Boolean(this.meta.disabled)) {
      journal.write('Users', this._name.full, `setting disabled to ${Boolean(disabled)}`, this.meta)
      this.meta.disabled = disabled
      data.users.disabled({ id: this.meta.id, option: this.meta.disabled })
    }
  }

  get last () {
    return {
      login: dateFromUnix(this.meta.login),
      access: dateFromUnix(this.meta.access),
      ip: this.meta.last_ip,
      ua: this.meta.last_ua
    }
  }

  get email () {
    return this._emails.length > 0
      ? {
          address: this._emails[0].address,
          primary: Boolean(this._emails[0].primary),
          readonly: Boolean(this._emails[0].readonly),
          created: dateFromUnix(this._emails[0].created),
          updated: dateFromUnix(this._emails[0].updated),
          verified: dateFromUnix(this._emails[0].verified),
          bounced: dateFromUnix(this._emails[0].bounced),
          subscribed: dateFromUnix(this._emails[0].subscribed)
        }
      : null
  }

  set email (address) {
    const source = text(address)
    if (source) {
      this.setEmail({
        address: source.toLowerCase(),
        primary: true
      })
      journal.write('Users', this._name.full, `set primary email to “${source.toLowerCase()}”`, this.meta)
      this._emails = data.emails.user(this.meta.id)
    }
  }

  get emails () {
    return this._emails.map(email => ({
      address: email.address,
      primary: Boolean(email.primary),
      readonly: Boolean(email.readonly),
      created: dateFromUnix(email.created),
      updated: dateFromUnix(email.updated),
      verified: dateFromUnix(email.verified),
      bounced: dateFromUnix(email.bounced),
      subscribed: dateFromUnix(email.subscribed)
    }))
  }

  set emails (emails) {
    for (const email of emails) {
      email.address = text(email.address)
      if (typeof email.address === 'string') email.address = email.address.toLowerCase()
    }
    const target = new Map(this._emails.map(email => [email.address, email]))
    const source = new Map(emails.map(email => [email.address, email]))
    const toDelete = []
    const toModify = []
    for (const [address, email] of target) {
      if (!source.has(address)) {
        journal.write('Users', this._name.full, `deleting email ${address}`, this._emails)
        toDelete.push(email)
      }
    }
    for (const [address, email] of source) {
      if (target.has(address)) {
        if (Boolean(target.get(address).primary) !== email.primary || Boolean(target.get(address).subscribed) !== email.subscribed) {
          journal.write('Users', this._name.full, `updating email ${address}`, this._emails)
          toModify.push(email)
        }
      } else {
        journal.write('Users', this._name.full, `adding email ${address}`, this._emails)
        toModify.push(email)
      }
    }
    for (const email of toModify) {
      this.setEmail({
        address: email.address,
        primary: Boolean('primary' in email && email.primary),
        subscribed: Boolean('subscribed' in email && email.subscribed)
      })
    }
    if (this._emails.length - toDelete.length > 0) { // don't delete the last email address
      for (const email of toDelete) {
        data.emails.delete(email.address)
      }
      this._emails = data.emails.user(this.meta.id)
      if (!this._emails.some(email => email.primary)) this.setEmail({ address: this._emails[0].address, primary: true })
    }
    this._emails = data.emails.user(this.meta.id)
  }

  get name () {
    return this._name
  }

  set name (name) {
    name.given = text(name.given)
    name.family = text(name.family)
    if (name.given !== null && name.family !== null) {
      name.prefix = text(name.prefix)
      name.additional = text(name.additional)
      name.suffix = text(name.suffix)
      name.nickname = text(name.nickname)
      name.full = text(name.full)
      name.sort = sortName(name.given, name.additional, name.family)
      name.custom = name.custom ? 1 : 0
      name.subjective = text(name.subjective)
      name.objective = text(name.objective)
      name.possessive = text(name.possessive)
      if (!name.nickname) name.nickname = name.given
      if (!name.full || !name.custom) name.full = fullName(name.prefix, name.given, name.additional, name.family, name.suffix)
      if (typeof name.subjective === 'string') name.subjective = name.subjective.toLowerCase().replaceAll(/[^a-z]/g, '')
      if (!name.subjective) name.subjective = 'they'
      if (typeof name.objective === 'string') name.objective = name.objective.toLowerCase().replaceAll(/[^a-z]/g, '')
      if (!name.objective) name.objective = 'them'
      if (typeof name.possessive === 'string') name.possessive = name.possessive.toLowerCase().replaceAll(/[^a-z]/g, '')
      if (!name.possessive) name.possessive = 'theirs'
      if (name.prefix !== this._name.prefix || name.given !== this._name.given || name.additional !== this._name.additional || name.family !== this._name.family || name.suffix !== this._name.suffix || name.nickname !== this._name.nickname || name.full !== this._name.full || name.sort !== this._name.sort || name.custom !== this._name.custom || name.subjective !== this._name.subjective || name.objective !== this._name.objective || name.possessive !== this._name.possessive) {
        data.names.add(this.meta.id, name)
        journal.write('Users', this._name.full, `setting name to “${name.full}”`, name)
        this._name = data.names.get(this.meta.id)
      }
    }
  }

  get title () {
    return this.profile ? this.profile.title : null
  }

  set title (title) {
    title = text(title)
    if (title !== this.profile.title) {
      journal.write('Users', this._name.full, title ? (this.profile.title ? `changing title from “${this.profile.title}” to “${title}”` : `setting title to “${title}”`) : `deleting title “${this.profile.title}”`, this.profile)
      this.profile.title = title
      data.profiles.setTitle(this.meta.id, title)
    }
  }

  // https://orcid.org
  get orcid () {
    return 'orcid' in this._identifiers ? this._identifiers.orcid : null
  }

  set orcid (orcid) {
    const source = text(orcid)
    if (source && source !== this._identifiers.orcid) {
      journal.write('Users', this._name.full, this._identifiers.orcid ? `changing orcid from ${this._identifiers.orcid} to “${source}”` : `set orcid to “${source}”`, this._identifiers)
      data.identifiers.set(this.meta.id, 'orcid', source)
      this._identifiers.orcid = data.identifiers.get(this.meta.id, 'orcid') || null
    } else if (!source && this._identifiers.orcid) {
      journal.write('Users', this._name.full, `deleting orcid “${this._identifiers.orcid}”`, this._identifiers)
      data.identifiers.delete(this.meta.id, 'orcid')
      delete this._identifiers.orcid
    }
  }

  get accounts () {
    const orcid = this._accounts.filter(a => a.source === 'orcid')

    const accounts = {
      orcid: orcid.length === 1 ? orcid[0] : null
    }

    return accounts
  }

  get roles () {
    return this._roles
  }

  set roles (roles) {
    data.roles.deleteUser(this.meta.id)
    roles.forEach(role => data.roles.addUser(this.meta.id, role))
    this._roles = data.roles.get(this.meta.id)
  }

  static roles () {
    return new Map(data.roles.all().map((row) => [row.id, row.name]))
  }

  static search (query) {
    const terms = query.toLowerCase().split(/\W+/)
    const hits = new Set()

    const emails = new Map()
    for (const email of data.emails.all()) {
      if (email.user === systemID) continue
      if (!emails.has(email.user)) emails.set(email.user, [])
      emails.get(email.user).push(email.address)
    }
    for (const [user, addresses] of emails) {
      for (const email of addresses) {
        if (terms.every(term => email.toLowerCase().includes(term))) hits.add(user)
      }
    }

    const names = new Map(data.names.fulls().map(name => [name.user, { full: name.full, sort: name.sort }]))
    for (const [user, name] of names) {
      if (user === systemID) continue
      if (terms.every(term => name.full.toLowerCase().includes(term))) hits.add(user)
    }

    const results = []
    if (hits.size < 256) {
      for (const id of Array.from(hits.values()).sort((a, b) => names.get(a).sort.localeCompare(names.get(b).sort))) {
        results.push({
          value: id,
          text: emails.get(id) ? `${names.get(id).full} <${emails.get(id)[0]}>` : names.get(id).full
        })
      }
    }
    return results
  }

  static find (query = {}) {
    if (config.debug) console.log('User.find(%O)', query)
    const matches = []
    if (query.email) {
      const email = data.emails.get(typeof query.email === 'string' ? query.email : query.email.address)
      if (email) matches.push({ id: email.user, match: email.address, exact: true })
    }

    if (query.name && query.name.family && query.name.given) {
      const names = data.names.matching(query.name.given, query.name.family)
      if (names.length === 1) matches.push({ id: names[0].user, match: names[0], exact: false })
    }

    return matches
  }

  static merge (id1, id2) {
    const m1 = new User(id1)
    const m2 = new User(id2)
    mergeUsers(m1, m2)
    m1.deserialize()
    return m1
  }

  static getDisplayEmail (id) {
    if (!id) return null
    const user = new User(id)
    return `${user.name.full} <${user.email.address}>`
  }

  static getUserName (id) {
    if (!id) return null
    return data.names.get(id)
  }

  static getUserEmail (id) {
    const emails = data.emails.user(id)
    return emails.length > 0 ? emails[0].address : null
  }

  static mayEdit (user, targetID) {
    if (!user) return false
    if (user.id === targetID) return true
    if (user instanceof User && user.hasRole('Administrator')) return true
    return false
  }

  deserialize () {
    this.profile = data.profiles.get(this.meta.id) || { title: null, created: unixTime(), updated: null }
    this._name = data.names.get(this.meta.id) || { prefix: null, given: null, additional: null, family: null, suffix: null, nickname: null, full: null, custom: 0, sort: null, subjective: null, objective: null, possessive: null, created: unixTime(), updated: null }
    this._emails = data.emails.user(this.meta.id)
    this._identifiers = Object.fromEntries(data.identifiers.all(this.meta.id).map(o => [o.type, o.id]))
    this._roles = data.roles.get(this.meta.id)
    this._accounts = Account.search({ user: this.meta.id })
  }

  hasRole (role) {
    return this._roles.includes(role)
  }

  log (ip = null, ua = null) {
    if (ip && ua) {
      data.users.login({
        id: this.meta.id,
        ip,
        ua
      })
    } else {
      data.users.access(this.meta.id)
    }
    this.meta = data.users.get(this.meta.id)
    return this
  }

  addRole (role) {
    data.roles.addUser(this.meta.id, role)
    this._roles = data.roles.get(this.meta.id)
  }

  setEmail (email = {}) {
    const address = text(email.address)
    if (address) {
      try {
        data.emails.set(this.meta.id, address)
      } catch (upsertError) {
        if (upsertError.message === 'UNIQUE constraint failed: emails.address') throw new Error(`email address ‘${address}’ already in use`)
      }
      if ('primary' in email) {
        if (email.primary) {
          data.emails.clearPrimary(this.meta.id)
          data.emails.setPrimary(address)
        } else {
          if (this._emails.length > 1) {
            data.emails.clearPrimary(this.meta.id)
            this._emails = data.emails.user(this.meta.id)
            data.emails.setPrimary(this._emails[0].address)
          }
        }
      }
      if ('readonly' in email) data.emails.setReadonly(address, email.readonly)
      if ('verified' in email) email.verified ? data.emails.setVerified(address) : data.emails.clearVerified(address)
      if ('bounced' in email) email.bounced ? data.emails.setBounced(address) : data.emails.clearBounced(address)
      if ('subscribed' in email) email.subscribed ? data.emails.subscribe(address) : data.emails.unsubscribe(address)

      this._emails = data.emails.user(this.meta.id)
    }
  }

  deleteAccount (source) {
    const accounts = this._accounts.filter(account => account.source === source)
    if (accounts.length === 1) {
      switch (source) {
        case 'orcid':
          data.identifiers.delete(this.meta.id, 'orcid')
          break
      }
      Account.deleteUserSource(this.meta.id, source)
      this._accounts = Account.search({ user: this.meta.id })
    }
  }
}

function createUserID () {
  let id
  do {
    id = uuid()
  } while (data.users.get(id))
  return id
}

function sortName (given, additional, family) {
  return ([family, [given, additional].filter(s => !!s).join(' ')].join(', ')).toLowerCase().replace(/[^a-z, -]+/g, '.')
}

function fullName (prefix, given, additional, family, suffix) {
  if (!given || !family) throw new Error('given name and family name are required')
  const names = []
  if (prefix) names.push(prefix)
  names.push(given)
  if (additional) names.push(additional)
  if (typeof suffix === 'string' && /^[sj]r[.]?$/i.test(suffix)) {
    names.push(`${family}, ${suffix}`)
  } else {
    names.push(family)
    if (suffix) names.push(suffix)
  }
  return names.join(' ')
}

function mergeUsers (target, source) {
  data.db.transaction((t, s) => {
    journal.write('Users', 'merge', `merging ${t.id} <- ${s.id}`, [t, s])
    const user = {
      id: t.meta.id,
      created: Math.min(t.meta.created, s.meta.created),
      login: Math.max(t.meta.login, s.meta.login),
      access: Math.max(t.meta.access, s.meta.access),
      disabled: Math.min(t.meta.disabled, s.meta.disabled),
      last_ip: t.meta.login < s.meta.login ? s.meta.last_ip : t.meta.last_ip,
      last_ua: t.meta.login < s.meta.login ? s.meta.last_ua : t.meta.last_ua
    }
    if (user.login === 0) user.login = null
    if (user.access === 0) user.access = null
    if (user.disabled === 0) user.disabled = null
    data.users.set(user)

    const profile = {
      user: t.meta.id,
      title: t.profile.title || s.profile.title,
      created: Math.min(t.profile.created, s.profile.created)
    }
    data.profiles.set(profile)

    const name = {
      user: t.meta.id,
      prefix: t._name.prefix || s._name.prefix,
      given: t._name.given || s._name.given,
      additional: t._name.additional || s._name.additional,
      family: t._name.family || s._name.family,
      suffix: t._name.suffix || s._name.suffix,
      nickname: t._name.nickname || s._name.nickname,
      subjective: t._name.subjective || s._name.subjective,
      objective: t._name.objective || s._name.objective,
      possessive: t._name.possessive || s._name.possessive,
      custom: t._name.custom || s._name.custom,
      created: Math.min(t._name.created, s._name.created)
    }
    name.full = t._name.custom ? t._name.full : s._name.custom ? s._name.full : fullName(name.prefix, name.given, name.additional, name.family, name.suffix)
    name.sort = sortName(name.given, name.additional, name.family)
    data.names.set(name)

    data.emails.clearPrimary(s.meta.id)
    for (const email of s._emails) {
      data.emails.setUser(email.address, t.meta.id)
    }

    for (const [type, id] of Object.entries(s._identifiers)) {
      if (!(type in t._identifiers)) data.identifiers.setUser(t.meta.id, type, id)
    }

    for (const role of s._roles) {
      if (!(role in t._roles)) data.roles.addUser(t.meta.id, role)
    }

    for (const account of s._accounts) {
      account.assign(t.meta.id)
    }

    data.users.delete(s.meta.id) // depends on ON DELETE CASCADE & SET NULL
  })(target, source)
}
