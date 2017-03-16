'use strict'
const emitter = require('../emitter')
const {immediate} = require('../util')

class List {
  constructor(data) {
    this._data = data || []
    this._changes = []
    this._lengthChange = null
    this._immediate = false
    this._sendChanges = this._sendChanges.bind(this)
  }

  get data() {return this._data.slice()}
  set data(xs) {
    const old = this._data
    this._data = xs
    this._splice(0, xs.length, old.slice())
  }

  get length() {return this._data.length}
  set length(value) {
    const l = this._data.length
    const original = this._data.slice()
    this._data.length = value
    const nl = this._data.length
    if (l < nl) this._splice(l, nl - l, [])
    else if (l > nl) this._splice(nl, 0, original.slice(nl))
  }
  get(i) {return this._data[this._index(i)]}
  set(i, value) {
    i = this._index(i)
    const oldValue = this._data[i]
    this._data[i] = value
    this._replaced(i, [oldValue])
    return this
  }
  fill(value, start, end) {
    start = start == null ? 0 : this._index(start)
    end = end == null ? this.length : this._index(end)
    const original = this._data.slice(start, end)
    this._data.fill(value, start, end)
    this._replaced(start, original)
    return this
  }
  copyWithin(target, start, end) {
    target = this._index(target)
    start = start == null ? 0 : this._index(start)
    end = end == null ? this.length : this._index(end)
    const targetLength = Math.min(end - start, this.length - target)
    const original = this._data.slice(target, target + targetLength)
    this._data.copyWithin(target, start, end)
    this._splice(target, original)
    return this
  }
  _index(i) {
    const length = this.length
    i = i | 0
    if (i < 0) i += length
    return i < 0 ? 0 : i > length ? length : i
  }

  push(...xs) {
    const l = this.length
    this._data.push(...xs)
    this._splice(l, xs.length, [])
  }
  pop() {
    const x = this._data.pop()
    this._splice(this.length, 0, [x])
    return x
  }
  unshift(...xs) {
    this._data.unshift(...xs)
    this._splice(0, xs.length, [])
  }
  shift() {
    const x = this._data.shift()
    this._splice(0, 0, [x])
    return x
  }
  splice(i, remove, ...add) {
    const removed = this._data.splice(i, remove, ...add)
    this._splice(i, add.length, removed.slice())
    return removed
  }
  reverse() {
    const original = this._data.slice()
    this._data.reverse()
    this._splice(0, this.length, original)
    return this
  }
  sort(fn) {
    const original = this._data.slice()
    this._data.sort(fn)
    this._replaced(0, original)
    return this
  }

  _splice(i, added, removed) {
    const d = this._data
    for (let j = i, k = 0;;) {
      for (let m = k; m < removed.length; ++m) {
        for (let l = j; l < i + added; ++l) {
          if (removed[m] === d[l]) {
            this._rawSplice(j, l - j, removed.slice(k, m))
            j = l + 1
            k = m + 1
            while (k < removed.length && j < i + added && removed[k] === d[j]) {++k, ++j}
            continue
          }
        }
      }
      this._rawSplice(j, i + added - j, removed.slice(k))
      break
    }
    if (added !== removed.length) {
      const c = this._lengthChange, l = this.length
      if (c) c.value = l
      else this._lengthChange = {target: this, name: 'length', value: l, oldValue: l - added + removed.length}
    }
  }
  _rawSplice(i, added, removed) {
    if (added === 0 && removed.length === 0) return
    this._changed(added === removed.length ?
      {type: 'replace', start: i, end: i + added, oldValues: removed} :
      {type: 'splice', index: i, added, removed})
  }
  _replaced(i, oldValues) {this._splice(i, oldValues.length, oldValues)}
  _changed(data) {
    if (!this._immediate) {
      immediate(this._sendChanges)
      this._immediate = true
    }
    this._changes.push(data)
  }
  _sendChanges() {
    this._immediate = false
    if (this._lengthChange) {
      this.emit('length change', this._lengthChange)
    }
    this.emit('change', {target: this, changes: this._changes.slice()})
    this._changes.length = 0
  }

  [Symbol.iterator]() {return this._data[Symbol.iterator]()}
  entries() {return this._data.entries()}
  values() {return this._data.values()}
  keys() {return this._data.keys()}

  forEach(fn, self) {this._data.forEach(fn, self)}
  map(fn, self) {return this._data.map(fn, self)}
  filter(fn, self) {return this._data.filter(fn, self)}
  some(fn, self) {return this._data.some(fn, self)}
  every(fn, self) {return this._data.every(fn, self)}
  reduce(fn, start) {return this._data.reduce(fn, start)}
  reduceRight(fn, start) {return this._data.reduceRight(fn, start)}

  includes(x) {return this._data.includes(x)}
  indexOf(x) {return this._data.indexOf(x)}
  lastIndexOf(x) {return this._data.lastIndexOf(x)}
  find(fn, self) {return this._data.find(fn, self)}
  findIndex(fn, self) {return this._data.findIndex(fn, self)}

  join(sep) {return this._data.join(sep)}
  toLocaleString() {return this._data.toLocaleString()}
  toString() {return this._data.toString()}
  toJSON() {return this._data}
}
emitter(List.prototype)
module.exports = List
