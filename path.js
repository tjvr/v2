'use strict'

function dirname(x) {
  const p = /^(?:\w+:)?\//.exec(x)
  const prefix = p ? p[0] : ''
  const rx = x.slice(prefix.length)
  const i = rx.lastIndexOf('/')
  if (i === -1) return prefix
  return prefix + rx.slice(0, i)
}

function basename(x) {
  const i = x.lastIndexOf('/')
  if (i === -1) return x
  return x.slice(i + 1)
}

function sanitize(x) {
  return resolve('', x)
}

function join(...parts) {
  return parts.filter(p => p).join('/')
}

function resolve(x, ...then) {
  const p = /^(?:\w+:)?\//.exec(x)
  const prefix = p ? p[0] : ''
  const rx = x.slice(prefix.length)
  const parts = rx ? rx.split('/') : []
  for (const y of then) {
    if (y[0] === '/') parts.length = 0
    for (const t of y.split('/')) {
      if (t === '.') continue
      else if (t === '..') parts.pop()
      else if (t) parts.push(t)
    }
  }
  return prefix + parts.join('/')
}

function ext(s) {
  const i = s.lastIndexOf('/')
  if (i !== -1) s = s.slice(i + 1)
  const j = s.lastIndexOf('.')
  return j === -1 ? '' : s.slice(j + 1)
}

module.exports = {dirname, basename, sanitize, join, resolve, ext}
