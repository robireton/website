import chrono from '@robireton/chrono'
import express from 'express'
import config from './config.js'
import passport from './authentication.js'
const router = express.Router()

const menu = [
  { text: 'Home', title: 'there’s no place like it', href: '/' },
  { text: 'Item', title: 'a menu item', href: '/item' },
  { text: 'Account', title: 'work with your account', href: '/account' }
]

const scripts = []

const stylesheets = []

// Require authentication
router.all('*', (req, res, next) => {
  if (config.debug) console.debug(req.headers)
  if (req.user) next()
  else {
    if (config.debug) console.debug(`doing passport.authenticate('trusted-header')`)
    passport.authenticate('trusted-header', (err, user) => {
      if (config.debug) console.debug(`in passport.authenticate('trusted-header') custom callback`)
      if (err) {
        if (config.debug) console.debug('error in passport.authenticate() custom callback')
        next(err)
      } else {
        if (config.debug) console.debug(`typeof user is ${typeof user} in passport.authenticate('trusted-header') custom callback`)
        if (user) {
          if (config.debug) console.debug('doing req.login() in passport.authenticate() custom callback')
          req.login(user, err => {
            if (err) next(err)
            else next()
          })
        } else {
          if (config.debug) console.debug('no user in passport.authenticate() custom callback')
          res.render('unauthorized', { base_url: req.proxyBase })
        }
      }
    })(req, res, next)
  }
})

// Logging and setup
router.all('*', (req, _res, next) => {
  const fields = []
  if (config.log.stamp) fields.push(chrono.timestamp())
  if (config.log.method) fields.push(req.method)
  if (config.log.path) fields.push(req.path)
  if (config.log.user) fields.push(req.user ? req.user.id : '—unauthenticated—')
  if (config.log.ip) fields.push(req.ip)
  if (config.log.ua) fields.push(req.get('user-agent') || '')
  if (fields.length) console.log(fields.join('\t'))

  req.proxyBase = req.get('x-script-name') || ''

  next()
})

// Home
router.get('/', (req, res, _next) => {
  res.render('home', {
    page_title: 'Rob Ireton',
    base_url: req.proxyBase,
    user: req.user,
    scripts: scripts,
    stylesheets: stylesheets,
    menu: menu.map(item => Object.fromEntries([...Object.entries(item), ['current', req.route.path === item.href]]))
  })
})

// Item
router.get('/item', (req, res, _next) => {
  res.render('item', {
    page_title: 'Item',
    base_url: req.proxyBase,
    user: req.user,
    scripts: scripts,
    stylesheets: stylesheets,
    menu: menu.map(item => Object.fromEntries([...Object.entries(item), ['current', req.route.path === item.href]]))
  })
})

// Account
router.get('/account', (req, res, _next) => {
  res.render('account', {
    page_title: 'Account',
    base_url: req.proxyBase,
    user: req.user,
    scripts: scripts,
    stylesheets: stylesheets,
    menu: menu.map(item => Object.fromEntries([...Object.entries(item), ['current', req.route.path === item.href]]))
  })
})

export default router
