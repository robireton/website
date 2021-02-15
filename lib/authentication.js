import passport from 'passport'
import config from './config.js'
import production from './header-strategy.js'
import demo from './demo-strategy.js'

const UserStore = new Map()

passport.use(config.production ? production.strategy : demo.strategy)

passport.serializeUser((user, done) => {
  if (config.debug) console.debug(`passport serializing user ${JSON.stringify(user)}`)
  UserStore.set(user.id, user)
  done(null, user.id)
})

passport.deserializeUser((id, done) => {
  if (config.debug) console.debug(`passport serializing user id: ${id}`)
  const user = UserStore.get(id)
  if (user) {
    done(null, user)
  } else {
    done(Error(`unknown user id: ${id}`))
  }
})

export default passport
