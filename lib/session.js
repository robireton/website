import session from 'express-session'
import Database from 'better-sqlite3'
import bs3ss from 'better-sqlite3-session-store'
import config from './config.js'

const options = {
  name: config.session.name,
  secret: config.session.secret,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: config.session.secure }
}
if (Number.isInteger(config.session.age)) options.cookie.maxAge = config.session.age
if (['none', 'lax', 'strict'].includes(config.session.samesite)) options.cookie.sameSite = config.session.samesite
if (options.cookie.sameSite === 'none') options.cookie.secure = true

if (config.session.db) {
  const SQLiteStore = bs3ss(session)
  const db = new Database(config.session.db)
  options.store = new SQLiteStore({
    client: db,
    expired: {
      clear: true,
      interval: 900000 // ms = 15 minutes
    }
  })
}

export default session(options)
