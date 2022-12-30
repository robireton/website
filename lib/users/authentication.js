import passport from 'passport'
import { Account } from './account.js'
import { User } from './user.js'
import { strategy as email } from './email/strategy.js'
import { strategy as orcid } from './orcid/strategy.js'

const UserStore = new Map()

passport.use(email)
passport.use('orcid', orcid)

passport.serializeUser((user, next) => {
  if (user.id) {
    UserStore.set(user.id, user)
    next(null, user.id)
  } else if (user.orcid) {
    UserStore.set(user.orcid, user)
    next(null, user.orcid)
  } else if (user.email) {
    UserStore.set(user.email, user)
    next(null, user.email)
  } else {
    next(new Error('unrecognized user'), false)
  }
})

passport.deserializeUser((id, next) => {
  try {
    // get user from source if possible
    const user = new User(id)
    user.log() // updates “last access”
    UserStore.set(id, user)
    next(null, user)
  } catch (err) {
    if (UserStore.has(id)) {
      next(null, UserStore.get(id))
    } else {
      const accounts = Account.search({ id })
      if (accounts.length === 1) {
        // this is a non-user user, e.g. an ORCiD login
        UserStore.set(id, accounts[0].data)
        next(null, accounts[0].data)
      } else {
        next(err, false)
      }
    }
  }
})

export default passport
