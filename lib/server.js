'use strict'

import path from 'path'
import chrono from '@robireton/chrono'
import express from 'express'
import exphbs from 'express-handlebars'
import favicon from 'serve-favicon'
import config from './config.js'
import passport from './authentication.js'
import session from './session.js'
import lhb from './handlebars.js'
import routes from './routes.js'

const handlebars = lhb(exphbs)
const app = express()
app.engine('.hbs', handlebars.engine)
app.set('view engine', '.hbs')
app.set('trust proxy', ['loopback', 'uniquelocal'])

app.use(favicon(path.join(process.cwd(), 'static', 'favicon.ico')))
app.use(express.static(path.join(process.cwd(), 'static')))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session)
app.use(passport.initialize())
app.use(passport.session())
app.use(routes)

const server = app.listen(config.http, () => {
  console.log(`${chrono.timestamp()}\tWebsite listening on ${server.address().address}:${server.address().port}`)
})

server.on('close', () => console.log('web server closed'))
process.on('exit', code => console.log(`exit with code ${code}`))
for (const signal of ['SIGUSR2', 'SIGINT', 'SIGTERM']) {
  process.on(signal, s => {
    console.log(`signal: ${s}`)
    server.close(err => {
      if (err) console.error(`error ${err} while closing web server`)
      process.exit()
    })
  })
}
