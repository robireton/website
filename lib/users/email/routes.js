import { Router } from 'express'
import config from '../../config.js'
import { text } from '../../tools.js'
import * as journal from '../../journal.js'
import passport from '../authentication.js'
import { Account } from '../account.js'
import { User } from '../user.js'

const router = Router()

router.get('/link', (req, res) => {
  if (!req.user) return res.sendStatus(403)
  res.render('users/link', {
    page_title: 'Account Recovery',
    base_url: req.proxyBase,
    active: 'users',
    scripts: [],
    stylesheets: ['users.css'],
    message: req.session.message,
    action: `${req.proxyBase}/link`
  })
  req.session.messages = []
})

router.post('/link', async (req, res) => {
  if (!req.user) return res.sendStatus(403)
  const username = text(req.body.username)
  if (!username) return res.sendStatus(400)
  try {
    const email = User.find({ email: username })

    journal.write('Users', 'Account Access', `search for “${req.body.username}” found nothing useable`, { email })
    res.status(500).render('error', {
      page_title: 'Account Access Failure',
      base_url: req.proxyBase,
      active: 'users',
      scripts: [],
      stylesheets: [],
      markup: '<p>not able to access users<span class="mdash">—</span>please contact us for assistance</p>'
    })
  } catch (err) {
    if (!config.production) console.error(err)
    journal.write('Research', `${req.method} ${req.originalUrl}`, err.message, err)
    res.status(500).render('error', {
      page_title: 'Error',
      base_url: req.proxyBase,
      active: 'users',
      message: req.session.message,
      scripts: [],
      stylesheets: [],
      code: err.message
    })
  }
})

router.get('/link/:key', (req, res, next) => {
  if (req.session.destination === req.path) delete req.session.destination
  if (!req.user) {
    req.session.destination = req.path
    req.session.message = 'Please authenticate with the account you wish to link with.'
    return res.redirect(`${req.proxyBase}/login`)
  }
  passport.authenticate('email', (err, user, info) => {
    if (err) return next(err)
    if (!user) {
      req.session.message = info.message || 'email link failure'
      return res.redirect(`${req.proxyBase}/login`)
    }
    if (config.debug) console.log(`user ${user.id} authenticated with info %O`, info)
    if (req.user instanceof User) {
      if (user.id !== req.user.id) {
        journal.write('Users', 'Account Access', 'merging profiles', [req.user.id, user.id])
        user = User.merge(req.user.id, user.id)
        req.session.message = 'user records merged'
      } else {
        req.session.message = 'already linked'
      }
    } else if ('user' in req && req.user.orcid) {
      // link a Users with this orcid account
      const orcid = new Account('orcid', req.user.orcid)
      orcid.assign(user.id)
      user.orcid = req.user.orcid
      journal.write('Users', 'email', 'orcid linked', [user.id, req.user.orcid])
      req.session.message = 'ORCiD account linked to user'
    }
    user.log(req.ip, req.headers['user-agent'])
    req.login(user, err => err ? next(err) : res.redirect(`${req.proxyBase}/account`))
  })(req, res, next)
})

export default router
