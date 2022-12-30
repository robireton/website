import config from '../config.js'
import { dateFromUnix } from '@robireton/chrono'
import * as journal from '../journal.js'
import { accounts as db } from './data.js'
import { User } from './user.js'

export class Account {
  constructor (source, id, user = null, data = null, created = null, updated = null) {
    if (config.debug) console.log(`new Account(${source}, ${id}, ${user})`)
    this.source = source
    this.id = id
    this.user = user
    this.data = data
    this.created = created
    this.updated = updated
    if (source && id && !user) {
      const account = db.get({ source, id })
      if (account) {
        this.user = account.user
        this.data = JSON.parse(account.data)
        this.created = dateFromUnix(account.created)
        this.updated = dateFromUnix(account.updated)
      }
    }
    if (source && !id && user) {
      const accounts = db.user(user).filter(account => account.source === source)
      if (accounts.length === 1) {
        this.id = accounts[0].id
        this.data = JSON.parse(accounts[0].data)
        this.created = dateFromUnix(accounts[0].created)
        this.updated = dateFromUnix(accounts[0].updated)
      }
    }
  }

  assign (user = null) {
    db.setUser({ source: this.source, id: this.id, user })
    this.user = user
    journal.write('Users', `Account ${this.source} ${this.id}`, `assigned to ${User.getUserName(user).full}`, user)
  }

  static search (params) {
    const results = []
    if (params.id) {
      for (const row of db.byID(params.id)) {
        results.push(new Account(row.source, row.id, row.user, JSON.parse(row.data), dateFromUnix(row.created), dateFromUnix(row.updated)))
      }
    }

    if (params.user) {
      for (const row of db.user(params.user)) {
        results.push(new Account(row.source, row.id, row.user, JSON.parse(row.data), dateFromUnix(row.created), dateFromUnix(row.updated)))
      }
    }

    return results
  }

  static deleteUserSource (user, source) {
    journal.write('Users', 'Account', `deleting ${source} from ${User.getUserName(user).full}`, user)
    return db.delete({
      user,
      source
    })
  }

  static set (source, id, data, uid = null) {
    db.set({
      source,
      id,
      data: JSON.stringify(data),
      user: uid
    })
    const name = User.getUserName(uid)
    if (name) journal.write('Users', `Account ${source} ${id}`, name ? `setting for ${name.full} (${uid})` : `setting for ${uid}`, data)
    return new Account(source, id)
  }
}
