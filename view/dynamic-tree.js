'use strict'
const h = require('../h')
const View = require('./view')

class DynamicTreeItem extends View {
  init() {
    this._model = null
    this.items = null
    this.tree = null
    this.isExpanded = false
    this.content = null
    this._childRemoved = this._childRemoved.bind(this)
    this._childInserted = this._childInserted.bind(this)
    this._needsReload = false
  }

  build() {
    return h('.v2-dynamic-tree-item',
      this._label = h('.v2-dynamic-tree-item-label',
        this._disclosure = h('.v2-tree-item-disclosure')),
      this.container = h('.v2-dynamic-tree-item-container'))
  }

  get model() {return this._model}
  set model(value) {
    if (this._model === value) return
    if (this.content) {
      while (this._label.childNodes.length > 1) {
        this._label.removeChild(this._label.lastChild)
      }
    }
    if (this._model) {
      this._model.unlisten('child inserted', this._childInserted)
      this._model.unlisten('child removed', this._childRemoved)
    }
    this._model = value
    if (value) {
      value.on('child inserted', this._childInserted)
      value.on('child removed', this._childRemoved)
      if (this._label) {
        h.pushView(this)
        h.add(this._label, this.content = this.tree.template(value.data))
        h.popView()
        this._updateEmpty()
      }
    }
    if (this.isLive) this._reload(this.tree !== this)
    else this._needsReload = true
  }

  _onActivate() {
    if (this._needsReload) {
      this._needsReload = false
      this._reload()
    }
  }

  _updateEmpty() {
    if (this._label) this._label.classList.toggle('v2-tree-item--empty', !this._model || this._model.children.length === 0)
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
    this.add(item, this.container, before && before.el)
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
    if (this.items) for (const c of this.items) c.collapseRecursive(set)
  }
  expand() {
    if (this.isExpanded) return
    this.isExpanded = true
    if (this._label) this._label.classList.add('v2-tree-item--expanded')
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
    if (this._label) this._label.classList.remove('v2-tree-item--expanded')
    if (this.items) {
      this.container.style.display = 'none'
    }
  }

  *[Symbol.iterator]() {
    yield this
    if (this.items) for (const i of this.items) yield* i
  }

  _reload(suppress) {
    if (this.items) for (const i of this.items) i.remove()
    this.items = null
    if (!this._model) return
    const expanded = this.isExpanded
    this.isExpanded = false
    if (expanded && !suppress) this.expand()
  }
}

class DynamicTree extends DynamicTreeItem {
  init() {
    super.init()
    this.tree = this
    this.isExpanded = true
    this._placeholder = null
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
  _reload() {
    if (this._placeholder && (!this.items || !this.items.length)) {
      h.removeChildren(this.container)
    }
    super._reload()
    if (this._placeholder && (!this.items || !this.items.length)) {
      h.add(this.container, this._placeholder)
    }
  }
  _childInserted(e) {
    if (this._placeholder && (!this.items || !this.items.length)) {
      h.removeChildren(this.container)
    }
    super._childInserted(e)
  }
  _childRemoved(e) {
    super._childRemoved(e)
    if (this._placeholder && (!this.items || !this.items.length)) {
      h.add(this.container, this._placeholder)
    }
  }
  get placeholder() {return this._placeholder}
  set placeholder(value) {
    this._placeholder = value
    if (!this.items || !this.items.length) {
      h.removeChildren(this.container)
      if (value) h.add(this.container, value)
    }
  }
}

DynamicTree.Item = DynamicTreeItem
module.exports = DynamicTree
