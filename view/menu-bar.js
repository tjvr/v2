'use strict'
const h = require('../h')
const Menu = require('./menu')

class MenuBar extends Menu {
  init() {
    super.init()
    this.isMenuBar = true
  }
  build() {
    return h('.v2-menu.v2-menu-bar.v2-view', {tabIndex: 0, onmousedown: '_click', onmousemove: '_mouseSelect'})
  }
  focus() {this.el.focus()}
  _mouseSelect(e) {
    if (!this._openMenu) return
    super._mouseSelect(e)
  }
  _activateItem(v) {
    if (!v) return this.selectItem(null)
    if (v.menu) {
      if (this.selectedItem === v) {
        this.selectItem(null, true)
      } else {
        this.app.hideMenus()
        this.selectItem(v, true)
      }
      return
    }
    super._activateItem(v)
  }
  _showMenu(v) {
    const bb = v.el.getBoundingClientRect()
    this.setOpenMenu(v.makeMenu(), v)
    this._openMenu.show(this.app, bb.right, bb.bottom, -bb.width, 0, false)
  }
  _openMenuHidden() {
    super._openMenuHidden()
    this.selectItem(null)
  }
}

module.exports = MenuBar
