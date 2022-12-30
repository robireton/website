import { Router } from 'express'
import config from './config.js'
import menu from './menu.js'

const router = Router()

menu.add(['/', 'Home', { weight: -100 }])
menu.add(['/sunflower', 'Sunflower', { weight: 0 }])

router.get('/', (req, res) => {
  res.render('home', {
    pageid: 'home-page',
    page_title: `${config.sitename} Home`,
    base_url: req.proxyBase,
    sitename: config.sitename,
    sitemenu: menu.entries(req.path, req.proxyBase, req.user),
    messages: req.session.messages
  })
  req.session.messages = []
})

router.get('/sunflower', (req, res) => {
  res.render('sunflower', {
    pageid: 'sunflower-page',
    page_title: 'Sunflower',
    base_url: req.proxyBase,
    sitename: config.sitename,
    sitemenu: menu.entries(req.path, req.proxyBase, req.user),
    messages: req.session.messages,
    stylesheets: ['sunflower.css'],
    scripts: ['sunflower.js']
  })
  req.session.messages = []
})

export default router
