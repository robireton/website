import { Issuer, Strategy } from 'openid-client' // https://github.com/panva/node-openid-client/blob/main/docs/README.md
import config from '../../config.js'
import * as journal from '../../journal.js'
import { Account } from '../account.js'
import { User } from '../user.js'

// const orcidIssuer = await Issuer.discover('https://sandbox.orcid.org')
const issuer = new Issuer({
  authorization_endpoint: 'https://orcid.org/oauth/authorize',
  claim_types_supported: ['normal'],
  claims_parameter_supported: false,
  claims_supported: ['family_name', 'given_name', 'name', 'auth_time', 'iss', 'sub'],
  grant_types_supported: ['authorization_code', 'implicit', 'refresh_token'],
  id_token_signing_alg_values_supported: ['RS256'],
  issuer: 'https://orcid.org',
  jwks_uri: 'https://orcid.org/oauth/jwks',
  request_parameter_supported: false,
  request_uri_parameter_supported: true,
  require_request_uri_registration: false,
  response_modes_supported: ['query', 'fragment'],
  response_types_supported: ['code', 'id_token', 'id_token token'],
  scopes_supported: ['openid'],
  subject_types_supported: ['public'],
  token_endpoint_auth_methods_supported: ['client_secret_post'],
  token_endpoint_auth_signing_alg_values_supported: ['RS256'],
  token_endpoint: 'https://orcid.org/oauth/token',
  userinfo_endpoint: 'https://orcid.org/oauth/userinfo'
})

const client = new issuer.Client({
  client_id: config.auth.orcid.client_id,
  client_secret: config.auth.orcid.client_secret,
  redirect_uris: ['https://robireton.com/oauth/orcid']
})

const options = {
  passReqToCallback: true,
  client,
  usePKCE: false
}

function verify (req, tokenset, next) {
  function login (data, userID, message = null) {
    Account.set('orcid', data.orcid, data, userID)
    const user = new User(userID)
    try {
      user.orcid = data.orcid
      if (data.email) user.setEmail({ address: data.email, verified: true, readonly: true })
    } catch (loginErr) {
      if (!config.production) console.error(loginErr)
      journal.write('Users', 'ORCiD login()', loginErr.message, loginErr)
    }
    user.log(req.ip, req.headers['user-agent'])
    next(null, user, message)
  }

  try {
    if (config.debug) console.log('\nin orcid verify()')
    const claims = tokenset.claims()
    if (config.debug) console.log('\ntokenset: %O', tokenset)
    if (config.debug) console.log('\nclaims: %O', claims)
    const data = {
      orcid: `${claims.iss}/${claims.sub}`,
      tokens: {
        access: tokenset.access_token,
        refresh: tokenset.refresh_token
      },
      name: {
        given: claims.given_name,
        nickname: claims.given_name,
        family: claims.family_name,
        full: tokenset.name,
        custom: tokenset.name !== `${claims.given_name} ${claims.family_name}`
      },
      iss: claims.iss, // Issuer — the IRL part of the ORCiD
      sub: claims.sub, // Subject — number part of the ORCiD
      aud: claims.aud, // Client ID
      auth_time: claims.auth_time,
      exp: claims.exp,
      iat: claims.iat,
      at_hash: claims.at_hash,
      jti: claims.jti
    }

    const userIDs = new Set(User.find(data).filter(m => m.exact).map(m => m.id))
    if (userIDs.size > 1) {
      // would like to handle this situation at some point
      throw new Error(`${userIDs.size} existing Users match this ORCiD`)
    }
    const account = new Account('orcid', data.orcid)

    if (req.user instanceof User) { // User already signed in · Linking/Merging
      if (account.user) { // ORCiD account already associated with a user
        if (userIDs.has(req.user.id) && userIDs.has(account.user)) { // implies req.user.id ≡ account.user
          // nothing to do but login
          login(data, req.user.id)
        } else { // req.user.id ≠ account.user — merging to do
          // current user is not the ORCiD user, they are authorized to merge with ORCiD-associated users
          const merged = User.merge(req.user.id, account.user)
          merged.log(req.ip, req.headers['user-agent'])
          next(null, merged, 'Users merged')
        }
      } else { // Haven't seen this ORCiD account before, link with logged-in user
        login(data, req.user.id, 'ORCiD account successfully linked to user')
      }
      login(data, req.user.id)
    } else { // No user signed in · Authenticating
      let userID = account.user // match based on ORCiD
      if (!userID && userIDs.size > 0) userID = Array.from(userIDs)[0]
      if (userID) {
        if ('user' in req && req.user.orcid) data.orcid = req.user.orcid
        login(data, userID)
      } else {
        req.session.message = `no user account linked to ORCiD ${data.orcid}`
        Account.set('orcid', data.orcid, data)
        return next(null, data)
      }
    }
  } catch (err) {
    if (!config.production) console.error(err)
    journal.write('Users', 'ORCiD Passport verify()', err.message, err)
    next(err, false)
  }
}

export const strategy = new Strategy(options, verify)
