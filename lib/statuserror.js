export default class StatusError extends Error {
  constructor (code, message) {
    super(message)
    this.code = code
  }
}
