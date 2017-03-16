'use strict'
const itt = require('itt')

function h(sel, ...args) {
  const el = h.createElement(sel)
  h.add(el, args)
  return el
}

Object.assign(module.exports = h, {
  _views: [],
  _view: null,

  html(s) {
    // TODO tr etc.
    const d = document.createElement('div')
    d.innerHTML = s
    const f = document.createDocumentFragment()
    while (d.firstChild) f.appendChild(d.firstChild)
    return f
  },

  pushView(v) {
    if (h._view) h._views.push(h._view)
    h._view = v
  },
  popView(v) {h._view = h._views.pop()},

  ownerView(v) {
    for (; v; v = v.parentElement) if (v.view) return v.view
  },

  nearest(sel, el, stop) {
    for (; el && el.nodeType === 1 && el !== stop; el = el.parentNode) {
      if (el.matches(sel)) return el
    }
  },
  nextMatching(sel, el, stop) {
    for (; el && el !== stop; el = el.nextElementSibling) {
      if (el.matches(sel)) return el
    }
  },
  nextDescendantMatching(sel, el, stop) {
    if (el === stop) return
    for (; el; el = h.next(el, stop)) {
      if (el.nodeType === 1 && el.matches(sel)) return el
    }
  },
  previousMatching(sel, el, stop) {
    for (; el && el !== stop; el = el.previousElementSibling) {
      if (el.matches(sel)) return el
    }
  },
  previousDescendantMatching(sel, el, stop) {
    for (; el && el !== stop; el = h.previous(el, stop)) {
      if (el.nodeType === 1 && el.matches(sel)) return el
    }
  },
  next(x, stop) {return x.firstChild || h.nextSkippingChildren(x, stop)},
  nextSkippingChildren(x, stop) {
    for (; x && x !== stop; x = x.parentNode) {
      if (x.nextSibling) return x.nextSibling
    }
  },
  previous(x, stop) {return x === stop ? null : x.previousSibling ? h.lastDescendant(x.previousSibling, stop) : x.parentNode},
  lastDescendant(x, stop) {
    for (; x && x !== stop; x = x.lastChild) {
      if (!x.lastChild) return x
    }
  },

  constrainTab(e, root) {
    if (e.key !== 'Tab' || e.metaKey || e.ctrlKey) return
    const advance = e.shiftKey ? h.previous : h.next
    let t = e.target
    const name = t.localName === 'input' && t.type === 'radio' && t.name
    for (t = advance(t, root); t; t = advance(t, root)) {
      if (t.nodeType === 1 && h.isFocusable(t) && (!name || t.localName !== 'input' || t.type !== 'radio' || t.name !== name)) return true
    }
    const f = (e.shiftKey ? h.lastFocusable : h.firstFocusable)(root)
    if (f) f.focus()
    e.preventDefault()
    e.stopPropagation()
    return true
  },
  firstFocusable(root) {
    for (let t = root; t; t = h.next(t, root)) {
      if (t.nodeType === 1 && h.isFocusable(t)) return t
    }
  },
  lastFocusable(root) {
    for (let t = h.lastDescendant(root); t; t = h.previous(t, root)) {
      if (t.nodeType === 1 && h.isFocusable(t)) return t
    }
  },

  isLink(x) {return (x.localName === 'a' || x.localName === 'area') && x.hasAttribute('href')},
  isFormElement(x) {return (x.localName === 'input' && x.type !== 'hidden' || x.localName === 'textarea' || x.localName === 'select' || x.localName === 'button')},
  // isFocusable(x) {return h.isLink(x) || h.isFormElement(x) && !x.disabled || x.localName === 'iframe' || x.localName === 'object' || x.localName === 'embed' || x.tabIndex != null || x.localName === 'html' && x.ownerDocument.designMode === 'on' || x.isContentEditable}
  isFocusable(x) {return (x.tabIndex > -1 || x.hasAttribute('tabindex')) && !x.disabled},
  acceptsKeyboardInput(x, e) {
    const arrow = ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'].includes(e.key)
    const space = e.key === ' '
    return e.key !== 'Escape' && (
      (x.localName === 'input' && (['text', 'search', 'tel', 'url', 'email', 'password', 'date', 'month', 'week', 'time', 'datetime-local', 'number', 'color'].includes(x.type) || ['radio', 'range'].includes(x.type) && arrow || ['checkbox', 'button', 'radio'].includes(x.type) && space) || x.localName === 'textarea' || x.localName === 'select') && !x.disabled ||
      x.isContentEditable ||
      (x.localName === 'html' || x.localName === 'body') && x.ownerDocument.designMode === 'on') && (x.dataset.nativeKeybindings !== 'false' || e.key.length === 1 && !(e.ctrlKey || e.metaKey || !rt.isApple && e.altKey))
  },
  // acceptsClick(x) {return h.isLink(x) || h.isFormElement(x)},

  isFullscreen(d = document) {return !!h.fullscreenElement(d)},
  fullscreenElement(d = document) {return d.webkitFullscreenElement || d.webkitFullScreenElement || d.mozFullscreenElement || d.mozFullScreenElement || d.msFullScreenElement || d.msFullscreenElement},
  enterFullscreen(e) {
    const fn = e.requestFullscreen || e.webkitRequestFullScreen || e.webkitRequestFullscreen || e.mozRequestFullScreen || e.mozRequestFullscreen || e.msRequestFullScreen || e.msRequestFullscreen
    if (fn) fn.call(e, Element.ALLOW_KEYBOARD_INPUT)
  },
  exitFullscreen(d = document) {
    const fn = d.exitFullscreen || d.webkitExitFullscreen || d.webkitCancelFullScreen || d.mozExitFullscreen || d.mozCancelFullScreen || d.msExitFullscreen || d.msCancelFullScreen
    if (fn) fn.call(d)
  },

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
    if (a && typeof a === 'object') {
      if (a.isView) h._view.add(a, el)
      else if (a.nodeType) el.appendChild(a)
      // else if (a.then) h.addPromise(el, a)
      else if (Array.isArray(a) || itt.is(a)) {
        for (const c of a) h.add(el, c)
      } else h.attrs(el, a)
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
  //       else if (a.nodeType) el.appendChild(a)
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
const rt = require('./rt')
