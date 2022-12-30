import process from 'process'
import { EventEmitter } from 'events'
import { setInterval, clearInterval } from 'timers'
import config from './config.js'
import { log } from './logging.js'

class Cron extends EventEmitter {
  constructor (interval, days = [0, 1, 2, 3, 4, 5, 6], hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]) {
    super()
    this.days = new Set(days)
    this.hours = new Set(hours)
    log(`‘cron’ event will be emitted every ~${Math.round(interval / 60000)} minutes`, 'startup', 'cron')
    this.timeout = setInterval(this.job.bind(this), interval)
    process.on('exit', function (code) {
      log('clearing timeout', `exit(${code})`, 'cron')
      clearInterval(this.timeout)
    })
  }

  job () {
    const now = new Date()
    if (this.days.has(now.getDay()) && this.hours.has(now.getHours())) {
      log('emit event', 'interval', 'cron')
      this.emit('cron', now)
    }
  }
}

const cron = new Cron(config.cron.interval, config.cron.days, config.cron.hours)

export default cron
