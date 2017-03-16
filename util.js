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

module.exports = {immediate, debounce, throttleImmediate, toJSON, escapeEntities, escapeRegExp, ucfirst, foldSpace, stripHTML}
