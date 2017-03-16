'use strict'
const h = require('../h')
const View = require('./view')
const ListBackedView = require('./list-backed-view')

class Collection extends ListBackedView {
  init() {
    super.init()
    this._itemSelector = '.v2-collection-item'
    this._tileWidth = 200
    this._tileHeight = 275
    this._justifyTiles = true
    this.itemsPerLine = 1
    this.Item = this.constructor.Item
  }
  build() {
    return h('.v2-view.v2-collection', {tabIndex: 0, onscroll: '_scroll', onmousedown: '_mouseDown', ondblclick: '_dblclick'},
      this._overflow = h('.v2-collection-overflow'))
  }

  selectLeft(add) {
    let i = itt.last(this._selection)
    if (i == null) return this.selectFirst()
    const first = (i / this.itemsPerLine | 0) * this.itemsPerLine
    if (i === first) return
    while (!this._model.get(--i)) if (i <= first) return
    this.select(i, add)
    this.scrollToIndexIfNecessary(i)
  }
  selectRight(add) {
    let i = itt.last(this._selection)
    if (i == null) return this.selectFirst()
    const last = (i / this.itemsPerLine + 1 | 0) * this.itemsPerLine - 1
    if (i === last) return
    while (!this._model.get(++i)) if (i >= last) return
    this.select(i, add)
    this.scrollToIndexIfNecessary(i)
  }
  selectUp(add) {
    let i = itt.last(this._selection)
    if (i == null) return this.selectFirst()
    const start = i % this.itemsPerLine
    if (i === start) return
    while (!this._model.get(i -= this.itemsPerLine)) if (i <= start) return
    this.select(i, add)
    this.scrollToIndexIfNecessary(i)
  }
  selectDown(add) {
    let i = itt.last(this._selection)
    if (i == null) return this.selectFirst()
    const end = this._model.length - (this._model.length - i) % this.itemsPerLine
    if (i === end) return
    while (!this._model.get(i += this.itemsPerLine)) if (i >= end) return
    this.select(i, add)
    this.scrollToIndexIfNecessary(i)
  }
  scrollToIndexIfNecessary(i) {
    if (!this.isLive) return
    const y0 = Math.floor(i / this.itemsPerLine) * this._tileHeight
    const y1 = y0 + this._tileHeight
    const y = this._scrollY, yh = y + this._bb.height
    if (y0 < y) this.el.scrollTop += y0 - y
    else if (y1 >= yh) this.el.scrollTop += y1 - yh
  }

  setTileSize(w, h) {
    this._tileWidth = w
    this._tileHeight = h
    for (const v of this._cache.values()) v.setSize(w, h)
    for (const v of this._unused) v.setSize(w, h)
    if (this.isLive) this._reflow()
  }
  _reflow() {
    if (!this._model) {
      this._unused.push(...this._cache.values())
      this._cache.clear()
      for (const unused of this._unused) unused.visible = false
      this._overflow.style.height = 0
      return
    }
    const perLine = this.itemsPerLine = Math.floor(this._bb.width / this._tileWidth)
    const buffer = 4
    const startLine = Math.max(0, Math.floor(this._scrollY / this._tileHeight) - buffer)
    const endLine = Math.floor((this._scrollY + this._bb.height) / this._tileHeight) + 1 + buffer
    const j = Math.min(this._model.length, endLine * perLine)
    const unused = new Map(this._cache)
    for (let i = startLine * perLine; i < j; ++i) {
      unused.delete(this._model.get(i))
    }
    for (const [k, v] of unused) {
      this._cache.delete(k)
      this._unused.push(v)
    }
    const distWidth = this._tileWidth + (this._bb.width - this._tileWidth * perLine) / (perLine - 1)
    for (let x = 0, y = startLine, i = startLine * perLine; i < j; ++i) {
      const view = this._dequeue(i)
      if (!view) continue
      view.index = i
      view.selected = this._selection.has(i)
      view.setPosition(this._justifyTiles ? x * distWidth | 0 : x * this._tileWidth, y * this._tileHeight)
      ++x
      if (x === perLine) x = 0, ++y
    }
    for (const unused of this._unused) unused.visible = false
    this._overflow.style.height = Math.ceil(this._model.length / perLine) * this._tileHeight + 'px'
  }
  _dequeue(i) {
    const m = this._model.get(i)
    if (!m) return null
    const item = this._cache.get(m)
    if (item) return item
    let unused = this._unused.pop()
    if (!unused) {
      this.add(unused = new this.Item())
      unused.setSize(this._tileWidth, this._tileHeight)
    } else {
      unused.visible = true
    }
    unused.model = m
    this._cache.set(m, unused)
    return unused
  }
}
Collection.keyBindings = Collection.keyBindings.concat([
  {key: 'ArrowLeft', command: 'selectLeft'},
  {key: 'ArrowRight', command: 'selectRight'},
  {key: 'ArrowUp', command: 'selectUp'},
  {key: 'ArrowDown', command: 'selectDown'},
])
Collection.Item = class Item extends View {
  init() {
    this.index = null
    this._selected = false
    this._visible = true
    this._model = null
    this._width = null
    this._height = null
    this._x = null
    this._y = null
    this._changed = this._changed.bind(this)
  }
  build() {
    return h('.v2-collection-item')
  }

  get selected() {return this._selected}
  set selected(value) {
    value = !!value
    if (this._selected === value) return
    this._selected = value
    this.el.classList.toggle('v2-collection-item--selected', value)
  }

  setPosition(x, y) {
    if (this._x !== x || this._y !== y) {
      this.el.style.transform = `translate3d(${this._x = x}px,${this._y = y}px,0)`
    }
  }
  setSize(width, height) {
    if (this._width !== width) {
      this.el.style.width = `${this._width = width}px`
    }
    if (this._height !== height) {
      this.el.style.height = `${this._height = height}px`
    }
  }

  get visible() {return this._visible}
  set visible(value) {
    value = !!value
    if (this._visible === value) return
    if (!(this._visible = value)) {
      this.setPosition(0, 0)
    }
    this.el.style.visibility = value ? 'visible' : 'hidden'
  }

  _onActivate() {
    if (this._model) {
      this._update()
      this._listen()
    }
  }
  _onDeactivate() {if (this._model) this._unlisten()}

  get model() {return this._model}
  set model(value) {
    if (this._model === value) return
    if (this._model) this._unlisten()
    if ((this._model = value) && this.isLive) {
      this._update()
      this._listen()
    }
  }
  _unlisten() {this._model.unlisten('change', this._changed)}
  _listen() {this._model.on('change', this._changed)}
  _changed() {this._update()}
  _update() {}
}

module.exports = Collection
