import process from 'process'
import config from './config.js'
import { log } from './logging.js'
import * as journal from './journal.js'
import framework from './framework.js'

journal.write('Server', 'startup', 'init', process.env)

const server = framework.listen(config.http, () => {
  const addr = server.address()
  journal.write('Server', 'startup', 'listening', addr)
  log(`webserver listening on ${addr.address}:${addr.port}`, 'startup', 'server')
})

for (const signal of ['SIGUSR2', 'SIGINT', 'SIGTERM']) {
  process.on(signal, s => {
    log('caught signal', s, 'process')
    server.close(err => {
      journal.write('Server', 'close', 'signal', s)
      err && log(err, 'close', 'server')
      process.exit()
    })
  })
}
