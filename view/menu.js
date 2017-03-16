'use strict'
const h = require('../h')
const format = require('../format')
const View = require('./view')

class Menu extends View {
  init() {
    this.isMenuBar = false
    this.ownerItem = null
    this._openMenuItem = null
    this._openMenu = null
    this._openMenuHidden = this._openMenuHidden.bind(this)
    this._selectedItem = null
    this._clearDelay = 500
    this._typeTimeout = null
    this._clear = this._clear.bind(this)
    this.keyBindings = Menu.keyBindings
  }
  build() {
    return h('.v2-menu.v2-view', {onmouseup: '_click', onmousemove: '_mouseSelect', onkeydown: '_keyDown', onfocusin: '_focusIn'},
      this._input = h('input.v2-menu-input', {oninput: '_selectByTitle', dataset: {nativeKeybindings: false}}))
  }

  _focusIn(e) {
    const item = h.nearest('.v2-menu-item', e.target)
    if (item) this.selectItem(item.view)
  }

  show(app, x, y, bw = 1, bh = 1, offset = true, focus = true) {
    this.selectItem(null)
    app.addMenu(this)
    const bb = this.el.getBoundingClientRect()
    const w = Math.ceil(bb.width), h = Math.ceil(bb.height)
    const pt = offset ? parseInt(getComputedStyle(this.el).paddingTop) : 0
    x += bw, y += bh - pt
    if (x > innerWidth - w) x -= w + bw
    if (y > innerHeight - h) y -= h + bh - pt
    x = Math.round(Math.max(0, x))
    y = Math.round(Math.max(0, y))
    this.el.style.transform = `translate(${x}px, ${y}px)`
    if (focus) setTimeout(() => this.focus())
  }
  hide() {
    if (!this.parent) return
    this.emit('hide', {target: this})
    this.remove()
    this.setOpenMenu(null)
  }
  get visible() {return !!this.parent}

  get target() {return this._target || this.ownerItem && this.ownerItem.target}
  set target(value) {this._target = value}

  _click(e) {
    const el = h.nearest('.v2-menu-item', e.target)
    this._activateItem(el && !el.classList.contains('v2-menu-item--disabled') && el.view)
  }
  _activateItem(v) {
    if (!v) return
    const app = this.app
    if (app) app.hideMenus()
    else this.hide()

    setTimeout(() => {
      const t = v.target
      const a = v.action
      if (typeof a === 'function') a()
      else if (typeof t === 'function') t(a)
      else if (t && a && typeof t[a] === 'function') t[a]()

      const obj = {target: this, item: v}
      for (let m = this; m; m = m.ownerItem && m.ownerItem.parent) {
        m.emit('activate', obj)
      }
    })
  }
  _mouseSelect(e) {
    const t = h.nearest('.v2-menu-item', e.target)
    if (t && !t.classList.contains('v2-menu-item--disabled')) this.selectItem(t.view, true)
  }
  _showMenu(v, focus = false) {
    if (this._openMenuItem === v) return
    const bb = v.el.getBoundingClientRect()
    this.setOpenMenu(v.makeMenu(), v)
    this._openMenu.show(this.app, bb.left, bb.top, bb.width, 0, true, focus)
  }
  focus() {this._input.focus()}
  _keyDown(e) {
    h.constrainTab(e, this.el)
  }
  _hasContext(n) {
    return n === 'submenu' ? this.ownerItem : super._hasContext(n)
  }
  selectOut() {
    if (!this.ownerItem) return
    if (this.ownerItem.parent.isMenuBar) {
      this.ownerItem.parent.selectPrevious()
    } else {
      this.hide()
    }
  }
  selectIn() {
    if (this._selectedItem && this._selectedItem.menu) {
      this._showMenu(this._selectedItem, true)
      this._openMenu.selectFirst()
    } else if (this.ownerItem && this.ownerItem.parent.isMenuBar) {
      this.ownerItem.parent.selectNext()
    }
  }
  activateSelection() {
    if (this._selectedItem) this._activateItem(this._selectedItem)
  }

  _selectByTitle() {
    this.selectByTitle(this._input.value)
    clearTimeout(this._typeTimeout)
    this._typeTimeout = setTimeout(this._clear, this._clearDelay)
  }
  _clear() {
    this._input.value = ''
  }
  selectByTitle(title) {
    if (!title) return
    const re = new RegExp('^' + escapeRegExp(title.trim()).replace(/\s+/, '\\s+'), 'i')
    for (const v of this.children) {
      if (re.test(v.title)) return this.selectItem(v)
    }
  }

  selectNext() {
    if (!this.selectedItem) return this.selectFirst()
    const el = h.nextDescendantMatching('.v2-menu-item:not(.v2-menu-item--disabled)', h.nextSkippingChildren(this.selectedItem.el, this.el), this.el)
    if (el) this.selectItem(el.view)
  }
  selectPrevious() {
    if (!this.selectedItem) return this.selectLast()
    const el = h.previousDescendantMatching('.v2-menu-item:not(.v2-menu-item--disabled)', h.previous(this.selectedItem.el), this.el)
    if (el) this.selectItem(el.view)
  }
  selectFirst() {
    const el = h.nextDescendantMatching('.v2-menu-item:not(.v2-menu-item--disabled)', this.el.firstElementChild, this.el)
    if (el) this.selectItem(el.view)
  }
  selectLast() {
    const el = h.previousDescendantMatching('.v2-menu-item:not(.v2-menu-item--disabled)', h.lastDescendant(this.el), this.el)
    if (el) this.selectItem(el.view)
  }

  get openMenu() {return this._openMenu}
  setOpenMenu(value = null, item = null) {
    if (this._openMenu) {
      this._openMenu.unlisten('hide', this._openMenuHidden)
      this._openMenu.hide()
    }
    this._openMenuItem = item
    if (this._openMenu = value) {
      value.on('hide', this._openMenuHidden)
    }
  }
  _openMenuHidden() {
    this.setOpenMenu(null)
    this.focus()
  }

  get selectedItem() {return this._selectedItem}
  selectItem(view, showMenu) {
    if (this._selectedItem === view) return
    if (this._openMenu && (!view || this._openMenuItem !== view)) {
      this.setOpenMenu(null)
    }
    if (this._selectedItem) this._selectedItem.selected = false
    if (this._selectedItem = view) {
      view.selected = true
    }
    this.el.classList.toggle('v2-menu--has-selection', !!view)
    if ((showMenu || this.isMenuBar) && view && view.menu) {
      this._showMenu(view)
    }
    if (!this.el.contains(document.activeElement)) this.focus()
  }

  set spec(value) {
    for (const x of value) if (x) {
      if (x === '-') {
        const last = this.el.lastElementChild
        if (last && last !== this._input && !last.classList.contains('v2-menu-separator')) {
          this.el.appendChild(h('.v2-menu-separator'))
        }
      } else if (Array.isArray(x)) {
        const [title, spec, opts] = x
        if (!opts || !opts.hidden) this.add(new Menu.Item(Object.assign({title, spec}, opts)))
      } else {
        h.pushView(this)
        h.add(this.el, x)
        h.popView()
      }
    }
  }
}
Menu.keyBindings = [
  {key: 'ArrowUp', command: 'selectPrevious'},
  {key: 'ArrowDown', command: 'selectNext'},
  {key: '/ArrowUp', command: 'selectFirst', context: 'pf-apple'},
  {key: '#ArrowUp', command: 'selectFirst'},
  {key: '/ArrowDown', command: 'selectLast', context: 'pf-apple'},
  {key: '#ArrowDown', command: 'selectLast'},
  {key: 'ArrowLeft', command: 'selectOut'},
  {key: 'ArrowRight', command: 'selectIn'},
  {key: 'Enter', command: 'activateSelection'},
  // {key: 'k', command: 'selectPrevious'},
  // {key: 'j', command: 'selectNext'},
  // {key: '^K', command: 'selectFirst'},
  // {key: '#k', command: 'selectFirst'},
  // {key: '#k', command: 'selectFirst'},
  // {key: '^J', command: 'selectLast'},
  // {key: '#j', command: 'selectLast'},
  // {key: 'h', command: 'selectOut'},
  // {key: 'l', command: 'selectIn'},
  // {key: 'o', command: 'activateSelection'},
]

Menu.Item = class Item extends View {
  init() {
    this._menu = null
    this._target = null
    this._state = ''
    this._selected = false
    this._enabled = true
    this.action = null
  }
  build() {
    return h('.v2-menu-item',
      this._titleEl = h('.v2-menu-item-title'),
      this._keyEl = h('.v2-menu-item-key'))
  }

  get target() {return this._target || this.parent.target}
  set target(value) {this._target = value}

  makeMenu() {
    const m = typeof this._menu === 'function' ? this._menu() : this._menu
    if (m) m.ownerItem = this
    return m
  }
  get menu() {return this._menu}
  set menu(value) {
    this._menu = value
    this.el.classList.toggle('v2-menu-item--has-submenu', !!value)
  }

  get title() {return this._title}
  set title(value) {
    this._title = value
    if (typeof value === 'string') this._titleEl.textContent = value
    else {
      h.removeChildren(this._titleEl)
      h.add(this._titleEl, value)
    }
  }
  get key() {return this._key}
  set key(value) {
    this._key = value
    this._keyEl.textContent = format.key(value)
  }
  get enabled() {return this._enabled}
  set enabled(value) {this.el.classList.toggle('v2-menu-item--disabled', !(this._enabled = value))}

  get state() {return this._state}
  set state(value) {
    this._state = value
    this.el.classList.toggle('v2-menu-item--checked', value === 'checked')
    this.el.classList.toggle('v2-menu-item--mixed', value === 'mixed')
  }

  get selected() {return this._selected}
  set selected(value) {this.el.classList.toggle('v2-menu-item--selected', this._selected = !!value)}

  set spec(value) {
    if (Array.isArray(value)) {
      this.menu = new Menu({spec: value})
    } else if (value instanceof Menu) {
      this.menu = value
    } else if (typeof value === 'string' || typeof value === 'function') {
      this.action = value
    } else if (value) {
      this.set(value)
    }
  }
}

module.exports = Menu
