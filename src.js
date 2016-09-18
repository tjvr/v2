'use strict'

function h(sel, ...args) {
  const el = h.createElement(sel)
  h.add(el, args)
  return el
}
Object.assign(h, {
  _views: [],
  _view: null,

  pushView(v) {
    if (h._view) h._views.push(h._view)
    h._view = v
  },
  popView(v) {h._view = h._views.pop()},

  nearest(sel, el, stop) {
    while (el && el.nodeType === 1 && el !== stop) {
      if (el.matches(sel)) return el
      el = el.parentNode
    }
  },
  contains(p, c) {
    while (c) {
      if (c === p) return true
      c = c.parentNode
    }
    return false
  },
  root(p) {return p.parentNode ? h.root(p.parentNode) : p},

  createElement(sel) {
    const parts = (sel || '').split(/([#.])/)
    const el = document.createElement(parts[0] || 'div')
    const l = parts.length
    if (l > 1) {
      const classes = []
      for (let i = 1; i < l; i += 2) {
        if (parts[i] === '#') el.id = parts[i + 1]
        else classes.push(parts[i + 1])
      }
      el.className = classes.join(' ')
    }
    return el
  },
  add(el, a) {
    if (Array.isArray(a)) {
      for (const c of a) h.add(el, c)
    } else if (typeof a === 'object' && a) {
      if (a.isView) h._view.add(a, el)
      else if (a.tagName) el.appendChild(a)
      // else if (a.then) h.addPromise(el, a)
      else h.attrs(el, a)
    } else {
      el.appendChild(document.createTextNode(String(a)))
    }
  },
  // addPromise(el, a) {
  //   function replace(a) {
  //     if (Array.isArray(a)) {
  //       for (const c of a) h.add(f, c)
  //     } else if (typeof a === 'object' && a) {
  //       if (a.isView) h._view.add(a, el)
  //       else if (a.tagName) el.appendChild(a)
  //       else if (a.then) h.addPromise(el, a)
  //       else h.attrs(el, a)
  //     } else {
  //       el.appendChild(document.createTextNode(String(a)))
  //     }
  //   }
  //   const tn = document.createTextNode('')
  //   el.appendChild(tn)
  //   a.then(replace)
  // },
  attrs(el, a) {
    for (const k in a) {
      const v = a[k]
      if (typeof v === 'object') h.attrs(el[k], v)
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), typeof v === 'string' ? h._view[v].bind(h._view) : v)
      else el[k] = v
    }
  },

  removeChildren(el) {while (el.firstChild) el.removeChild(el.lastChild)},
})

const v2 = {}

v2.immediate = function immediate(fn) {v2._nextPromise.next(fn)}
v2._nextPromise = Promise.resolve()

v2.escapeEntities = function escapeEntities(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;')
}

v2.iter = {
  first(xs) {
    if (Array.isArray(xs)) return xs[0]
    for (const x of xs) return x
  },
  last(xs) {
    if (Array.isArray(xs)) return xs[xs.length - 1]
    let z
    for (const x of xs) z = x
    return z
  },
}
v2.path = {
  dirname(x) {
    const p = /^(?:\w+:)?\//.exec(x)
    const prefix = p ? p[0] : ''
    const rx = x.slice(prefix.length)
    const i = rx.lastIndexOf('/')
    if (i === -1) return prefix
    return prefix + rx.slice(0, i)
  },
  basename(x) {
    const i = x.lastIndexOf('/')
    if (i === -1) return x
    return x.slice(i + 1)
  },
  sanitize(x) {
    return v2.path.resolve('', x)
  },
  join(...parts) {
    return parts.filter(p => p).join('/')
  },
  resolve(x, ...then) {
    const p = /^(?:\w+:)?\//.exec(x)
    const prefix = p ? p[0] : ''
    const rx = x.slice(prefix.length)
    const parts = rx ? rx.split('/') : []
    for (const y of then) {
      if (y[0] === '/') parts.length = 0
      for (const t of y.split('/')) {
        if (t === '.') continue
        else if (t === '..') parts.pop()
        else if (t) parts.push(t)
      }
    }
    return prefix + parts.join('/')
  }
}

v2.emitter = function emitter(o) {
  Object.assign(o, {
    on(e, fn) {
      const m = this._listeners || (this._listeners = new Map)
      const l = m.get(e)
      if (l) l.push(fn)
      else m.set(e, [fn])
      return this
    },
    unlisten(e, fn) {
      const m = this._listeners
      if (!m) return this
      const l = m.get(e)
      if (!l) return this
      const i = l.indexOf(fn)
      if (i === -1) return this
      l.splice(i, 1)
      return this
    },
    listeners(e) {
      const m = this._listeners
      return m ? m.get(e) || [] : []
    },
    emit(e, arg) {
      const m = this._listeners
      if (!m) return
      const l = m.get(e)
      if (!l) return
      const p = Promise.resolve(arg)
      for (const fn of l) p.then(fn)
      return this
    },
  })
}
v2.model = function model(o, ...args) {
  function def(name) {
    const _name = `_${name}`
    const event = `${name} changed`
    Object.defineProperty(o, name, {
      enumerable: true,
      get() {return this[_name]},
      set(value) {
        const oldValue = this[_name]
        if (oldValue === value) return
        this[_name] = value
        this.emit(event, {target: this, name, value, oldValue})
      },
    })
  }
  function add(a) {
    if (typeof a === 'string') {
      a.split(/\s*,\s*/).forEach(def)
    } else if (Array.isArray(a)) {
      a.forEach(add)
    }
  }
  v2.emitter(o)
  add(args)
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

v2.View = class View {
  get isView() {return true}
  get isRoot() {return this.isLive && !this.parent}

  get root() {return this.parent ? this.parent.root : this}
  get app() {
    const r = this.root
    return r.isApp && r
  }

  constructor(p) {
    this._listeners = null
    this.children = new Set
    this.parent = null
    this.isLive = false

    if (!p) p = {}
    h.pushView(this)
    this.el = this.build(p)
    h.popView()
    if (!this.container) this.container = this.el
    this.el.view = this
    this.init()
    Object.assign(this, p)
  }
  init() {}
  build() {
    return h('.v2-view')
  }

  set(p) {
    Object.assign(this, p)
    return this
  }

  mount(mp, before) {
    if (before) mp.insertBefore(this.el, before)
    else mp.appendChild(this.el)
    this._activate()
    return this
  }
  unmount() {
    if (this.parent) throw new Error("Can't unmount non-root view")
    this.el.parentNode.removeChild(this)
    this._deactivate()
    return this
  }
  add(child, mount, before) {
    if (child.parent) child._removeStructural()

    if (!mount) mount = this.container
    if (before) mount.insertBefore(child.el, before)
    else mount.appendChild(child.el)

    this.children.add(child)
    child.parent = this
    if (this.isLive) child._activate()
    return this
  }
  _removeStructural() {
    const p = this.parent
    if (!p) return
    p.children.delete(this)
    this.parent = null
    if (p._childRemoved) p._childRemoved(this)
  }
  remove() {
    if (this.parent) this._removeStructural()
    const parent = this.el.parentNode
    if (parent) parent.removeChild(this.el)
    this._deactivate()
    return this
  }
  removeChildren() {
    for (const c of this.children) c.remove()
    return this
  }

  _deactivate() {
    if (!this.isLive) return
    this.isLive = false
    for (const c of this.children) c._deactivate()
    if (this._onDeactivate) this._onDeactivate()
    this.emit('deactivate', {target: this})
  }
  _activate() {
    if (this.isLive) return
    this.isLive = true
    for (const c of this.children) c._activate()
    if (this._onActivate) this._onActivate()
    this.emit('activate', {target: this})
  }
}
v2.emitter(v2.View.prototype)

v2.App = class App extends v2.View {
  get title() {return this._title}
  set title(value) {document.title = this._title = value}

  get isApp() {return true}

  init() {
    this._title = null
    this._cursor = null
    this._menus = new Set
    this._cursorEl = h('.v2-app-cursor')
    this._contextMenu = this._contextMenu.bind(this)
    this._appMouseDown = this._appMouseDown.bind(this)
  }
  build() {
    return h('.v2-view.v2-app')
  }
  start() {return this.mount(document.body)}

  _onActivate() {
    document.addEventListener('contextmenu', this._contextMenu)
    document.addEventListener('mousedown', this._appMouseDown, true)
  }
  _onDeactivate() {
    document.removeEventListener('contextmenu', this._contextMenu)
    document.removeEventListener('mousedown', this._appMouseDown, true)
  }
  _contextMenu(e) {
    e.preventDefault()
  }
  _appMouseDown(e) {
    const m = h.nearest('.v2-menu', e.target)
    if (m) return
    else this.hideMenus()
  }

  get hasMenus() {return this._menus.size > 0}
  addMenu(m) {
    this._menus.add(m)
    this.add(m)
  }
  hideMenus() {
    for (const m of this._menus) m.remove()
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

v2.Split = class Split extends v2.View {
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
    this.el.className = `v2-view v2-split v2-split-${value}`
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

v2.CyNode = class CyNode {
  constructor(data, children) {
    this._data = data || null
    this.children = children || []
  }

  add(node) {
    const index = this.children.length
    this.children.push(node)
    this.emit('child inserted', {target: this, node, index})
  }
  insert(node, index) {
    this.children.splice(index, 0, node)
    this.emit('child inserted', {target: this, node, index})
  }
  removeAt(index) {
    const child = this.children[index]
    if (!child) return
    this.children.splice(index, 1)
    child._removed()
    // TODO set parent on acyclic nodes
    this.emit('child removed', {target: this, index})
  }
  _moveTo(parent) {}
  _removed() {}

  get firstChild() {return this.children[0]}
  get lastChild() {return this.children[this.children.length - 1]}
}
v2.model(v2.CyNode.prototype, 'data')

v2.Node = class Node extends v2.CyNode {
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
  add(node) {
    node._moveTo(this)
    super.add(node)
  }
  insert(node, index) {
    node._moveTo(this)
    super.insert(node, index)
  }
  remove() {
    const parent = this.parent
    if (!parent) return
    const i = parent.children.indexOf(this)
    if (i !== -1) parent.removeAt(i)
  }

  *parents() {for (let p = this; p; p = p.parent) yield p}
}

v2.DynamicTreeItem = class DynamicTreeItem extends v2.View {
  init() {
    this._model = null
    this.items = null
    this.tree = null
    this.isExpanded = false
    this._content = null
    this._childRemoved = this._childRemoved.bind(this)
    this._childInserted = this._childInserted.bind(this)
  }

  build() {
    return h('.v2-dynamic-tree-item',
      this._label = h('.v2-dynamic-tree-item-label',
        this._disclosure = h('.v2-tree-item-disclosure')),
      this.container = h('.v2-dynamic-tree-item-container'))
  }

  get model() {return this._model}
  set model(value) {
    if (this._content) {
      while (this._label.childNodes.length > 1) {
        this._label.removeChild(this._label.lastChild)
      }
    }
    if (this._model) {
      this._model.unlisten('child inserted', this._childInserted)
      this._model.unlisten('child removed', this._childRemoved)
    }
    this._model = value
    value.on('child inserted', this._childInserted)
    value.on('child removed', this._childRemoved)
    if (this._label) {
      h.pushView(this)
      h.add(this._label, this._content = this.tree.template(value.data))
      h.popView()
      this._updateEmpty()
    }
    this._reload(this.tree !== this)
  }

  _updateEmpty() {
    if (this._label) this._label.classList.toggle('v2-tree-item-empty', !this._model || this._model.children.length === 0)
  }
  _childRemoved(e) {
    if (!this.items) return
    const child = this.items[e.index]
    if (!child) return
    child.remove()
    this.items.splice(e.index, 1)
    this._updateEmpty()
  }
  _childInserted(e) {
    if (!this.items) return
    const model = this._model.children[e.index]
    const before = this.items[e.index]
    const item = new DynamicTreeItem({tree: this.tree, model})
    this.items.splice(e.index, 0, item)
    this.add(item, this.container, before.el)
  }

  toggle(recursive) {
    if (this.isExpanded)
      if (recursive) this.collapseRecursive()
      else this.collapse()
    else
      if (recursive) this.expandRecursive()
      else this.expand()
  }
  expandRecursive(set) {
    if (!set) set = new Set
    if (set.has(this.model)) return
    set.add(this.model)
    this.expand()
    for (const c of this.items) c.expandRecursive(set)
  }
  collapseRecursive(set) {
    if (!set) set = new Set
    if (set.has(this.model)) return
    set.add(this.model)
    this.collapse()
    for (const c of this.items) c.collapseRecursive(set)
  }
  expand() {
    if (this.isExpanded) return
    this.isExpanded = true
    if (this._label) this._label.classList.add('v2-tree-item-expanded')
    if (this.items) {
      this.container.style.display = ''
    } else {
      this.items = []
      for (const c of this._model.children) {
        const item = new DynamicTreeItem({tree: this.tree, model: c})
        this.add(item)
        this.items.push(item)
      }
    }
  }
  collapse() {
    if (!this.isExpanded) return
    this.isExpanded = false
    if (this._label) this._label.classList.remove('v2-tree-item-expanded')
    if (this.items) {
      this.container.style.display = 'none'
    }
  }

  _reload(suppress) {
    if (!this._model) return
    const expanded = this.isExpanded
    if (this.items) for (const i of this.items) i.remove()
    this.items = null
    this.isExpanded = false
    if (expanded && !suppress) this.expand()
  }
}
v2.DynamicTree = class DynamicTree extends v2.DynamicTreeItem {
  init() {
    super.init()
    this.tree = this
    this.isExpanded = true
    this._template = content => h('.v2-tree-item-label', content)
  }

  build() {
    return h('.v2-view.v2-dynamic-tree', {onmousedown: '_mouseDown'})
  }

  _mouseDown(e) {
    if (h.nearest('.v2-tree-item-disclosure', e.target)) {
      const item = h.nearest('.v2-dynamic-tree-item', e.target)
      if (item) item.view.toggle(e.metaKey || e.ctrlKey)
      return
    }
  }

  get template() {return this._template}
  set template(value) {
    this._template = value
    this._reload()
  }
}

v2.Tree = class Tree extends v2.View {
  init() {
    this._model = null
    this._transform = null
    this._reusable = null
    this._cache = new Map
    this._linear = []
    this._editItem = null
    this._selection = new Set
    this._lastL = null
    this._resize = this._resize.bind(this)
    this._atomic = false
    this._needsUpdate = false
    this._editing = null
    this.editNode = (node, label) => node.data = label
    this.menu = null
    this.rowHeight = 24
  }
  build() {
    return h('.v2-view.v2-tree', {tabIndex: 0, onscroll: '_scroll', onmousedown: '_mouseDown', onkeydown: '_keyDown'},
      this._overflowEl = h('.v2-tree-overflow'))
  }

  get model() {return this._model}
  set model(value) {
    this._model = value
    this._linear.length = 0
    this._root = new v2.Tree._L(this, -1, value)
    this._root.expand()
  }

  get transform() {return this._transform}
  set transform(value) {
    this._transform = value
    for (const item of this._cache.values()) {
      if (item._visible) item._dataChanged()
    }
  }

  beginAtomic() {
    if (!this._atomic++) {
      this._needsUpdate = false
    }
  }
  endAtomic() {
    if (!--this._atomic) {
      if (this._needsUpdate) this._reflow()
    }
  }

  edit(l) {
    this.cancelEdit()
    this._editing = l
    l.isEditing = true
  }
  acceptEdit() {
    if (this._editing && this._editItem) {
      this.editNode(this._editing.node, this._editItem._labelEl.value)
    }
    this.cancelEdit()
  }
  cancelEdit() {
    if (this._editing) {
      this._editing.isEditing = false
      this._editing = null
      if (this._editItem) this._editItem.model = null
    }
  }

  _onActivate() {
    this._reflow()
    addEventListener('resize', this._resize)
  }
  _onDeactivate() {
    removeEventListener('resize', this._resize)
  }
  _resize() {this._reflow()}
  _scroll() {this._reflow()}

  _mouseDown(e) {
    if (e.button !== 0 && e.button !== 2) return
    if (h.nearest('.v2-tree-item-editor', e.target)) return
    e.preventDefault()
    this.el.focus()
    this.cancelEdit()
    const el = h.nearest('.v2-tree-item', e.target)
    if (e.button === 2) {
      const fn = this.menu
      if (!fn) return
      e.preventDefault()
      e.stopPropagation()
      if (el) {
        let i = +el.dataset.index
        const l = this._linear[i]
        if (l && !this._selection.has(l)) {
          this._select(l)
        }
      } else {
        this._clearSelection()
      }
      const menu = fn(Array.from(this._selection))
      if (menu) menu.show(this.app, e.clientX, e.clientY)
      return
    }
    if (!el) {
      this._clearSelection()
      return
    }
    let i = +el.dataset.index
    const l = this._linear[i]
    if (h.nearest('.v2-tree-item-disclosure', e.target)) {
      l.toggle(e.ctrlKey || e.metaKey)
      return
    }
    if (e.shiftKey) {
      let j = this._linear.indexOf(this._lastL)
      if (j !== -1) {
        if (j < i) [i, j] = [j, i]
        if (e.metaKey || e.ctrlKey) {
          for (let k = i; k <= j; ++k) this._removeSelect(this._linear[k])
        } else {
          for (let k = i; k <= j; ++k) this._addSelect(this._linear[k])
        }
      } else {
        this._addSelect(l)
      }
    } else if (e.metaKey || e.ctrlKey) {
      this._toggleSelect(l)
    } else {
      this._clearSelection()
      this._addSelect(l)
    }
    this._lastL = l
  }
  _keyDown(e) {
    if (this._editing && this._editItem.visible) {
      if (e.keyCode === 13) {
        e.preventDefault()
        this.acceptEdit()
      } else if (e.keyCode === 27) {
        e.preventDefault()
        this.cancelEdit()
      }
      return
    }
    switch (e.keyCode) {
      case 38: {
        if (e.altKey) {
          this._select(this._linear[0])
        } else {
          const i = this._linear.indexOf(this._lastL)
          const j = i === -1 ? this._linear.length - 1 : i > 0 ? i - 1 : 0
          this._select(this._linear[j])
        }
      } break
      case 40: {
        if (e.altKey) {
          this._select(this._linear[this._linear.length - 1])
        } else {
          const i = this._linear.indexOf(this._lastL)
          const end = this._linear.length - 1
          const j = i === -1 ? 0 : i < end ? i + 1 : end
          this._select(this._linear[j])
        }
      } break
      case 39: {
        if (!this._lastL || !this._lastL.isExpandable) break
        if (this._lastL.isExpanded) {
          this._select(this._lastL.children[0])
        } else this._lastL.toggle(e.ctrlKey || e.metaKey)
      } break
      case 37: {
        if (!this._lastL) break
        if (this._lastL.isExpanded) this._lastL.toggle(e.ctrlKey || e.metaKey)
        else {
          const p = this._parentOf(this._lastL)
          if (p) this._select(p)
        }
      } break
      default: return
    }
    e.preventDefault()
  }

  _select(l) {
    this._clearSelection()
    if (l) this._addSelect(this._lastL = l)
    this._scrollIntoView(l)
  }
  _clearSelection() {
    for (const l2 of this._selection) l2.isSelected = false
    this._selection.clear()
  }
  _toggleSelect(l) {
    if (this._selection.has(l)) {
      this._selection.delete(l)
      l.isSelected = false
    } else {
      this._selection.add(l)
      l.isSelected = true
    }
  }
  _addSelect(l) {
    this._selection.add(l)
    l.isSelected = true
  }
  _removeSelect(l) {
    this._selection.delete(l)
    l.isSelected = false
  }
  _scrollIntoView(l) {
    const i = this._linear.indexOf(l)
    if (i === -1) return
    this.el.scrollTop = Math.min(i * this.rowHeight, Math.max((i + 1) * this.rowHeight - this.el.offsetHeight, this.el.scrollTop))
  }

  _reflow() {
    if (!this.isLive) return
    if (this._atomic) {
      this._needsUpdate = true
      return
    }
    const rowHeight = this.rowHeight
    const st = this.el.scrollTop
    const sh = this.el.offsetHeight
    const start = Math.floor(st / rowHeight)
    const stop = Math.min(this._linear.length, Math.floor((st + sh) / rowHeight) + 1)

    const s = new Set(this._cache.keys())
    for (let i = start; i < stop; ++i) {
      const l = this._linear[i]
      if (!l.isEditing) s.delete(l)
    }
    this._reusable = []
    for (const k of s) this._reusable.push(this._cache.get(k))

    let usedEditor = false
    for (let i = start; i < stop; ++i) {
      const l = this._linear[i]
      const item = this._reuse(l)
      if (!item._visible) item.visible = true
      const y = i * rowHeight
      item.el.dataset.index = i
      item.el.style.transform = `translate(0,${y}px)`
      if (l.isEditing) {
        item.focus()
        usedEditor = true
      }
    }
    for (const item of this._reusable) item.visible = false
    if (!usedEditor && this._editItem) this._editItem.visible = false
    this._overflowEl.style.height = `${this._linear.length * rowHeight}px`
    this._reusable = null
  }

  _reuse(l) {
    if (l.isEditing) {
      if (!this._editItem) {
        this._editItem = new v2.Tree._EditItem({tree: this, model: l})
        this.add(this._editItem)
      } else {
        this._editItem.model = l
      }
      return this._editItem
    }
    let item = this._cache.get(l)
    if (item) return item
    item = this._reusable.pop()
    if (item) {
      this._cache.delete(item.model)
    } else {
      item = new v2.Tree._Item({tree: this, model: l})
      this.add(item)
    }
    item.model = l
    l.item = item
    this._cache.set(l, item)
    return item
  }
  _parentOf(l) {
    let i = this._linear.indexOf(l)
    if (i === -1) return null
    for (;;) {
      --i
      if (i < 0) return null
      const l2 = this._linear[i]
      if (l2.level < l.level) return l2
    }
  }
  _removeSubtree(l, include) {
    let i = this._linear.indexOf(l)
    if (i === -1) return
    let stop = i + 1
    for (;; ++stop) {
      const l2 = this._linear[stop]
      if (!l2 || l2.level <= l.level) break
      // l2._delete()
    }
    if (!include) ++i
    // else l._delete()
    this._linear.splice(i, stop - i)
    this._reflow()
  }
  _insertSubtree(p, l, b) {
    if (b) this._insertSubtreeBefore(l, b)
    else this._insertSubtreeBelow(l, p)
  }
  _insertSubtreeBefore(l, b) {
    const i = this._linear.indexOf(b)
    this._insertSubtreeAt(i, l.subtree)
  }
  _insertSubtreeBelow(l, p) {
    let i = this._linear.indexOf(p)
    for (;; ++i) {
      const l2 = this._linear[i]
      if (!l2 || l2.level <= p.level) break
    }
    this._insertSubtreeAt(i, l.subtree)
  }
  _insertSubtreeAt(i, l) {
    this._linear.splice.apply(this._linear, [i, 0].concat(l))
    this._reflow()
  }
  _insertChildSubtrees(l) {
    const i = this._linear.indexOf(l)
    if (i === -1 && l !== this._root) return
    this._insertSubtreeAt(i + 1, Array.prototype.concat.apply([], l.children.map(l => l.subtree)))
  }
}
v2.Tree._L = class _L {
  constructor(tree, level, node) {
    this.tree = tree
    this.level = level
    this.node = node
    this.item = null
    this.isExpanded = false
    this.children = null
    this._isSelected = false
    this._isEditing = false
    node.on('child inserted', this._childInserted = this._childInserted.bind(this))
    node.on('child removed', this._childRemoved = this._childRemoved.bind(this))
  }

  get isExpandable() {return this.node.children.length > 0}

  _childInserted(e) {
    if (!this.children) return
    const l = new v2.Tree._L(this, this.level + 1, e.node)
    const b = this.children[e.index]
    this.children.splice(e.index, 0, l)
    this.tree._insertSubtree(this, l, b)
  }
  _childRemoved(e) {
    if (!this.children) return
    const child = this.children[e.index]
    if (!child) return
    this.children.splice(e.index, 1)
    this.tree._removeSubtree(child, true)
  }
  _delete(descend) {
    this.node.unlisten('child inserted', this._childInserted)
    this.node.unlisten('child removed', this._childRemoved)
    if ((descend || !this.isExpanded) && this.children) for (const c of this.children) c._delete(true)
  }

  toggle(recursive) {
    if (this.isExpanded)
      if (recursive) this.collapseRecursive()
      else this.collapse()
    else
      if (recursive) this.expandRecursive()
      else this.expand()
  }
  collapseRecursive() {
    this.tree.beginAtomic()
    this._collapseRecursive(new Set)
    this.tree.endAtomic()
  }
  expandRecursive() {
    this.tree.beginAtomic()
    this._expandRecursive(new Set)
    this.tree.endAtomic()
  }
  _collapseRecursive(set) {
    if (set.has(this.node)) return
    set.add(this.node)
    this.collapse()
    if (this.children) for (const c of this.children) c._collapseRecursive(set)
  }
  _expandRecursive(set) {
    if (set.has(this.node) || !this.isExpandable) return
    set.add(this.node)
    this.expand()
    if (this.children) for (const c of this.children) c._expandRecursive(set)
  }
  collapse() {
    if (!this.isExpanded) return this
    this.isExpanded = false
    this.tree._removeSubtree(this, false)
    if (this.item) this.item._toggled()
  }
  expand() {
    if (this.isExpanded) return this
    this.isExpanded = true
    if (!this.children) {
      this.children = this.node.children.map(c => new v2.Tree._L(this.tree, this.level + 1, c))
    }
    this.tree._insertChildSubtrees(this)
    if (this.item) this.item._toggled()
  }

  get isSelected() {return this._isSelected}
  set isSelected(value) {
    if (this._isSelected === value) return
    this._isSelected = value
    if (this.item) this.item._selected()
  }
  get isEditing() {return this._isEditing}
  set isEditing(value) {
    if (this._isEditing === value) return
    this._isEditing = value
    if (this.item) this.tree._reflow()
  }

  get subtree() {
    const result = []
    this._collectSubtree(result)
    return result
  }
  _collectSubtree(a) {
    a.push(this)
    if (this.isExpanded) for (const c of this.children) c._collectSubtree(a)
  }
}
v2.Tree._Item = class _Item extends v2.View {
  get model() {return this._model}
  set model(value) {
    if (this._model === value) return
    if (this._model) {
      this._model.node.unlisten('data changed', this._dataChanged)
    }
    if (this._model = value) {
      this._update()
      value.node.on('data changed', this._dataChanged)
    }
  }

  init() {
    this._model = null
    this.tree = null
    this._visible = true
    this._dataChanged = this._dataChanged.bind(this)
  }
  build() {
    return h('.v2-tree-item',
      h('.v2-tree-item-disclosure'),
      this._labelEl = h('.v2-tree-item-label'))
  }

  _toggled() {
    this.el.classList.toggle('v2-tree-item-expanded', this._model.isExpanded)
  }
  _selected() {
    this.el.classList.toggle('v2-tree-item-selected', this._model.isSelected)
  }
  _dataChanged() {
    if (!this._model) return
    this.text = this.tree._transform ? this.tree._transform(this._model.node.data) : this._model.node.data
  }
  _update() {
    this._toggled()
    this._selected()
    this.el.classList.toggle('v2-tree-item-empty', this._model.node.children.length === 0)
    this.el.style.paddingLeft = `${this._model.level}rem`
    this._dataChanged()
  }

  get visible() {return this._visible}
  set visible(value) {
    if (this._visible === value) return
    this.el.style.display = (this._visible = value) ? '' : 'none'
  }

  get text() {return this._text}
  set text(value) {this._labelEl.textContent = this._text = value}
}
v2.Tree._EditItem = class _EditItem extends v2.Tree._Item {
  build() {
    return h('.v2-tree-item.v2-tree-item-editing',
      h('.v2-tree-item-disclosure'),
      this._labelEl = h('input.v2-tree-item-editor'))
  }

  focus() {
    if (document.activeElement === this._labelEl) return
    this._labelEl.select()
  }

  get text() {return this._text}
  set text(value) {this._labelEl.value = this._text = value}
}

v2.Menu = class Menu extends v2.View {
  init() {
    this._click = this._click.bind(this)
  }
  build() {
    return h('.v2-menu.v2-view')
  }

  show(app, x, y) {
    app.addMenu(this)
    const bb = this.el.getBoundingClientRect()
    const w = Math.ceil(bb.width), h = Math.ceil(bb.height)
    ++x, ++y
    if (x > innerWidth - w) x -= w + 1
    if (y > innerHeight - h) y -= h + 1
    x = Math.max(0, x)
    y = Math.max(0, y)
    this.el.style.transform = `translate(${x}px, ${y}px)`
    this.el.addEventListener('click', this._click)
  }
  hide() {
    this.remove()
  }

  _click(e) {
    const el = h.nearest('.v2-menu-item', e.target)
    if (!el) return
    const t = el.view.target
    const a = el.view.action
    if (typeof a === 'function') a(e)
    else if (t && a) t[a](e)
    this.app.hideMenus()
  }

  set spec(value) {
    for (const x of value) if (x) {
      if (x === '-') {
        this.el.appendChild(h('.v2-menu-separator'))
      } else {
        const [title, spec] = x
        this.add(new v2.MenuItem({title, spec}))
      }
    }
  }
}

v2.MenuItem = class MenuItem extends v2.View {
  init() {
    this._menu = null
    this._target = null
    this.action = null
  }
  build() {
    return h('.v2-menu-item')
  }

  get target() {return this._target || this.parent.target}

  get menu() {return this._menu}
  set menu(value) {
    this._menu = value
    value.target = this.target
  }

  get title() {return this._title}
  set title(value) {
    this._title = value
    if (typeof value === 'string') this.el.textContent = value
    else {
      h.removeChildren(this.el)
      h.add(this.el, value)
    }
  }

  set spec(value) {
    if (Array.isArray(value)) {
      this.menu = new v2.Menu({spec: value})
    } else if (typeof value === 'string' || typeof value === 'function') {
      this.action = value
    } else if (value) {
      this.set(value)
    }
  }
}

// v2.TextEditor = class TextEditor extends v2.View {}
