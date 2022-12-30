import { createHash } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'

export function titleCase (s) {
  s = String(s)
  if (s !== s.toLowerCase() && s !== s.toUpperCase()) return s
  const result = []
  const punctuation = s.split(/\w+/)
  result.push(punctuation.shift())
  for (const word of s.split(/\W+/)) {
    result.push(word.substring(0, 1).toUpperCase() + word.substring(1).toLowerCase())
    if (punctuation.length) result.push(punctuation.shift())
  }
  return result.join('')
}

export function normalizeText (text) {
  if (typeof text !== 'string') return null
  text = text.replaceAll(/[ ]*[\r\n]+[ ]*/g, '\n') // normalize line endings
  text = text.replaceAll(/[ ]*[\t]+[ ]*/g, ' ') // tabs to space
  text = text.replaceAll(/\.\.\./g, '…') // typographic elipsis
  text = text.replaceAll(/[-]{2,}/g, '—') // em dash
  text = text.replaceAll(/[ ]+-[ ]+/g, '—') // em dash
  text = text.replaceAll(/(\d+)\s*-\s*(\d+)/g, '$1–$2') // en dash
  text = text.replaceAll(/^[•*-][ ]*/g, '• ') // bullets
  text = text.replaceAll(/(?<=\n)[•*-][ ]*/g, '• ') // bullets
  text = text.replaceAll(/[ ]*-[ ]*/g, '-') // no spacing around hyphen
  text = text.replaceAll(/"([^"]+)"/g, '“$1”') // typographic double quotes
  text = text.replaceAll(/'([^"]+)'/g, '‘$1’') // typographic single quotes
  text = text.replaceAll(/'/g, '’') // typographic apostrophe
  text = text.replaceAll(/[ ]*\/[ ]*/g, '/') // no space around virgule
  text = text.replaceAll(/([(])\s*/g, ' $1') // space before
  text = text.replaceAll(/\s*([),:;.])/g, '$1 ') // space after
  text = text.replaceAll(/\) ,/g, '),') // no space between paren and comma
  text = text.replaceAll(/[ ]+/g, ' ') // single spaces
  return text.trim()
}

export function text (s) {
  if (s === undefined) return null
  if (s === null) return null
  s = String(s).trim()
  return s.length ? s : null
}

export function list (x) {
  return (x instanceof Array ? x : [x]).map(s => text(s)).filter(s => typeof s === 'string')
}

export function firstWords (text, n = 128) {
  const words = String(text).split(' ')
  return words.length <= n ? text : `${words.slice(0, n).join(' ')}…`
}

export function firstCharacters (text, n = 80) {
  if (String(text).length <= n) {
    return text
  } else {
    return `${String(text).substring(0, text.lastIndexOf(' ', n))}…`
  }
}

export function documentClass (mimetype) {
  if (mimetype === 'application/pdf') return 'pdf'
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'word'
  if (mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return 'powerpoint'
  if (mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'excel'
  if (mimetype === 'application/msword') return 'word'
  if (mimetype.startsWith('application/vnd.ms-outlook')) return 'outlook'
  if (mimetype.startsWith('application/vnd.ms-powerpoint')) return 'powerpoint'
  if (mimetype.startsWith('application/vnd.ms-word')) return 'word'
  return 'generic'
}

export function ensureDirSync (path) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true })
    if (!existsSync(path)) throw new Error(`unable to create directory ${path}`)
  }
}

export function equals (a, b) {
  return a.localeCompare(b, [], { usage: 'search', sensitivity: 'base', ignorePunctuation: true }) === 0
}

export function hash (data) {
  return createHash('sha256').update(data).digest('base64url')
}
