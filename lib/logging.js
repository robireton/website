import { timestamp } from '@robireton/chrono'
import { Router } from 'express'
import config from './config.js'
import { User } from './users/user.js'

const router = Router()

router.all('*', (req, _res, next) => {
  const fields = []
  config.log.stamp && fields.push(timestamp())
  config.log.method && fields.push(req.method)
  config.log.path && fields.push(req.originalUrl.split('?', 2)[0])
  if (config.log.user) {
    if (req.user) {
      if (req.user instanceof User) {
        fields.push(req.user.name.full)
      } else if ('name' in req.user && 'full' in req.user.name) {
        fields.push(req.user.name.full)
      } else if ('orcid' in req.user) {
        fields.push(req.user.orcid)
      } else {
        fields.push('-unnamed-')
      }
    } else {
      fields.push('-unauthenticated-')
    }
  }
  config.log.ip && fields.push(req.ip)
  config.log.ua && fields.push(req.headers['user-agent'] || '')
  fields.length > 0 && console.log(fields.join('\t'))

  next()
})

export default router

export function log (message, trigger = null, author = null) {
  const fields = []
  config.log.stamp && fields.push(timestamp())
  config.log.method && trigger && fields.push(trigger)
  config.log.path && author && fields.push(author)
  fields.push(message)
  console.log(fields.join('\t'))
}
