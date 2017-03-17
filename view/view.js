'use strict'
const h = require('../h')
const RT = require('../rt')
const emitter = require('../emitter')

class View {
  get isView() {return true}
  get isRoot() {return this.isLive && !this.parent}

  get root() {return this.parent ? this.parent.root : this}
  get app() {
    const r = this.root
    return r.isApp && r
  }

  *descendants() {
    yield this
    for (const c of this.children) yield* c.descendants()
  }
  *ancestors() {
    for (let v = this; v; v = v.parent) yield v
  }

  constructor(p) {
    this._listeners = null
    this.children = []
    this.parent = null
    this.isLive = false

    if (!p) p = {}
    h.pushView(this)
    this.el = this.build(p)
    if (!this.container) this.container = this.el
    this.el.view = this
    this.init()
    h.popView()
    Object.assign(this, p)
  }
  init() {}
  build() {
    return h('.v2-view')
  }
  assemble(fn) {
    h.pushView(this)
    const result = fn()
    h.popView()
    return result
  }
  hasContext(c) {
    return c.startsWith('!') ? !this._hasContext(c.slice(1)) : this._hasContext(c)
  }
  _hasContext(c) {
    return c.startsWith('rt-') ? RT.type === c.slice(3) :
      c === 'pf-apple' ? RT.isApple :
      c.startsWith('pf-') ? RT.platform === c.slice(3) : false
  }

  set(p) {
    Object.assign(this, p)
    return this
  }
  doCommand(name, args) {
    this[name](...(args || []))
  }

  mount(mp, before) {
    if (before) mp.insertBefore(this.el, before)
    else mp.appendChild(this.el)
    this._activate()
    return this
  }
  unmount() {
    if (this.parent) throw new Error("Can't unmount non-root view")
    this.el.parentNode.removeChild(this.el)
    this._deactivate()
    return this
  }
  add(child, mount, before) {
    if (child.parent) child._removeStructural()

    if (!mount) mount = this.container
    if (before) mount.insertBefore(child.el, before)
    else mount.appendChild(child.el)

    this.children.push(child)
    child.parent = this
    if (this.isLive) child._activate()
    return this
  }
  _removeStructural() {
    const p = this.parent
    if (!p) return
    const i = p.children.indexOf(this)
    if (i !== -1) p.children.splice(i, 1)
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
emitter(View.prototype)
module.exports = View
