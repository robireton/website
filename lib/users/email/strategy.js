import config from '../../config.js'
import { text } from '../../tools.js'
import * as journal from '../../journal.js'
import { Account } from '../account.js'
import { User } from '../user.js'

class Strategy {
  constructor () {
    this.name = 'email'
  }

  verify (key, done) {
    console.log(`Strategy.verify(${key})`)
    try {
      const account = new Account('email', key)
      if (config.debug) console.log('account: %O', account)
      if (account.user) {
        if (!config.debug) Account.deleteUserSource(account.user, 'email')
        // db.validate(account.data.email)
        done(null, new User(account.user), { message: 'OK' })
      } else {
        done(null, null, { message: 'invalid email link' })
      }
    } catch (err) {
      if (!config.production) console.error(err)
      journal.write('Users', 'email Passport verify()', err.message, err)
      done(err, null, { message: err.message })
    }
  }

  authenticate (req, _options) {
    try {
      const key = text(req.params.key)
      if (!key) return this.fail({ message: 'missing parameter' }, 400)
      this.verify(req.params.key, (err, user, info) => {
        if (err) return this.error(err)
        if (!user) return this.fail(info)
        this.success(user, info)
      })
    } catch (authErr) {
      if (!config.production) console.error(authErr)
      journal.write('Users', 'email Passport authenticate()', authErr.message, authErr)
      this.fail({ message: authErr.message }, 500)
    }
  }
}

export const strategy = new Strategy()
