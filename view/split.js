'use strict'
const h = require('../h')
const View = require('./view')

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
module.exports = Split
