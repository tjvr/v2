'use strict'
const idb = require('./idb')

class Database {
  constructor($) {this.$ = $}
  get name() {return this.$.name}
  get version() {return this.$.version}
  get objectStoreNames() {return [...this.$.objectStoreNames]}
  transaction(names, mode) {return new Transaction(this, this.$.transaction(names, mode))}
}

class Transaction {
  constructor(db, $) {this._db = db, this.$ = $}
  get mode() {return this.$.mode}
  get db() {return this._db}

  objectStore(name) {return new ObjectStore(this, this.$.objectStore(name))}
  do(fn) {
    return Promise.all([fn(this), this.done])
  }
  get done() {return this._done || (this._done = new Promise((r, j) => {
    this.$.oncomplete = () => r()
    this.$.onerror = this.$.onabort = () => j(this.$.error)
  }))}
}

class ObjectStore {
  constructor(tx, $) {this._tx = tx, this.$ = $}
  get name() {return this.$.name}
  get keyPath() {return this.$.keyPath}
  get indexNames() {return [...this.$.indexNames]}
  get transaction() {return this._tx}
  get autoIncrement() {return this.$.autoIncrement}

  put(value, key) {return request(this.$.put(value, key))}
  add(value, key) {return request(this.$.add(value, key))}
  delete(key) {return request(this.$.delete(key))}
  get(key) {return request(this.$.get(key))}
  clear() {return request(this.$.clear())}

  each(fn) {return this.iterate().each(fn)}
  iterate(range, direction, found) {return new Cursor(this.$.openCursor(range, direction))}
  iterateAnyOf(keys, direction) {return new Cursor(idb.anyOf(this.$, keys, direction))}
  iterateStartingWith(prefix, direction) {return new Cursor(idb.startsWith(this.$, prefix, direction))}

  do(fn) {return Promise.all([fn(this), this._tx.done])}
}

class Cursor {
  constructor($) {this.$ = $}
  each(fn) {return new Promise((r, j) => {
    this.$.onsuccess = e => {
      const c = e.target.result
      if (!c) return r()
      fn(c)
      c.continue()
    }
    this.$.onerror = e => j(e.target.error)
  })}
  collect(items, fn) {
    if (!fn) [items, fn] = [[], items]
    return this.each(c => items.push(fn(c))).then(() => items)
  }
  find(fn) {
    if (!fn) fn = x => x
    return new Promise((r, j) => {
      this.$.onsuccess = e => {
        const c = e.target.result
        if (!c) return r(null)
        const x = fn(c)
        if (x) r(x)
        else c.continue()
      }
      this.$.onerror = () => j(e.target.error)
    })
  }
}

function request(req) {return new Promise((r, j) => {
  req.onsuccess = () => r(req.result)
  req.onerror = () => j(req.error)
})}

module.exports = {Database, Transaction, ObjectStore, Cursor, request}
