import crypto from 'crypto'
import env from '@robireton/environment'

const config = {
  production: (process.env.NODE_ENV === 'production'),
  debug: (process.env.NODE_ENV === 'debug'),
  http: {
    host: process.env.HTTP_HOST || (process.env.NODE_ENV === 'production' ? undefined : 'localhost'),
    port: env.parseInt('HTTP_PORT', process.env.NODE_ENV === 'production' ? 80 : 8080)
  },
  session: {
    name: process.env.SESSION_NAME || 'session.sid',
    secret: process.env.SESSION_SECRET || crypto.randomBytes(16).toString('hex'),
    secure: env.parseBool('SESSION_SECURE'),
    db: process.env.SESSION_DB || false
  },
  sampleUser: {
    id: process.env.SAMPLE_USER_ID,
    email: process.env.SAMPLE_USER_EMAIL,
    givenName: process.env.SAMPLE_USER_NAME,
    surname: process.env.SAMPLE_USER_SURNAME
  },
  log: {
    stamp: env.parseBool('LOG_STAMP'),
    method: env.parseBool('LOG_METHOD'),
    path: env.parseBool('LOG_PATH'),
    user: env.parseBool('LOG_USER'),
    ip: env.parseBool('LOG_IP'),
    ua: env.parseBool('LOG_UA')
  }
}

if (process.env.NODE_ENV === 'debug') console.debug(config)
export default config
