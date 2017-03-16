'use strict'
const List = require('./list')
const emitter = require('../emitter')

class FilteredList {
  constructor(o) {
    if (o instanceof List) o = {model: o}
    this._data = []
    this._changes = []
    this._lengthChange = null
    this._immediate = false
    this._sendChanges = this._sendChanges.bind(this)

    this._indices = []
    this._model = null
    this._include = null
    // this._transform = null
    this._compare = null
    this._modelChanged = this._modelChanged.bind(this)
    Object.assign(this, o)
  }

  get data() {throw new Error('Invalid')}
  get length() {return this._data.length}

  set() {throw new Error('Immutable')}
  fill() {throw new Error('Immutable')}
  copyWithin() {throw new Error('Immutable')}
  push() {throw new Error('Immutable')}
  pop() {throw new Error('Immutable')}
  unshift() {throw new Error('Immutable')}
  shift() {throw new Error('Immutable')}
  splice() {throw new Error('Immutable')}
  reverse() {throw new Error('Immutable')}
  invert() {
    const f = this._include
    this.include = x => !f(x)
  }
  sort(fn) {this.compare = fn || ((a, b) => (''+a).localeCompare(''+b))}

  get model() {return this._model}
  set model(value) {
    if (this._model === value) return
    if (this._model) this._unlisten()
    if (this._model = value) this._listen()
    this._updateAll()
  }
  destroy() {if (this._model) this._unlisten()}
  _listen() {this._model.on('change', this._modelChanged)}
  _unlisten() {this._model.unlisten('change', this._modelChanged)}
  _modelChanged(e) {
    const f = this._include
    this._changes.length = 0
    for (const c of e.changes) {
      if (c.type === 'splice') {
        let i = c.index
        for (const m of c.removed) {
          const j = this._indices[i]
          if (j != null) this._delete(j, i)
          ++i
        }
        const l = c.index + c.added
        for (let i = c.index; i < l; ++i) {
          const m = this._model._data[i]
          const include = !f || f(m)
          if (include) this._insert(m, i)
        }
      } else if (c.type === 'replace') {
        for (let i = c.start; i < c.end; ++i) {
          const m = this._model._data[i]
          const include = !f || f(m)
          const j = this._indices[i]
          if (include) {
            if (j == null) this._insert(m, i)
            else this._update(j, m)
          } else if (j != null) {
            this._delete(j, i)
          }
        }
      }
    }
    this._sendChanges()
  }
  _insert(y, i) {
    const c = this._compare
    let j
    if (c) {
      const l = this._data.length
      for (j = 0; j < l && c(y, this._data[j]) > 0; ++j) {}
    } else {
      while (j == null && i < this._model._data.length) j = this._indices[i++]
      if (j == null) j = this._data.length
    }
    for (let l = 0; l < this._indices.length; ++l) {
      const k = this._indices[l]
      if (k != null && k >= j) ++this._indices[l]
    }
    this._changes.push({type: 'splice', index: j, added: 1, removed: []})
    this._data.splice(j, 0, y)
    this._indices[i] = j
  }
  _delete(j, i) {
    const old = this._data[j]
    this._changes.push({type: 'splice', index: j, added: 0, removed: [old]})
    this._data.splice(j, 1)
    this._indices[i] = null
    for (let l = 0; l < this._indices.length; ++l) {
      const k = this._indices[l]
      if (k != null && k > j) --this._indices[l]
    }
  }
  _update(j, y) {
    const old = this._data[j]
    this._changes.push({type: 'replace', start: j, end: j + 1, oldValues: [old]})
  }
  _changed(c) {this._changes.push(c)}
  _sendChanges() {this.emit('change', {target: this, changes: this._changes})}

  get include() {return this._include}
  set include(value) {
    if (this._include === value) return
    this._include = value
    this._updateAll()
  }
  // get transform() {return this._transform}
  // set transform(value) {
  //   if (this._transform === value) return
  //   this._transform = value
  //   this._updateAll()
  // }
  get compare() {return this._compare}
  set compare(value) {
    if (this._compare === value) return
    this._compare = value
    this._updateAll()
  }

  resort() {this._updateAll()}
  _updateAll() {
    const old = this._data.slice()
    if (!this._model) {
      this._data.length = 0
      this._indices.length = 0
      this._changes.length = 0
      this._splice(0, 0, old)
      this._sendChanges()
      return
    }
    const data = []
    const f = this._include
    let index = 0
    for (const x of this._model._data) {
      if (!f || f(x)) data.push({index, value: x})
      ++index
    }
    if (this._compare) {
      data.sort((x, y) => this._compare(x.value, y.value))
    }
    this._data = data.map(x => x.value)
    let j = 0
    for (const x of data) this._indices[x.index] = j++
    this._changes.length = 0
    this._splice(0, this._data.length, old)
    this._sendChanges()
  }
}
emitter(FilteredList.prototype)
for (const k of '_splice _rawSplice _replaced _index get entries values keys forEach map filter some every reduce reduceRight includes indexOf lastIndexOf find findIndex join toLocaleString toString'.split(' ').concat(Symbol.iterator)) {
  FilteredList.prototype[k] = List.prototype[k]
}
module.exports = FilteredList
