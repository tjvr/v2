'use strict'
const itt = require('itt')

const VIEWS = []
let VIEW = null

function h(sel, ...args) {
  const el = createElement(sel)
  add(el, args)
  return el
}

function html(s) {
  // TODO <tr> etc.
  const d = document.createElement('div')
  d.innerHTML = s
  const f = document.createDocumentFragment()
  while (d.firstChild) f.appendChild(d.firstChild)
  return f
}

function pushView(v) {
  if (VIEW) VIEWS.push(VIEW)
  VIEW = v
}
function popView(v) {VIEW = VIEWS.pop()}

function ownerView(v) {
  for (; v; v = v.parentElement) if (v.view) return v.view
}

function nearest(sel, el, stop) {
  if (el.nodeType !== 1) el = el.parentElement
  for (; el && el !== stop; el = el.parentElement) {
    if (el.matches(sel)) return el
  }
}
function nextMatching(sel, el, stop) {
  for (; el && el !== stop; el = el.nextElementSibling) {
    if (el.matches(sel)) return el
  }
}
function nextDescendantMatching(sel, el, stop) {
  if (el === stop) return
  for (; el; el = next(el, stop)) {
    if (el.nodeType === 1 && el.matches(sel)) return el
  }
}
function previousMatching(sel, el, stop) {
  for (; el && el !== stop; el = el.previousElementSibling) {
    if (el.matches(sel)) return el
  }
}
function previousDescendantMatching(sel, el, stop) {
  for (; el && el !== stop; el = previous(el, stop)) {
    if (el.nodeType === 1 && el.matches(sel)) return el
  }
}
function next(x, stop) {return x.firstChild || nextSkippingChildren(x, stop)}
function nextSkippingChildren(x, stop) {
  for (; x && x !== stop; x = x.parentNode) {
    if (x.nextSibling) return x.nextSibling
  }
}
function previous(x, stop) {return x === stop ? null : x.previousSibling ? lastDescendant(x.previousSibling, stop) : x.parentNode}
function lastDescendant(x, stop) {
  for (; x && x !== stop; x = x.lastChild) {
    if (!x.lastChild) return x
  }
}

function constrainTab(e, root) {
  if (e.key !== 'Tab' || e.metaKey || e.ctrlKey) return
  const advance = e.shiftKey ? previous : next
  let t = e.target
  const name = t.localName === 'input' && t.type === 'radio' && t.name
  for (t = advance(t, root); t; t = advance(t, root)) {
    if (t.nodeType === 1 && isFocusable(t) && (!name || t.localName !== 'input' || t.type !== 'radio' || t.name !== name)) return true
  }
  const f = (e.shiftKey ? lastFocusable : firstFocusable)(root)
  if (f) f.focus()
  e.preventDefault()
  e.stopPropagation()
  return true
}
function firstFocusable(root) {
  for (let t = root; t; t = next(t, root)) {
    if (t.nodeType === 1 && isFocusable(t)) return t
  }
}
function lastFocusable(root) {
  for (let t = lastDescendant(root); t; t = previous(t, root)) {
    if (t.nodeType === 1 && isFocusable(t)) return t
  }
}

function isLink(x) {return (x.localName === 'a' || x.localName === 'area') && x.hasAttribute('href')}
function isFormElement(x) {return (x.localName === 'input' && x.type !== 'hidden' || x.localName === 'textarea' || x.localName === 'select' || x.localName === 'button')}
// isFocusable(x) {return isLink(x) || isFormElement(x) && !x.disabled || x.localName === 'iframe' || x.localName === 'object' || x.localName === 'embed' || x.tabIndex != null || x.localName === 'html' && x.ownerDocument.designMode === 'on' || x.isContentEditable}
function isFocusable(x) {return (x.tabIndex > -1 || x.hasAttribute('tabindex')) && !x.disabled}
function acceptsKeyboardInput(x, e) {
  const arrow = ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'].includes(e.key)
  const space = e.key === ' '
  return e.key !== 'Escape' && (
    (x.localName === 'input' && (['text', 'search', 'tel', 'url', 'email', 'password', 'date', 'month', 'week', 'time', 'datetime-local', 'number', 'color'].includes(x.type) || ['radio', 'range'].includes(x.type) && arrow || ['checkbox', 'button', 'radio'].includes(x.type) && space) || x.localName === 'textarea' || x.localName === 'select') && !x.disabled ||
    x.isContentEditable ||
    (x.localName === 'html' || x.localName === 'body') && x.ownerDocument.designMode === 'on') && (x.dataset.nativeKeybindings !== 'false' || e.key.length === 1 && !(e.ctrlKey || e.metaKey || !rt.isApple && e.altKey))
}
// acceptsClick(x) {return isLink(x) || isFormElement(x)}

function isFullscreen(d = document) {return !!fullscreenElement(d)}
function fullscreenElement(d = document) {return d.webkitFullscreenElement || d.webkitFullScreenElement || d.mozFullscreenElement || d.mozFullScreenElement || d.msFullScreenElement || d.msFullscreenElement}
function enterFullscreen(e) {
  const fn = e.requestFullscreen || e.webkitRequestFullScreen || e.webkitRequestFullscreen || e.mozRequestFullScreen || e.mozRequestFullscreen || e.msRequestFullScreen || e.msRequestFullscreen
  if (fn) fn.call(e, Element.ALLOW_KEYBOARD_INPUT)
}
function exitFullscreen(d = document) {
  const fn = d.exitFullscreen || d.webkitExitFullscreen || d.webkitCancelFullScreen || d.mozExitFullscreen || d.mozCancelFullScreen || d.msExitFullscreen || d.msCancelFullScreen
  if (fn) fn.call(d)
}

function createElement(sel) {
  const parts = sel.split('.')
  const el = document.createElement(parts[0] || 'div')
  if (parts.length > 1) el.className = parts.slice(1).join(' ')
  return el
}
function add(el, a) {
  if (a && typeof a === 'object') {
    if (a.isView) VIEW.add(a, el)
    else if (a.nodeType) el.appendChild(a)
    // else if (a.then) addPromise(el, a)
    else if (Array.isArray(a) || itt.is(a)) {
      for (const c of a) add(el, c)
    } else attrs(el, a)
  } else {
    el.appendChild(document.createTextNode(String(a)))
  }
}
// addPromise(el, a) {
//   function replace(a) {
//     if (Array.isArray(a)) {
//       for (const c of a) add(f, c)
//     } else if (typeof a === 'object' && a) {
//       if (a.isView) VIEW.add(a, el)
//       else if (a.nodeType) el.appendChild(a)
//       else if (a.then) addPromise(el, a)
//       else attrs(el, a)
//     } else {
//       el.appendChild(document.createTextNode(String(a)))
//     }
//   }
//   const tn = document.createTextNode('')
//   el.appendChild(tn)
//   a.then(replace)
// }
function attrs(el, a) {
  const keys = Object.keys(a), l = keys.length
  for (let i = 0; i < l; ++i) {
    const k = keys[i]
    const v = a[k]
    if (typeof v === 'object') attrs(el[k], v)
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), typeof v === 'string' ? VIEW[v].bind(VIEW) : v)
    else el[k] = v
  }
}

function removeChildren(el) {while (el.firstChild) el.removeChild(el.lastChild)}

Object.assign(h, {html, pushView, popView, ownerView, nearest, nextMatching, nextDescendantMatching, previousMatching, previousDescendantMatching, next, nextSkippingChildren, previous, lastDescendant, constrainTab, firstFocusable, lastFocusable, isLink, isFormElement, isFocusable, acceptsKeyboardInput, isFullscreen, fullscreenElement, enterFullscreen, exitFullscreen, createElement, add, attrs, removeChildren})
module.exports = h
const rt = require('./rt')
