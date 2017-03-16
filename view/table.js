'use strict'
const itt = require('itt')
const h = require('../h')
const View = require('./view')
const ListBackedView = require('./list-backed-view')

class Table extends ListBackedView {
  init() {
    super.init()
    this._eligibleForEdit = false
    this._resize = null
    this._scrollX = 0
    this._itemSelector = '.v2-table-row'
    this._rowHeight = 24
    this.definitions = {}
    this._columns = []
    this._usedColumns = []
    this.Row = this.constructor.Row
    this._resizeMove = this._resizeMove.bind(this)
    this._resizeUp = this._resizeUp.bind(this)
    this._dragMove = this._dragMove.bind(this)
    this._dragUp = this._dragUp.bind(this)
  }
  build() {
    return h('.v2-view.v2-table', {tabIndex: 0, onmousedown: '_mouseDown', onclick: '_click', ondblclick: '_dblclick', onfocusout: '_blur'},
      h('.v2-table-header', {onwheel: '_wheel'},
        this._header = h('.v2-table-header-inner')),
      this.container = h('.v2-table-contents', {onscroll: '_scroll'},
        this._overflow = h('.v2-table-overflow')))
  }

  _wheel(e) {
    e.preventDefault()
    this.container.scrollTop += e.deltaY * (e.deltaMode === 1 ? this._rowHeight : e.deltaMode === 2 ? e.deltaY * this.container.offsetHeight : 1)
    this.container.scrollLeft += e.deltaX * (e.deltaMode === 1 ? this._rowHeight : e.deltaMode === 2 ? this.container.offsetWidth : 1)
  }
  _scroll() {
    this.scrollX = this.container.scrollLeft
    super._scroll()
  }
  get scrollX() {return this._scrollX}
  set scrollX(value) {
    if (this._scrollX === value) return
    this._scrollX = value
    this._header.style.transform = `translate(${-value}px,0)`
  }

  _blur(e) {
    if (e.target.classList.contains('v2-table-cell-editor')) {
      const r = h.nearest('.v2-table-row', e.target)
      if (r) r.view.acceptEdit()
    }
  }
  _mouseDown(e) {
    if (h.nearest('.v2-table-header', e.target)) {
      if (e.button === 2) {
        this.makeColumnMenu().show(this.app, e.clientX, e.clientY)
      }
      if (e.button !== 0) return
      const r = h.nearest('.v2-table-header-cell-resizer', e.target)
      if (r) {
        e.preventDefault()
        const index = +r.dataset.index
        const column = this.definitions[this._columns[index]]
        this._resize = {index, column, offset: column.width - e.clientX}
        document.addEventListener('mousemove', this._resizeMove, true)
        document.addEventListener('mouseup', this._resizeUp, true)
        return
      }
      const c = h.nearest('.v2-table-header-cell', e.target)
      if (c) {
        e.preventDefault()
        const index = +c.dataset.index
        const column = this.definitions[this._columns[index]]
        this._resize = {index, column, offset: -e.clientX}
        document.addEventListener('mousemove', this._dragMove, true)
        document.addEventListener('mouseup', this._dragUp, true)
      }
      return
    }
    clearTimeout(this._editTimeout)
    const c = e.button === 0 && e.detail === 1 && !e.metaKey && !e.shiftKey && !e.altKey && !e.ctrlKey && h.nearest('.v2-table-cell', e.target)
    const r = c && c.parentElement.view
    const a = this.app
    this._eligibleForEdit = (!a || !a.hadMenus) && r && r.selected && r._editing === -1 && this._selection.size === 1
    if (h.nearest('.v2-table-cell-editor', e.target)) return
    super._mouseDown(e)
  }
  _click(e) {
    const c = this._eligibleForEdit && h.nearest('.v2-table-cell', e.target)
    if (c) {
      const r = c.parentElement.view
      if (r && r.selected && r._editing === -1 && this._selection.size === 1) {
        const i = [].indexOf.call(r.el.children, c)
        const m = r.model
        this._editTimeout = setTimeout(() => document.activeElement === this.el && r.visible && r.model === m && r.selected && this._selection.size === 1 && r.editCell(i), 500)
      }
    }
  }
  _resizeMove(e) {
    const i = this._resize.index
    const w = Math.max(1, e.clientX + this._resize.offset)
    this._resize.column.width = w
    this.setColumnWidth(i, w)
    this.emit('user data change', {target: this})
    e.preventDefault()
  }
  _resizeUp(e) {
    this._resizeMove(e)
    this._resize = null
    document.removeEventListener('mousemove', this._resizeMove, true)
    document.removeEventListener('mouseup', this._resizeUp, true)
    e.preventDefault()
  }
  _dragMove(e) {
    const i = this._resize.index
    const c = this._headerCells[i]
    const t = c.style.transform = `translate3d(${e.clientX + this._resize.offset}px,0,0)`
    for (const v of this._cache.values()) v._isDragging(i, t)
    e.preventDefault()
  }
  _dragUp(e) {
    const i = this._resize.index
    this._headerCells[i].style.transform = ''
    for (const v of this._cache.values()) v._stopDragging(i)
    for (const v of this._unused) v._stopDragging(i)
    const x = this._columns.slice(0, i)
      .reduce((a, c) => a + this.definitions[c].width, 0) +
      this.definitions[this._columns[i]].width / 2 +
      e.clientX + this._resize.offset
    let z = 0, j = 0, w
    while (j < this._columns.length && x >= z + (w = this.definitions[this._columns[j]].width) / 2) z += w, ++j
    if (j > i) --j
    this._columns.splice(j, 0, ...this._columns.splice(i, 1))
    this.columns = this._columns
    this._resize = null
    document.removeEventListener('mousemove', this._dragMove, true)
    document.removeEventListener('mouseup', this._dragUp, true)
    e.preventDefault()
  }
  setColumnWidth(i, w) {
    for (const v of this._cache.values()) v.updateColumnWidth(i, w)
    for (const v of this._unused) v.updateColumnWidth(i, w)
    this._headerCells[i].style.width = `${w}px`
  }
  makeColumnMenu() {
    return new Menu({target: this.toggleColumn.bind(this), spec:
      itt.entries(this.definitions).map(([id, c]) =>
        [c.name, id, {state: this._columns.includes(id) ? 'checked' : ''}]).array()})
  }
  toggleColumn(column) {
    const i = this._columns.indexOf(column)
    if (i !== -1) this._columns.splice(i, 1)
    else {
      const keys = Object.keys(this.definitions)
      const j = keys.indexOf(column)
      const after = keys.slice(j + 1)
      const k = this._columns.findIndex(c => after.includes(c))
      if (k === -1) this._columns.push(column)
      else this._columns.splice(k, 0, column)
    }
    this.columns = this._columns
  }
  editCell(row, col) {
    if (typeof col === 'string') {
      col = this._usedColumns.indexOf(this.definitions[col])
      if (col === -1) return
    }
    this.scrollToIndexIfNecessary(row)
    const r = this._cache.get(this.model.get(row))
    if (r) r.editCell(col)
  }

  scrollToIndexIfNecessary(i) {
    if (!this.isLive) return
    const y0 = i * this._rowHeight
    const y1 = y0 + this._rowHeight
    const y = this._scrollY, yh = y + this._bb.height
    if (y0 < y) this.container.scrollTop += y0 - y
    else if (y1 >= yh) this.container.scrollTop += y1 - yh
  }

  get rowHeight() {return this._rowHeight}
  set rowHeight(value) {
    if (this._rowHeight === value) return
    this._rowHeight = value
    for (const v of this._cache.values()) v.height = value
    for (const v of this._unused) v.height = value
    if (this.isLive) this._reflow()
  }

  get columns() {return this._columns}
  set columns(value) {
    this._columns = value
    this._usedColumns = value.map(id => this.definitions[id])
    for (const v of this._cache.values()) v.columns = this._usedColumns
    for (const v of this._unused) v.columns = this._usedColumns
    h.removeChildren(this._header)
    this._headerCells = []
    h.add(this._header, this._usedColumns.map((c, i) => [
      this._headerCells[i] = h('.v2-table-header-cell', c.displayName == null ? c.name : c.displayName, {style: {width: `${c.width}px`}, title: c.name, dataset: {index: i}}),
      h('.v2-table-header-cell-resizer', {dataset: {index: i}}),
    ]))
    if (this.isLive) this._reflow()
    this.emit('user data change', {target: this})
  }
  get columnUserData() {
    return {
      sizes: itt.entries(this.definitions).map(([k, o]) => [k, o.width]).toObject(),
      visible: this._columns,
    }
  }
  set columnUserData(data) {
    if (!data) return
    if (data.sizes) for (const [k, w] of itt.entries(data.sizes)) {
      this.definitions[k].width = w
    }
    if (data.visible) this.columns = data.visible
  }

  _reflow() {
    if (!this._model) {
      this._unused.push(...this._cache.values())
      this._cache.clear()
      for (const unused of this._unused) unused.visible = false
      this._overflow.style.height = 0
      return
    }
    const buffer = 4
    const start = Math.max(0, Math.floor(this._scrollY / this._rowHeight) - buffer)
    const end = Math.min(this._model.length, Math.floor((this._scrollY + this._bb.height) / this._rowHeight) + 1 + buffer)
    const unused = new Map(this._cache)
    for (let i = start; i < end; ++i) unused.delete(this._model.get(i))
    for (const [k, v] of unused) {
      this._cache.delete(k)
      this._unused.push(v)
    }
    for (let i = start; i < end; ++i) {
      const view = this._dequeue(i)
      if (!view) continue
      view.index = i
      view.selected = this._selection.has(i)
      view.y = i * this._rowHeight
    }
    for (const unused of this._unused) unused.visible = false
    this._overflow.style.height = this._model.length * this._rowHeight + 'px'
  }
  _dequeue(i) {
    const m = this._model.get(i)
    if (!m) return null
    const item = this._cache.get(m)
    if (item) return item
    let unused = this._unused.pop()
    if (!unused) {
      this.add(unused = new this.Row({columns: this._usedColumns}))
      unused.height = this._rowHeight
    } else {
      unused.visible = true
    }
    unused.model = m
    this._cache.set(m, unused)
    return unused
  }
}
Table.keyBindings = Table.keyBindings.concat([
  {key: 'ArrowUp', command: 'selectPrevious'},
  {key: 'ArrowDown', command: 'selectNext'},
  {key: '^ArrowUp', command: 'selectPrevious', args: [true]},
  {key: '^ArrowDown', command: 'selectNext', args: [true]},
])
Table.Row = class Row extends View {
  init() {
    this.index = null
    this._selected = false
    this._visible = true
    this._model = null
    this._height = null
    this._y = null
    this._changed = this._changed.bind(this)
    this._columns = []
    this._dragging = false
    this._editing = -1
    this._editor = null
  }
  build() {
    return h('.v2-table-row')
  }

  get columns() {return this._columns}
  set columns(value) {
    this._columns = value
    h.removeChildren(this.el)
    h.add(this.el, this._cells = value.map(c =>
      h('.v2-table-cell' + (c.cellClass ? '.'+c.cellClass : ''), {style: {width: `${c.width}px`}})))
    if (this._model) this._update()
  }
  updateColumnWidth(i, w) {
    this._cells[i].style.width = `${w}px`
    if (this._editing === i) this._editor.style.width = `${w}px`
  }
  _isDragging(i, t) {
    this._cells[i].style.transform = t
    if (!this._dragging) this._cells[i].classList.add('v2-table-cell--dragging')
    this._dragging = true
  }
  _stopDragging(i) {
    this._dragging = false
    this._cells[i].style.transform = ''
    this._cells[i].classList.remove('v2-table-cell--dragging')
  }
  editCell(i) {
    if (typeof i === 'string') {
      i = this._columns.indexOf(this.parent.definitions[i])
      if (i === -1) return
    }
    if (!this._columns[i].editable) return
    this.cancelEdit()
    this._cells[this._editing = i].style.visibility = 'hidden'
    let x = 0
    for (let j = 0; j < i; ++j) x += this._columns[j].width
    const c = this._columns[i]
    this._editor = h('input.v2-table-cell-editor'+(c.cellClass ? '.' + c.cellClass : ''), {
      style: {transform: `translate3d(${x}px,0,0)`, width: c.width+'px'},
      onkeydown: e => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          if (e.key === 'Enter') this.acceptEdit()
          else this.cancelEdit()
          e.preventDefault()
          e.stopPropagation()
        }
      },
    })
    this._editor.value = this._cells[i].textContent
    this.el.appendChild(this._editor)
    setTimeout(() => this._editor.select())
  }
  acceptEdit() {
    const i = this._editing
    if (i !== -1) {
      const c = this._columns[i]
      const t = this._editor.value
      if (typeof c.editable === 'function') c.editable(this.model, c.key, t)
      else this.model[c.key] = t
    }
    this.cancelEdit()
  }
  cancelEdit() {
    if (this._editing !== -1) {
      this._cells[this._editing].style.visibility = ''
      this._editing = -1
      if (this._editor) {
        this._editor.remove()
        this._editor = null
      }
    }
  }

  get selected() {return this._selected}
  set selected(value) {
    value = !!value
    if (this._selected === value) return
    this._selected = value
    this.el.classList.toggle('v2-table-row--selected', value)
  }

  get y() {return this._y}
  set y(value) {
    if (this._y !== value) {
      this.el.style.transform = `translate3d(0,${this._y = value}px,0)`
    }
  }
  get height() {return this._height}
  set height(value) {
    if (this._height !== value) {
      this.el.style.height = this.el.style.lineHeight = `${this._height = value}px`
    }
  }

  get visible() {return this._visible}
  set visible(value) {
    value = !!value
    if (this._visible === value) return
    if (!(this._visible = value)) {
      this.y = 0
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
    this.cancelEdit()
    if (this._model) this._unlisten()
    if ((this._model = value) && this.isLive) {
      this._update()
      this._listen()
    }
  }
  _unlisten() {this._model.unlisten('change', this._changed)}
  _listen() {this._model.on('change', this._changed)}
  _changed() {this._update()}
  _update() {
    for (let i = this._columns.length; i--;) {
      const col = this._columns[i]
      let value = this._model[col.key]
      if (col.transform) value = col.transform(value, this._model, col.key, this._cells[i])
      this._cells[i].textContent = value
    }
  }
}

module.exports = Table
