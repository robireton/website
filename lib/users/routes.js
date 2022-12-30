import { Router } from 'express'
import config from '../config.js'
import { text } from '../tools.js'
import * as journal from '../journal.js'
import { Account } from './account.js'
import { User } from './user.js'
import email from './email/routes.js'
import orcid from './orcid/routes.js'

const router = Router()

router.get('/join', (req, res) => {
  if (req.user) {
    req.session.message = 'You are already a user! Welcome back.'
    res.redirect(`${req.proxyBase}/account`)
  } else {
    res.render('users/login', {
      page_title: 'Become a User',
      base_url: req.proxyBase,
      active: 'users',
      scripts: [],
      stylesheets: ['users.css'],
      message: req.session.message,
      join: true,
      option: {
        orcid: true
      },
      urls: {
        orcid: `${req.proxyBase}/login/orcid`

      }
    })
  }
})

router.get('/login', (req, res) => {
  if (req.user && !('link-with' in req.query)) {
    res.redirect(`${req.proxyBase}/account`)
  } else {
    res.render('users/login', {
      page_title: 'Login',
      base_url: req.proxyBase,
      active: 'users',
      scripts: [],
      stylesheets: ['users.css'],
      message: req.session.message,
      option: {
        orcid: req.query['link-with'] !== 'orcid'
      },
      urls: {
        orcid: `${req.proxyBase}/login/orcid`

      }
    })
    delete req.session.message
  }
})

router.get('/become', (req, res) => {
  if (config.production || config.onprod) return res.sendStatus(410)
  let account, user
  for (const [source, id] of Object.entries(req.query)) {
    account = new Account(source, id)
    if (account.user) break
  }
  if (account.user) {
    user = new User(account.user)
    user.log(req.ip, req.headers['user-agent'])
  } else {
    Account.set(account.source, account.id, { id: account.id })
  }
  req.session.message = `${account.source}:${account.id}`
  if (!user) return res.redirect(`${req.proxyBase}/profile`)
  return req.login(user, err => {
    if (err) return res.sendStatus(500)
    res.redirect(`${req.proxyBase}/account`)
  })
})

router.get('/merge', (req, res) => {
  if (config.production || config.onprod) return res.sendStatus(410)
  try {
    let target, source
    for (const [key, value] of Object.entries(req.query)) {
      target = key
      source = value
      if (target && source) break
    }
    if (target && source) {
      const user = User.merge(target, source)
      req.session.memberSearchID = user.id
      return res.redirect(`${req.proxyBase}/users/search`)
    }
    res.sendStatus(400)
  } catch (err) {
    if (!config.production) console.error(err)
    journal.write('Users', `${req.method} ${req.originalUrl}`, err.message, err)
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

router.get('/logout', async (req, res) => {
  if (!(req.user instanceof User)) journal.write('Users', req.user.name.full, 'user logged out', req.user)
  await new Promise((resolve, reject) => {
    req.logout(error => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
  res.render('users/logout', {
    page_title: 'Account Logout',
    base_url: req.proxyBase
  })
})

router.post('/unlink', (req, res) => {
  try {
    if (!(req.user instanceof User)) return res.sendStatus(403)
    const source = text(req.body.source)
    if (!(['orcid'].includes(source))) return res.sendStatus(400)
    const accounts = req.user.accounts
    if (!accounts[source]) return res.sendStatus(404)
    req.user.deleteAccount(source)
    res.redirect(`${req.proxyBase}/logout`)
  } catch (err) {
    if (!config.production) console.error(err)
    journal.write('Users', `${req.method} ${req.originalUrl}`, err.message, err)
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

router.get('/users', (req, _res, next) => {
  req.url = '/account'
  next()
})

router.get('/account', (req, res) => {
  try {
    if (!req.user) {
      req.session.message = 'Please authenticate to access your account.'
      return res.redirect(`${req.proxyBase}/login`)
    }
    if (req.session.destination) {
      if (config.debug) console.log(`redirecting to ${req.session.destination}`)
      const destination = req.session.destination.startsWith('https://') ? req.session.destination : `${req.proxyBase}${req.session.destination}`
      delete req.session.destination
      return res.redirect(destination)
    }
    if (req.user instanceof User) {
      const user = req.user
      const profile = {
        edit: `${req.proxyBase}/profile?destination=referer`,
        name: user.name,
        emails: user.emails.map(email => ({
          address: email.address,
          primary: Boolean(email.primary),
          verified: Boolean(email.verified),
          subscribed: Boolean(email.subscribed)
        })),
        title: user.title,
        orcid: user.orcid
      }

      const accounts = user.accounts
      const page = {
        page_title: 'User Account',
        base_url: req.proxyBase,
        active: 'users',
        scripts: ['user-account.js'],
        stylesheets: ['users.css'],
        message: req.session.message,
        admin: req.user.hasRole(config.users.role),
        memberview: true,
        profile,
        actions: {
          orcid: { link: !accounts.orcid, unlink: (accounts.orcid) },
          linkhelp: !accounts.orcid
        }
      }
      res.render('users/account', page)
      delete req.session.message
    } else {
      res.redirect(`${req.proxyBase}/profile`)
    }
  } catch (err) {
    if (!config.production) console.error(err)
    journal.write('Users', `${req.method} ${req.originalUrl}`, err.message, err)
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

router.get('/profile', (req, res) => {
  if ('destination' in req.query && req.query.destination === 'referer' && req.headers.referer) {
    req.session.destination = req.headers.referer
  }
  try {
    const context = {
      page_title: 'Create an Account',
      base_url: req.proxyBase,
      active: 'users',
      scripts: ['user-profile.js'],
      stylesheets: ['users.css'],
      message: req.session.message,
      action: `${req.proxyBase}/profile`,
      submit: 'Join'
    }

    let user = req.user || {}
    if (user instanceof User && user.hasRole(config.users.role) && req.query.id) {
      user = new User(req.query.id)
    }
    if (user instanceof User) {
      context.user = user.id
      context.page_title = 'Edit User Profile'
      context.submit = 'Update User Profile'
      context.name = user.name
      context.emails = user.emails
      context.title = user.title
    } else {
      context.name = ('name' in user && user.name) ? user.name : {}
      context.emails = ('email' in user && user.email) ? [{ address: user.email }] : []
      context.link = `${req.proxyBase}/link`
    }

    if (!context.name.nickname) context.name.nickname = context.name.given
    if (!context.name.full) {
      context.name.full = [context.name.prefix, context.name.given, context.name.additional, context.name.family, context.name.suffix].filter(s => !!s).join(' ')
      context.name.custom = false
    }
    if (!('subjective' in context.name) || !context.name.subjective) context.name.subjective = 'they'
    if (!('objective' in context.name) || !context.name.objective) context.name.objective = 'them'
    if (!('possessive' in context.name) || !context.name.possessive) context.name.possessive = 'theirs'
    if (context.name.subjective === 'they' && context.name.objective === 'them' && context.name.possessive === 'theirs') {
      context.pronouns = { neutral: true }
    } else if (context.name.subjective === 'she' && context.name.objective === 'her' && context.name.possessive === 'hers') {
      context.pronouns = { feminine: true }
    } else if (context.name.subjective === 'he' && context.name.objective === 'him' && context.name.possessive === 'his') {
      context.pronouns = { masculine: true }
    } else {
      context.pronouns = { other: true, subjective: context.name.subjective, objective: context.name.objective, possessive: context.name.possessive }
    }
    res.render('users/profile', context)
    delete req.session.message
  } catch (err) {
    if (!config.production) console.error(err)
    journal.write('Users', `${req.method} ${req.originalUrl}`, err.message, err)
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

router.post('/profile', async (req, res) => {
  if (config.debug) console.log('\nrequest body: %O', req.body)
  const errors = []
  try {
    const id = text(req.body.user)
    if (id) { // updating an existing user
      if (config.debug) console.log(`updating existing user ${id}`)
      if (!req.user) return res.sendStatus(403)
      if (id !== req.user.id && !req.user.hasRole('User Manager')) return res.sendStatus(403)
      const user = (id === req.user.id) ? req.user : new User(id)
      const name = {
        prefix: text(req.body['honorific-prefix']),
        given: text(req.body['given-name']),
        additional: text(req.body['additional-name']),
        family: text(req.body['family-name']),
        suffix: text(req.body['honorific-suffix']),
        nickname: text(req.body.nickname),
        full: text(req.body.fullname),
        custom: text(req.body['full-name-option']) === 'custom'
      }
      switch (text(req.body.pronouns)) {
        case 'other':
          name.subjective = text(req.body.subjective)
          name.objective = text(req.body.objective)
          name.possessive = text(req.body.possessive)
          break

        case 'feminine':
          name.subjective = 'she'
          name.objective = 'her'
          name.possessive = 'hers'
          break

        case 'masculine':
          name.subjective = 'he'
          name.objective = 'him'
          name.possessive = 'his'
          break

        default:
          name.subjective = 'they'
          name.objective = 'them'
          name.possessive = 'theirs'
      }
      if (name.given && name.family) {
        if (!name.custom) name.full = null
        try {
          user.name = name
        } catch (nameError) {
          if (!config.production) console.error(nameError)
          journal.write('Users', `${req.method} ${req.originalUrl}`, nameError.message, { name, error: nameError })
          errors.push(nameError.message)
        }
      }

      const emails = []
      for (let i = 0; `emailaddress${i}` in req.body; i++) {
        const address = text(req.body[`emailaddress${i}`])
        if (address) {
          emails.push({
            address: address.toLowerCase(),
            primary: text(req.body.primary) === `emailaddress${i}`,
            subscribed: text(req.body.subscribed) === 'yes'
          })
        }
      }
      const newemail = req.body.newemail
      if (newemail) {
        emails.push({
          address: newemail.toLowerCase(),
          subscribed: text(req.body.subscribed) === 'yes'
        })
      }
      try {
        user.emails = emails
      } catch (emailError) {
        if (!config.production) console.error(emailError)
        journal.write('Users', `${req.method} ${req.originalUrl}`, emailError.message, { emails, error: emailError })
        errors.push(emailError.message)
      }
    } else {
      if (config.debug) console.log('creating new user')
      const application = {
        name: {
          prefix: text(req.body['honorific-prefix']),
          given: text(req.body['given-name']),
          additional: text(req.body['additional-name']),
          family: text(req.body['family-name']),
          suffix: text(req.body['honorific-suffix']),
          nickname: text(req.body.nickname),
          full: text(req.body.fullname),
          custom: text(req.body['full-name-option']) === 'custom'
        },
        email: { address: text(req.body.newemail), verified: false, readonly: false },
        login: null,
        access: null,
        ip: req.ip,
        ua: req.headers['user-agent']
      }
      if (!application.name.given || !application.name.family || !application.email) return res.sendStatus(400)
      switch (text(req.body.pronouns)) {
        case 'other':
          application.name.subjective = text(req.body.subjective)
          application.name.objective = text(req.body.objective)
          application.name.possessive = text(req.body.possessive)
          break

        case 'feminine':
          application.name.subjective = 'she'
          application.name.objective = 'her'
          application.name.possessive = 'hers'
          break

        case 'masculine':
          application.name.subjective = 'he'
          application.name.objective = 'him'
          application.name.possessive = 'his'
          break

        default:
          application.name.subjective = 'they'
          application.name.objective = 'them'
          application.name.possessive = 'theirs'
      }
      try {
        if (config.debug) console.log('application: %O', application)
        const user = new User(application)
        if (config.debug) console.log('user: %O', user)
        if (req.user) {
          if (req.user.orcid) {
            Account.set('orcid', req.user.orcid, req.user, user.id)
            user.orcid = req.user.orcid
          }
          await new Promise((resolve, reject) => {
            req.logout(error => {
              if (error) {
                reject(error)
              } else {
                resolve()
              }
            })
          })
        }
        return req.login(user, err => {
          if (err) {
            if (!config.production) console.error(err)
            journal.write('Users', 'login error', err.message, { application, error: err })
          }
          res.redirect(`${req.proxyBase}/account`)
        })
      } catch (applyError) {
        if (!config.production) console.error(applyError)
        journal.write('Users', `${req.method} ${req.originalUrl}`, applyError.message, { application, error: applyError })
        errors.push(applyError.message)
      }
    }
  } catch (err) {
    if (!config.production) console.error(err)
    journal.write('Users', `${req.method} ${req.originalUrl}`, err.message, err)
    return res.status(500).render('error', {
      page_title: 'Error',
      base_url: req.proxyBase,
      active: 'users',
      message: req.session.message,
      scripts: [],
      stylesheets: [],
      code: err.message
    })
  }

  if (errors.length) {
    req.session.message = errors.join('\n')
    return res.redirect(`${req.proxyBase}${req.path}`)
  }
  if ('destination' in req.session) {
    if (config.debug) console.log(`redirecting to ${req.session.destination}`)
    const destination = req.session.destination.startsWith('https://') ? req.session.destination : `${req.proxyBase}${req.session.destination}`
    delete req.session.destination
    return res.redirect(destination)
  } else {
    res.redirect(`${req.proxyBase}/account`)
  }
})

router.get('/users/search', (req, res) => {
  if (!req.user) {
    req.session.destination = req.path
    return res.redirect(`${req.proxyBase}/login`)
  }
  try {
    if (!(req.user instanceof User && req.user.hasRole(config.users.role))) {
      return res.status(403).render('markup', {
        page_title: 'Not Authorized',
        base_url: req.proxyBase,
        active: 'users',
        scripts: [],
        stylesheets: [],
        markup: '<p>You are not authorized to access this resource.</p>'
      })
    }
    const context = {
      page_title: 'Search Users',
      base_url: req.proxyBase,
      active: 'users',
      scripts: ['users.js'],
      stylesheets: ['users.css'],
      message: req.session.message,
      action: `${req.proxyBase}/users/members`
    }
    if (req.session.memberSearchID) {
      try {
        const text = User.getDisplayEmail(req.session.memberSearchID)
        if (text) context.initial = { value: req.session.memberSearchID, text }
      } catch (_) {
        delete req.session.memberSearchID
      }
    }
    res.render('users/search', context)
    delete req.session.message
  } catch (err) {
    if (!config.production) console.error(err)
    journal.write('Users', `${req.method} ${req.originalUrl}`, err.message, err)
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

router.get('/users/members', (req, res) => {
  if (!(req.user instanceof User && req.user.hasRole(config.users.role))) return res.sendStatus(403)
  if ('search' in req.query) {
    try {
      delete req.session.memberSearchID
      return res.json(User.search(req.query.search))
    } catch (err) {
      if (!config.production) console.error(err)
      journal.write('Users', `${req.method} ${req.originalUrl}`, err.message, err)
      return res.status(500).send(err.message)
    }
  }

  if ('id' in req.query) {
    try {
      req.session.memberSearchID = req.query.id
      const user = new User(req.query.id)
      const last = user.last
      const roles = user.roles
      const meta = {
        id: user.id,
        created: {
          datetime: user.created.toISOString(),
          display: user.created.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
        },
        disabled: {
          value: user.disabled,
          patch: `${req.proxyBase}/user/${user.id}/disabled`
        },
        last: {
          login: last.login ? { datetime: last.login.toISOString(), display: last.login.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) } : null,
          access: last.access ? { datetime: last.access.toISOString(), display: last.access.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) } : null,
          ip: last.ip,
          ua: last.ua
        },
        roles: {
          map: JSON.stringify(Array.from(User.roles().values()).map(r => ({ role: r, selected: roles.includes(r) }))),
          list: roles,
          patch: `${req.proxyBase}/user/${user.id}/roles`
        },
        accounts: user.accounts
      }
      if (user.disabled) {
        meta.disabled.datetime = user.disabled.toISOString()
        meta.disabled.display = user.disabled.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
      }

      return res.render('users/account', {
        layout: false,
        memberview: false,
        meta,
        profile: {
          edit: `${req.proxyBase}/profile?id=${user.id}&destination=referer`,
          name: user.name,
          emails: user.emails.map(email => ({
            address: email.address,
            primary: Boolean(email.primary),
            verified: Boolean(email.verified),
            subscribed: Boolean(email.subscribed)
          })),
          title: user.title,
          orcid: user.orcid
        }
      })
    } catch (err) {
      if (!config.production) console.error(err)
      journal.write('Users', `${req.method} ${req.originalUrl}`, err.message, err)
      return res.status(500).send(err.message)
    }
  }
  return res.sendStatus(400)
})

router.patch('/user/:id/:value', (req, res) => {
  if (!User.mayEdit(req.user, req.params.id)) res.sendStatus(403)
  try {
    const user = req.user.id === req.params.id ? req.user : new User(req.params.id)
    // console.log(`set ${req.params.value} to ${req.body} for user ${user.id}`)
    switch (req.params.value) {
      case 'disabled':
        user.disabled = req.body.option
        return res.json({ disabled: user.disabled })

      case 'roles':
        user.roles = req.body
        return res.json(user.roles)

      default:
        return res.sendStatus(400)
    }
  } catch (err) {
    if (!config.production) console.error(err)
    journal.write('Users', `${req.method} ${req.originalUrl}`, err.message, err)
    return res.status(500).send(err.message)
  }
})

router.use(email)
router.use(orcid)

export default router
