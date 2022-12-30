import { Router } from 'express'
import config from './config.js'
import menu from './menu.js'

const router = Router()

menu.add(['/', 'Home', { weight: -100 }])

router.get('/', (req, res) => {
  res.render('home', {
    pageid: 'home-page',
    page_title: `${config.sitename} Home`,
    base_url: req.proxyBase,
    sitename: config.sitename,
    sitemenu: menu.entries(req.path, req.proxyBase, req.user),
    messages: req.session.messages
  })
})

export default router
