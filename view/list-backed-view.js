'use strict'
const h = require('../h')
const View = require('./view')

class ListBackedView extends View {
  // TODO support collections containing multiple identical items
  init() {
    this._cache = new Map
    this._unused = []
    this._bb = null
    this._model = null
    this._scrollY = 0
    this._selection = new Set
    this._reflow = this._reflow.bind(this)
    this._changed = this._changed.bind(this)
    this.keyBindings = this.constructor.keyBindings
  }
  menu() {}
  dblclick() {}

  get model() {return this._model}
  set model(value) {
    if (this._model === value) return
    if (this._model && this.isLive) this._unlisten()
    this._model = value
    if (this.isLive) {
      if (this._model) this._listen()
      this._reflow()
    }
  }
  _onActivate() {
    this._selection.clear()
    this.resize()
    if (this._model) this._listen()
  }
  _onDeactivate() {
    this._bb = null
    if (this._model) this._unlisten()
  }
  _listen() {this._model.on('change', this._changed)}
  _unlisten() {this._model.unlisten('change', this._changed)}
  _changed(e) {
    const selection = Array.from(this._selection)
    for (const c of e.changes) {
      if (c.type === 'splice') {
        const rend = c.index + c.removed.length
        for (let i = c.index; i < rend; ++i) {
          const k = selection.indexOf(i)
          if (k !== -1) selection.splice(k, 1)
        }
        const d = c.added - c.removed.length
        if (d) {
          const l = selection.length
          for (let i = 0; i < l; ++i) {
            if (selection[i] >= rend) selection[i] += d
          }
        }
      } else if (c.type !== 'replace') {
        for (let i = c.start; i < c.end; ++i) {
          const k = selection.indexOf(i)
          if (k !== -1) selection.splice(k, 1)
        }
      }
    }
    this._selection = new Set(selection)
    this._reflow()
  }

  _mouseDown(e) {
    if (!this.container.contains(e.target)) return
    const item = h.nearest(this._itemSelector, e.target)
    const i = item && item.view.index
    if (item) {
      if (e.metaKey || e.ctrlKey) {
        this.toggleSelect(i)
      } else if (e.shiftKey && this._selection.size) {
        this.selectRange(itt.last(this._selection), i, true)
      } else if (e.button !== 2 || !this._selection.has(i)) {
        this.select(i)
      }
    } else {
      this.clearSelection()
    }
    if (e.button === 2) {
      const m = this.menu && this.menu(this.selectedItems)
      if (m) {
        if (m.then) m.then(m => m.show(this.app, e.clientX, e.clientY))
        else m.show(this.app, e.clientX, e.clientY)
      }
      return
    }
  }
  _dblclick(e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || !this.container.contains(e.target) || e.target.localName === 'input') return
    this.activateSelection()
  }
  activateSelection() {this.dblclick(this.selectedItems)}
  focus() {this.el.focus()}

  selectPrevious(add) {
    let i = itt.last(this._selection)
    if (i == null || i === 0) return this.selectFirst()
    while (!this._model.get(--i)) if (i <= 0) return
    this.select(i, add)
    this.scrollToIndexIfNecessary(i)
  }
  selectNext(add) {
    let i = itt.last(this._selection)
    const last = this.model.length
    if (i == null || i >= last) return this.selectFirst()
    while (!this._model.get(++i)) if (i >= last) return
    this.select(i, add)
    this.scrollToIndexIfNecessary(i)
  }
  selectFirst(add) {
    let j = 0
    for (; !this._model.get(j); ++j) {
      if (j >= this._model.length) return
    }
    this.select(j, add)
    this.scrollToIndexIfNecessary(j)
    return this
  }
  selectLast(add) {
    let j = this.model.length - 1
    for (; !this._model.get(j); --j) {
      if (j <= 0) return
    }
    this.select(j, add)
    this.scrollToIndexIfNecessary(j)
    return this
  }
  selectAll() {
    if (this.model.length) this.selectRange(0, this.model.length - 1)
  }
  toggleSelect(i) {
    if (this._selection.has(i)) {
      this.deselect(i)
    } else {
      this.select(i, true)
    }
    return this
  }
  deselect(i) {
    this._selection.delete(i)
    const item = this.itemAtIndex(i)
    if (item) item.selected = false
    return this
  }
  select(i, add) {return this.selectRange(i, i, add)}
  selectRange(i, j, add) {
    if (i > j) [i, j] = [j, i]
    if (!add) this.clearSelection()
    for (let k = i; k <= j; ++k) {
      this._selection.add(k)
      const item = this.itemAtIndex(k)
      if (item) item.selected = true
    }
    return this
  }
  clearSelection() {
    for (const i of this._selection) {
      const item = this.itemAtIndex(i)
      if (item) item.selected = false
    }
    this._selection.clear()
    return this
  }
  scrollToIndexIfNecessary(i) {}
  itemAtIndex(i) {
    const m = this.model.get(i)
    if (!m) return null
    return this._cache.get(m)
  }

  get selectedItems() {return Array.from(this._selection).map(i => this._model.get(i))}
  get selectedRows() {return Array.from(this._selection)}

  showMenu(items, x, y) {
    if (!items) items = this.selectedItems
    if (!Array.isArray(items)) items = [items]
    const m = this.menu && this.menu(items)
    if (!m) return
    const done = m => {
      if (x == null) {
        for (const item of this._cache.values()) {
          if (item.selected) {
            const bb = item.el.getBoundingClientRect()
            x = bb.left + 5
            y = bb.top + 5
            break
          }
        }
        if (x == null) {
          x = this._bb.left
          y = this._bb.top
        }
      }
      m.show(this.app, x, y)
    }
    if (m.then) return m.then(done)
    else done(m)
  }

  resize() {
    this._bb = this.container.getBoundingClientRect()
    this._scroll()
  }
  _scroll() {
    this._scrollY = this.container.scrollTop
    this._reflow()
  }

  _reflow() {}
}
ListBackedView.keyBindings = [
  {key: 'Enter', command: 'activateSelection'},
]

module.exports = ListBackedView
