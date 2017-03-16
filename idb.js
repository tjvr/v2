'use strict'

class Cursor {
  constructor(direction) {
    this._cursor = null
    this.direction = direction
    this._continue = null
  }
  _reinit(cursor) {this._cursor = cursor}
  get source() {return this._cursor.source}
  get key() {return this._cursor.key}
  get primaryKey() {return this._cursor.primaryKey}
  get value() {return this._cursor.value}
  update(value) {this._cursor.update(value)}
  continue(k) {
    if (k) throw new Error('Unimplemented')
    this._continue()
  }
  advance() {throw new Error('Unimplemented')}
}

class Request {
  constructor(source, transaction) {
    this.source = source
    this.readyState = 'pending'
    this.result = null
    this.error = null
    this.onsuccess = null
    this.onerror = null
  }
  _success(result) {
    this.result = result
    const e = {type: 'success', target: this}
    if (this.onsuccess) this.onsuccess(e)
  }
  _error(err) {
    this.error = err
    const e = {type: 'error', target: this}
    if (this.onerror) this.onerror(e)
  }
}

function anyOf(source, keys, direction) {
  if (!direction) direction = 'next'
  if (direction.startsWith('prev')) throw new Error('Unimplemented')
  const isOS = source instanceof IDBObjectStore
  const realDir = isOS || source.unique ? 'nextunique' : direction
  keys = keys.sort()
  let i = 0
  const rc = new Cursor(direction)
  rc._continue = function() {
    if (direction === 'nextunique') {
      if (++i === keys.length) return rr._success()
      this._cursor.continue(keys[i])
    } else this._cursor.continue()
  }
  const rr = new Request(source, (isOS ? source : source.objectStore).transaction)
  const r = source.openCursor(undefined, direction)
  r.onsuccess = e => {
    const c = r.result
    if (!c) return rr._success()
    while (c.key > keys[i]) if (++i === keys.length) return rr._success()
    if (c.key === keys[i]) {
      rc._reinit(c)
      rr._success(rc)
    } else {
      c.continue(keys[i])
    }
  }
  r.onerror = e => rr._error(r.error)
  return rr
}

function startsWith(source, prefix, direction) {
  return source.openCursor(IDBKeyRange.bound(prefix, prefix + '\uffff'))
}

function or(r1, r2) {
  if (r1.source !== r2.source) {
    throw new TypeError('idb.or() sources must match')
  }
  const pks = new Set
  const rc = new Cursor(null)
  const rr = new Request(r1.source, (r1.source instanceof IDBObjectStore ? r1.source : r1.source.objectStore).transaction)

  let inProgress = false, queued = null, done = 0, error = null
  rc._continue = () => {
    if (error) return
    inProgress = false
    this._cursor.continue()
    if (!queued) return
    rc._reinit(queued)
    queued = null
    rr._success(rc)
  }
  r1.onsuccess = r2.onsuccess = e => {
    const c = e.target.result
    if (!c) return ++done === 2 && rr._success()
    if (pks.has(c.primaryKey)) return c.continue()
    pks.add(c.primaryKey)
    if (inProgress) {
      queued = c
    } else {
      inProgress = true
      rc._reinit(c)
      rr._success(rc)
    }
  }
  r1.onerror = r2.onerror = e => rr._error(error = e.target.error)
  return rr
}

module.exports = {anyOf, startsWith, or}
