'use strict'

import config from './config.js'
import session from 'express-session'
import csql from 'connect-sqlite3'

const SQLiteStore = csql(session)

const options = {
  name: config.session.name,
  secret: config.session.secret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: config.session.secure,
    sameSite: true
  }
}

if (config.session.db) {
  options.store = new SQLiteStore({ db: config.session.db })
}

export default session(options)
