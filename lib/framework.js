import express from 'express'
import fileUpload from 'express-fileupload'
import favicon from 'serve-favicon'
import config from './config.js'
import handlebars from './handlebars.js'
import session from './session.js'
import passport from './users/authentication.js'
import logging from './logging.js'
import scriptName from './script-name.js'
import routes from './routes.js'
import users from './users/routes.js'

const app = express()

app.engine(handlebars.extname, handlebars.engine)
app.set('view engine', handlebars.extname)
app.set('trust proxy', ['loopback', 'uniquelocal'])
app.set('x-powered-by', false)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(fileUpload({ limits: { fileSize: config.maxfilesize } }))

app.use(favicon(config.favicon))
app.use(express.static(config.static))
app.use(session)
app.use(passport.initialize())
app.use(passport.session())

app.use(logging)
app.use(scriptName)
app.use(routes)
app.use(users)

export default app
