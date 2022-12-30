import nodemailer from 'nodemailer'
import config from './config.js'
import * as journal from './journal.js'

const transporter = config.email.smtp ? nodemailer.createTransport(config.email.smtp) : false

export async function send (message) {
  if (!transporter) throw new Error('no SMTP server')
  if (!('to' in message)) throw new Error('no recipient specified')
  if (!('subject' in message)) throw new Error('no subject specified')
  if (!('text' in message) && !('html' in message)) throw new Error('no body specified')
  journal.write('Mail', 'sending', message.subject, message)
  if (!('from' in message) && config.email.from) message.from = config.email.from
  if (config.email.divert && message.subject !== 'Account Recovery') {
    message.to = config.email.divert
    delete message.cc
    delete message.bcc
  }
  const info = await transporter.sendMail(message)
  journal.write('Mail', 'sent', info.response, message)
  return info.response.startsWith('250 Ok')
}
