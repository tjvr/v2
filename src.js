'use strict'
require('./polyfill')
const h = require('./h')
const itt = require('itt')
const emitter = require('./emitter')
const rt = require('./rt')
const {ucfirst, immediate, escapeRegExp} = require('./util')

const v2 = {}

const watchableProperty = require('./watchable-property')
class Model {
  constructor(o) {if (o) Object.assign(this, o)}
  sendAllProperties(fn) {
    for (const name of this.dataProperties) this.sendProperty(name, fn)
    return this
  }
  sendProperty(name, fn) {
    fn({target: this, name, value: this[name], oldValue: null})
    return this
  }
  toJSON() {
    const o = {}
    for (const k of this.dataProperties) o[k] = this[k]
    return o
  }

  static _property(name, opts) {
    this.dataProperties.push(name)
    watchableProperty(this.prototype, name, opts)
  }
  static properties(...args) {
    for (const a of args) {
      if (typeof a === 'string') {
        for (const k of a.split(/\s*,\s*/)) this._property(k)
      } else if (Array.isArray(a)) {
        a.forEach(this.properties)
      } else if (typeof a === 'object') {
        for (const k in a) this._property(k, a[k])
      }
    }
  }
  static get dataProperties() {
    if (Object.prototype.hasOwnProperty.call(this.prototype, 'dataProperties')) {
      return this.prototype.dataProperties
    }
    return this.prototype.dataProperties = (this.prototype.dataProperties || []).slice()
  }
}
Model.prototype.dataProperties = []
emitter(Model.prototype)

v2.bind = function bind(a, aPath, b, bPath) {
  if (typeof aPath === 'string') aPath = aPath.split('.')
  if (typeof bPath === 'string') bPath = bPath.split('.')
  return new v2.bind.Binding(new v2.bind.Side(a, aPath), new v2.bind.Side(b, bPath))
}
v2.watch = function watch(a, aPath, fn) {
  if (typeof aPath === 'string') aPath = aPath.split('.')
  const w = new v2.bind.Watcher(a, aPath)
  if (fn) w.on('change', fn)
  return w
}
v2.bind.Binding = class Binding {
  constructor(a, b) {
    this.a = a
    this.b = b
    a.other = b
    b.other = a
    a.update()
  }
  detach() {
    this.a.detach()
    this.b.detach()
  }
}
v2.bind.Side = class Side {
  constructor(target, path) {
    this.target = target
    this.path = path
    this.intermediates = []
    this.other = null
    this._reflectChange = this._reflectChange.bind(this)

    for (let x = target, i = 0, l = path.length; x && i < l - 1;) {
      const name = path[i++]
      this.intermediates.push(x)
      x.on(`${name} change`, this._reflectChange)
      x = x[name]
    }
  }

  detach() {
    for (const [i, x] of this.intermediates.entries()) {
      x.unlisten(`${this.path[i]} change`, this._reflectChange)
    }
  }

  get isIncomplete() {return this.intermediates.length < this.path.length}

  get value() {
    if (this.isIncomplete) return null
    return itt.last(this.intermediates)[itt.last(this.path)]
  }
  set value(value) {
    if (this.isIncomplete) return
    itt.last(this.intermediates)[itt.last(this.path)] = value
  }

  update() {
    if (this.isIncomplete) return
    const value = this.other.value
    if (!value) return
    const object = itt.last(this.intermediates)
    const name = itt.last(this.path)
    if (object[name] !== value) object[name] = value
  }

  _reflectChange(e) {
    const i = this.intermediates.indexOf(e.target)
    if (i === -1) return

    for (let j = i + 1; j < this.intermediates.length; ++j) {
      this.intermediates[j].unlisten(`${this.path[j]} change`, this._reflectChange)
    }
    this.intermediates.length = i + 1

    for (let x = e.target, j = i, l = this.path.length; j < l - 1;) {
      const name = this.path[j++]
      x = x[name]
      if (!x) break
      this.intermediates.push(x)
      x.on(`${name} change`, this._reflectChange)
    }
    this._changed()
  }
  _changed() {
    if (this.other) this.other.update()
  }
}
v2.bind.Watcher = class Watcher extends v2.bind.Side {
  _changed() {
    this.emit('change', {target: this, value: this.value})
  }
}

v2.request = function requestXHR(method, url, options) {
  if (typeof url !== 'string') [method, url, options] = ['GET', method, url]
  if (!options) options = {}

  const xhr = new XMLHttpRequest
  if (options.as === 'xml') {
    options.as = 'document'
    if (!options.type) options.type = 'text/xml'
  }
  if (options.as) xhr.responseType = options.as
  if (options.type) xhr.overrideMimeType(options.type)
  let hash = ''
  const i = url.indexOf('#')
  if (i !== -1) {
    hash = url.slice(i + 1)
    url = url.slice(0, i)
  }
  if (options.query) {
    url += (url.includes('?') ? '&' : '?') + Object.keys(options.query).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(options.query[k])}`).join('&')
  }
  if (hash) url += '#' + hash
  xhr.open(method, url, true)
  xhr.send()

  return new Promise((resolve, reject) => {
    xhr.onload = () => {
      if (xhr.status === 200) resolve(xhr.response)
      else reject(new Error(`${method} ${url} failed: HTTP ${xhr.status} ${xhr.statusText}`))
    }
    xhr.onerror = () => reject(new Error(`${method} ${url} failed`))
  })
}

v2.request.get = function get(url, options) {
  return v2.request('GET', url, options)
}
v2.request.post = function post(url, options) {
  return v2.request('POST', url, options)
}

const View = require('./view/view')

class App extends View {
  init() {
    super.init()
    this.hadMenus = false
  }
  get title() {return this._title}
  set title(value) {
    const oldValue = this._title
    document.title = this._title = value
    this.emit('title change', {target: this, name: 'title', oldValue, value})
  }

  get isApp() {return true}

  init() {
    this._title = null
    this._cursor = null
    this._menus = new Set
    this._cursorEl = h('.v2-app-cursor')
    this._contextMenu = this._contextMenu.bind(this)
    this._appMouseDown = this._appMouseDown.bind(this)
    this._appKeyDown = this._appKeyDown.bind(this)
  }
  build() {
    return h('.v2-view.v2-app')
  }
  start() {return this.mount(document.body)}

  _onActivate() {
    document.addEventListener('contextmenu', this._contextMenu)
    document.addEventListener('mousedown', this._appMouseDown, true)
    document.addEventListener('mousedown', this._appMouseDownOut)
    document.addEventListener('keydown', this._appKeyDown)
  }
  _onDeactivate() {
    document.removeEventListener('contextmenu', this._contextMenu)
    document.removeEventListener('mousedown', this._appMouseDown, true)
    document.removeEventListener('mousedown', this._appMouseDownOut)
    document.removeEventListener('keydown', this._appKeyDown)
  }
  _contextMenu(e) {
    if (e.target.localName !== 'textarea' && (e.target.localName !== 'input' || !['text', 'search', 'tel', 'url', 'email', 'password', 'date', 'month', 'week', 'time', 'datetime-local', 'number']) && getComputedStyle(e.target).WebkitUserSelect === 'none' && !e.target.matches('[data-show-menu], [data-show-menu] *')) e.preventDefault()
  }
  _appKeyDown(e) {
    const t = e.target
    const tv = h.ownerView(t)
    const isGlobal = !tv || t === document.body
    const key = rt.keyWithModifiers(e)
    const override = h.acceptsKeyboardInput(t, e)
    const cmd = key.includes('#')
    for (const v of isGlobal ? this.descendants() : tv.ancestors()) {
      if (!v.keyBindings) continue
      for (const b of v.keyBindings) {
        if (b.key !== key ||
          isGlobal && !(b.global || v === this) ||
          override && (cmd ? b.override === false : !b.override) ||
          b.context && (
            typeof b.context === 'string' ? !v.hasContext(b.context) :
            b.context.some(c => !v.hasContext(c)))) continue
        v.doCommand(b.command, b.args)
        e.preventDefault()
        return
      }
    }
    if (rt.isMac && rt.isChrome && key === '`#f') {
      const win = chrome.app.window.current()
      if (win.isFullscreen()) win.restore()
      else win.fullscreen()
    }
  }
  _appMouseDown(e) {
    this.hadMenus = this.hasMenus
    const m = h.nearest('.v2-menu', e.target)
    if (m) return
    else this.hideMenus()
  }
  _appMouseDownOut() {
    this.hadMenus = false
  }

  get hasMenus() {return this._menus.size > 0}
  addMenu(m) {
    this._menus.add(m)
    this.add(m)
  }
  hideMenus() {
    for (const m of this._menus) m.hide()
    this._menus.clear()
  }

  get cursor() {return this._cursor}
  set cursor(value) {
    this._cursor = value
    if (value) {
      this._cursorEl.style.cursor = value
      document.body.appendChild(this._cursorEl)
    } else document.body.removeChild(this._cursorEl)
  }
}

class Split extends View {
  init() {
    this._panes = []
    this._paneEls = []
    this._splitters = []
    this._weights = []
    this._drag = null
    this.orientation = 'horizontal'
    this._mouseMove = this._mouseMove.bind(this)
    this._mouseUp = this._mouseUp.bind(this)
  }

  get orientation() {return this._orientation}
  set orientation(value) {
    this._orientation = value
    this.el.className = `v2-view v2-split v2-split--${value}`
  }
  get isVertical() {return this._orientation === 'vertical'}
  set isVertical(value) {this.orientation = value ? 'vertical' : 'horizontal'}
  get isHorizontal() {return this._orientation === 'horizontal'}
  set isHorizontal(value) {this.orientation = value ? 'horizontal' : 'vertical'}

  get panes() {return this._panes}
  set panes(value) {
    this.removeChildren()
    this._panes = value
    const l = value.length
    while (this._paneEls.length < l) {
      this._addSplitter()
      this._addPaneEl()
      this._weights.push(1)
    }
    while (l > this._paneEls.length) {
      this.el.removeChild(this._splitters.pop())
      this.el.removeChild(this._paneEls.pop())
      this._weights.pop()
    }
    for (const [i, c] of value.entries()) {
      this.add(c, this._paneEls[i])
    }
    this._layout()
  }
  get weights() {return this._weights}

  build() {return h('', {onmousedown: '_mouseDown'})}

  _mouseDown(e) {
    if (e.button !== 0) return
    const v = this.isVertical
    const s = h.nearest('.v2-split-splitter', e.target, this.el)
    if (!s) return
    e.preventDefault()
    e.stopPropagation()
    const widths = this._paneEls.map(e => v ? e.offsetHeight : e.offsetWidth)
    this._drag = {
      widths, sum: widths.reduce((x, y) => x + y, 0),
      index: this._splitters.indexOf(s),
      x: v ? e.clientY : e.clientX,
    }
    const app = this.app
    if (app) app.cursor = v ? 'row-resize' : 'col-resize'
    document.addEventListener('mousemove', this._mouseMove)
    document.addEventListener('mouseup', this._mouseUp)
  }
  _mouseMove(e) {
    e.preventDefault()
    const dx = (this.isVertical ? e.clientY : e.clientX) - this._drag.x
    const w = this._drag.widths.slice()
    const i = this._drag.index
    w[i] += dx
    w[i + 1] -= dx
    this._weights[i] = w[i] / this._drag.sum
    this._weights[i + 1] = w[i + 1] / this._drag.sum
    this._layout()
  }
  _mouseUp() {
    document.removeEventListener('mousemove', this._mouseMove)
    document.removeEventListener('mouseup', this._mouseUp)
    const app = this.app
    if (app) app.cursor = null
  }

  addPane(weight, pane) {
    if (pane == null) [weight, pane] = [1, weight]
    if (this._panes.length) this._addSplitter()
    this._addPaneEl()
    this.add(pane, this._paneEls[this._paneEls.length - 1])
    this._panes.push(pane)
    this._weights.push(weight || 1)
    this._layout()
    return this
  }
  _addPaneEl() {
    const el = h('.v2-split-pane')
    this.el.appendChild(el)
    this._paneEls.push(el)
  }
  _addSplitter() {
    const el = h('.v2-split-splitter')
    this._splitters.push(el)
    this.el.appendChild(el)
  }
  _childRemoved(pane) {
    const i = this._panes.indexOf(pane)
    const w = this._weights[i]
    if (i === -1) return
    const j = i && (i - 1)
    this.el.removeChild(this._paneEls[i])
    this.el.removeChild(this._splitters[j])
    this._panes.splice(i, 1)
    this._paneEls.splice(i, 1)
    const ws = this._weights.reduce((x, y) => x + y, 0)
    this._weights.splice(i, 1)
    for (const [i, x] of this._weights.entries()) {
      this._weights[i] = x * ws / (ws - w)
    }
    this._splitters.splice(j, 1)
    this._layout()
  }
  _layout() {
    for (let i = 0, l = this._panes.length; i < l; ++i) {
      const p = this._paneEls[i]
      const s = this._splitters[i]
      const w = this._weights[i]
      p.style.flex = w
    }
  }
}

class List {
  constructor(data) {
    this._data = data || []
    this._changes = []
    this._immediate = false
    this._lengthChange = null
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

class FilteredList {
  constructor(o) {
    if (o instanceof List) o = {model: o}
    this._changes = []
    this._data = []
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

class CyNode extends Model {
  constructor(data, children) {
    super({data})
    this.children = children || []
  }

  clear() {
    for (const c of this.children) c._removed()
    let index = this.children.length
    this.children.length = 0
    while (index--) this.emit('child removed', {target: this, index})
  }
  add(node) {
    node._moveTo(this)
    const index = this.children.length
    this.children.push(node)
    this.emit('child inserted', {target: this, node, index})
  }
  insert(node, index) {
    node._moveTo(this)
    this.children.splice(index, 0, node)
    this.emit('child inserted', {target: this, node, index})
  }
  removeAt(index) {
    const child = this.children[index]
    if (!child) return
    this.children.splice(index, 1)
    child._removed()
    this.emit('child removed', {target: this, index})
  }
  _moveTo(parent) {}
  _removed() {}

  get firstChild() {return this.children[0]}
  get lastChild() {return this.children[this.children.length - 1]}

  [Symbol.iterator]() {return this.children[Symbol.iterator]()}
}
CyNode.properties('data')

class Node extends CyNode {
  constructor(data, children) {
    super(data, children)
    this.parent = null
    for (const c of this.children) c._moveTo(this)
  }

  _moveTo(parent) {
    this.remove()
    this.parent = parent
  }
  _removed() {
    this.parent = null
  }
  remove() {
    const parent = this.parent
    if (!parent) return
    const i = parent.children.indexOf(this)
    if (i !== -1) parent.removeAt(i)
  }

  *parents() {for (let p = this; p; p = p.parent) yield p}
}

Object.assign(v2, {Model, App, Split, List, FilteredList, CyNode, Node})

module.exports = v2
