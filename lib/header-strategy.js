import pth from 'passport-trusted-header'
const HeaderStrategy = pth.Strategy

const options = {
  headers: ['sso-username', 'sso-email']
}

const strategy = new HeaderStrategy(options, (headers, done) => {
  if (process.env.NODE_ENV === 'debug') console.debug('in trusted-header strategy verify')
  done(null, {
    id: headers['sso-username'],
    email: headers['sso-email'],
    givenName: headers['sso-firstname'] || headers['sso-username'],
    surname: headers['sso-lastname']
  })
})

export default {
  strategy: strategy
}
