import { randomBytes } from 'crypto'
import { hostname } from 'os'
import { env } from 'process'
import path from 'path'
import * as environment from '@robireton/environment'

const config = {
  production: env.NODE_ENV === 'production',
  development: env.NODE_ENV === 'development',
  debug: env.NODE_ENV === 'debug',
  environment: env.NODE_ENV,
  hostname: hostname(),
  onprod: hostname() === env.PRODUCTION_SERVER,
  maxfilesize: environment.parseInt('MAXFILESIZE', 5242880),
  favicon: path.resolve('static/favicon.ico'),
  static: path.resolve('static'),
  cron: {
    interval: environment.parseInt('CRON_INTERVAL', 1439989),
    days: environment.parseInts('CRON_DAYS'),
    hours: environment.parseInts('CRON_HOURS')
  },
  http: {
    port: environment.parseInt('HTTP_PORT', env.NODE_ENV === 'production' ? 80 : 8080),
    host: env.HTTP_HOST || (env.NODE_ENV === 'production' ? undefined : 'localhost')
  },
  session: {
    name: env.SESSION_NAME || 'session.sid',
    secret: env.SESSION_SECRET || randomBytes(16).toString('hex'),
    secure: environment.parseBool('SESSION_SECURE'),
    samesite: env.SESSION_SAMESITE,
    age: environment.parseInt('SESSION_AGE'),
    db: env.SESSION_DB ? path.resolve(env.SESSION_DB) : false
  },
  log: {
    stamp: environment.parseBool('LOG_STAMP'),
    method: environment.parseBool('LOG_METHOD'),
    path: environment.parseBool('LOG_PATH'),
    user: environment.parseBool('LOG_USER'),
    ip: environment.parseBool('LOG_IP'),
    ua: environment.parseBool('LOG_UA')
  },
  email: {
    baseURL: env.BASE_URL,
    from: env.SMTP_FROM,
    divert: env.SMTP_DIVERT,
    smtp: {
      host: env.SMTP_SERVER,
      tls: {
        rejectUnauthorized: false // do not fail on invalid certs
      }
    }
  },
  journal: {
    db: path.resolve(env.JOURNAL_DB_PATH || 'run/journal.db')
  },
  variables: {
    db: path.resolve(env.VARIABLES_DB_PATH || 'run/variables.db')
  },
  users: {
    db: path.resolve(env.USERS_DB_PATH || 'run/users.db')
  },
  auth: {
    orcid: {
      client_id: env.ORCID_CLIENT_ID,
      client_secret: env.ORCID_CLIENT_SECRET
    }
  }
}

if (config.debug) console.debug(config)
export default config
