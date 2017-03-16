'use strict'
const h = require('../h')
const rt = require('../rt')
const View = require('./view')

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

module.exports = App
