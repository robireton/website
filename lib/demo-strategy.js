import config from './config.js'
import pth from 'passport-trusted-header'
const HeaderStrategy = pth.Strategy

const options = {
  headers: ['host']
}

const strategy = new HeaderStrategy(options, (_headers, done) => {
  if (process.env.NODE_ENV === 'debug') console.debug('in trusted-header strategy verify')
  done(null, config.sampleUser)
})

export default {
  strategy: strategy
}
