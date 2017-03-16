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

Object.assign(v2, {Model, App, CyNode, Node})

module.exports = v2
