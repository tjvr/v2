'use strict'

const IMMEDIATE_PROMISE = Promise.resolve()
function immediate(fn) {return IMMEDIATE_PROMISE.then(fn)}

function debounce(ms, fn) {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), ms)
  }
}
function throttleImmediate(fn) {
  let set
  return () => {
    if (set) return
    set = true
    immediate(() => {
      set = false
      fn()
    })
  }
}

function toJSON(o, inPlace) {
  if (!o || typeof o !== 'object') return o
  if (o.toJSON) return toJSON(o.toJSON(), true)
  const result = inPlace ? o : Array.isArray(o) ? [] : {}
  for (const k in o) {
    const v = toJSON(o[k])
    if (v !== undefined) result[k] = v
    else if (inPlace) delete result[k]
  }
  return result
}

const ENTITY_RE = /[&<>"'/]/g
function escapeEntities(s) {
  return String(s).replace(ENTITY_RE, s =>
    s === '&' ? '&amp;' :
    s === '<' ? '&lt;' :
    s === '>' ? '&gt;' :
    s === '"' ? '&quot;' :
    s === '\'' ? '&#x27;' :
    s === '/' ? '&#x2f;' : '')
}
const SPECIAL_RE = /[\[\]{}()?*+.^$\\\/|-]/g
function escapeRegExp(s) {
  return String(s).replace(SPECIAL_RE, '\\$&')
}
function ucfirst(x) {return x.charAt(0).toUpperCase() + x.slice(1)}
function foldSpace(x) {return x.trim().replace(/\s+/g, ' ')}
function stripHTML(x) {
  // this is why we can't have nice things
  return x.replace(/<(?:\/|[a-z])[^ \t\f\n\/\>]*(?:[ \t\f\n]+(?:=?[^ \t\f\n\/>=]*(?:=(?:"[^"]*(?:"|$)|'[^']*(?:'|$)|[^ \t\f\n>]+)?)?)?|\/)*?\/?(?:>|$)|<!--[^]*?(?:(?:-?-)?>|(?:-?-!?)?$|<!--)|<!doctype[^>]*(?:>|$)|<[\/?!].*?(?:>|$)/gi, '')
  // <!doctype[ \t\f\n]*[^ \t\f\n]*[ \t\f\n]*(?:(?:public[ \t\f\n]*(?:'[^'>]*(?:'|$)|"[^">]*(?:"|$))|system)[ \t\f\n]*(?:'[^'>]*(?:'|$)|"[^">]*(?:"|$)))?[^>]*(?:>|$)
  // return new DOMParser().parseFromString(x, 'text/html').documentElement.textContent
}

function wrapBlob(blob, options) {
  if (!options) options = {}
  if (!blob) return Promise.reject(new Error('Not found'))
  const type = options.as === 'xml' ? 'text/xml' : options.type || blob.type
  const as = options.as === 'xml' ? 'document' : options.as || 'text'
  if (as === 'blob') return Promise.resolve(options.type ? new Blob([blob], {type}) : blob)
  return new Promise((resolve, reject) => {
    const r = new FileReader
    r.onerror = () => reject(r.error)
    r.onload = () => resolve(
      as === 'document' ? new DOMParser().parseFromString(r.result, type) :
      as === 'json' ? JSON.parse(r.result) : r.result)
    if (as === 'arraybuffer') r.readAsArrayBuffer(blob)
    else r.readAsText(blob)
  })
}

module.exports = {immediate, debounce, throttleImmediate, toJSON, escapeEntities, escapeRegExp, ucfirst, foldSpace, stripHTML, wrapBlob}
