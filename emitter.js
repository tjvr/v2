'use strict'

function on(e, fn) {
  const m = this._listeners || (this._listeners = new Map)
  const l = m.get(e)
  if (l) !l.includes(fn) && l.push(fn)
  else m.set(e, [fn])
  return this
}
function once(e, fn) {
  const bound = x => {
    fn(x)
    this.unlisten(e, bound)
  }
  this.on(e, bound)
  return this
}
function unlisten(e, fn) {
  const m = this._listeners
  if (!m) return this
  const l = m.get(e)
  if (!l) return this
  const i = l.indexOf(fn)
  if (i !== -1) l.splice(i, 1)
  return this
}
function toggleListener(e, fn, value) {
  if (value) this.on(e, fn)
  else this.unlisten(e, fn)
}
function listeners(e) {
  const m = this._listeners
  return m ? m.get(e) || [] : []
}
function emit(e, arg) {
  const m = this._listeners
  if (!m) return
  const l = m.get(e)
  if (!l) return
  for (let i = l.length; i--;) l[i](arg)
  return this
}

const PROPERTIES = {
  on: {value: on},
  once: {value: once},
  unlisten: {value: unlisten},
  toggleListener: {value: toggleListener},
  listeners: {value: listeners},
  emit: {value: emit},
}

module.exports = function emitter(o) {
  Object.defineProperties(o, PROPERTIES)
}
