import { Router } from 'express'
import passport from '../authentication.js'

const router = Router()

router.get('/login/orcid', (req, res, next) => {
  passport.authenticate('orcid', {})(req, res, next)
})

router.get('/orcid', (req, res, next) => {
  let destination = `${req.proxyBase}/account` // default destination
  if (req.session.destination) {
    destination = req.session.destination.startsWith('https://') ? req.session.destination : `${req.proxyBase}${req.session.destination}`
    delete req.session.destination
  }
  passport.authenticate('orcid', {
    successRedirect: destination,
    failureRedirect: `${req.proxyBase}/login`
  })(req, res, next)
})

export default router
