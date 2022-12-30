import { Router } from 'express'
import config from './config.js'

const router = Router()

router.get('/', (req, res) => {
  res.render('home', {
    page_title: 'Rob Ireton',
    base_url: req.proxyBase,
    mainsite: config.mainsite
  })
})

export default router
