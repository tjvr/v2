!function(global) {
'use strict'

function h(sel, ...args) {
  const el = h.createElement(sel)
  h.add(el, args)
  return el
}
Object.assign(h, {
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
  nextDescendentMatching(sel, el, stop) {
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
  previousDescendentMatching(sel, el, stop) {
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
  previous(x, stop) {return x === stop ? null : x.previousSibling ? h.lastDescendent(x.previousSibling, stop) : x.parentNode},
  lastDescendent(x, stop) {
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
    return true
  },
  firstFocusable(root) {
    for (let t = root; t; t = h.next(t, root)) {
      if (t.nodeType === 1 && h.isFocusable(t)) return t
    }
  },
  lastFocusable(root) {
    for (let t = h.lastDescendent(root); t; t = h.previous(t, root)) {
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
      (x.localName === 'html' || x.localName === 'body') && x.ownerDocument.designMode === 'on')
  },
  // acceptsClick(x) {return h.isLink(x) || h.isFormElement(x)},

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
      else if (Array.isArray(a) || v2.iter.is(a)) {
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

const v2 = {}

v2.enum = function enum_(o) {
  class Enum {
    constructor(name, props) {
      this.name = name
      Object.assign(this, props)
    }
    toJSON() {return this.name}
  }
  if (typeof o === 'string') o = o.split(/\s*,\s*/)
  if (Array.isArray(o)) {
    for (const k of o) Enum[k] = new Enum(k)
  } else {
    for (const k of Object.keys(o)) {
      Enum[k] = new Enum(k, o[k])
    }
  }
  return Enum
}

v2.immediate = function immediate(fn) {return v2._nextPromise.then(fn)}
v2._nextPromise = Promise.resolve()

v2.toJSON = function toJSON(o, inPlace) {
  if (!o || typeof o !== 'object') return o
  if (o.toJSON) return v2.toJSON(o.toJSON(), true)
  const result = inPlace ? o : Array.isArray(o) ? [] : {}
  for (const k in o) {
    const v = toJSON(o[k])
    if (v !== undefined) result[k] = v
    else if (inPlace) delete result[k]
  }
  return result
}

v2.debounce = function debounce(ms, fn) {
  let timeout
  return () => {
    clearTimeout(timeout)
    timeout = setTimeout(fn, ms)
  }
}
v2.throttleImmediate = function throttleImmediate(fn) {
  let set
  return () => {
    if (set) return
    set = true
    v2.immediate(() => {
      set = false
      fn()
    })
  }
}

v2.keyWithModifiers = function keyWithModifiers(e) {
  return (v2.rt.isApple && e.ctrlKey ? '`' : '') + (e.shiftKey ? '^' : '') + (e.altKey ? '/' : '') + ((v2.rt.isApple ? e.metaKey : e.ctrlKey) ? '#' : '') + e.key
}

const ENTITY_RE = /[&<>"'/]/g
v2.escapeEntities = function escapeEntities(s) {
  return String(s).replace(ENTITY_RE, s =>
    s === '&' ? '&amp;' :
    s === '<' ? '&lt;' :
    s === '>' ? '&gt;' :
    s === '"' ? '&quot;' :
    s === '\'' ? '&#x27;' :
    s === '/' ? '&#x2f;' : '')
}
const SPECIAL_RE = /[\[\]{}()?*+.^$\\\/|-]/g
v2.escapeRegExp = function escapeRegExp(s) {
  return String(s).replace(SPECIAL_RE, '\\$&')
}
v2.ucfirst = function ucfirst(x) {return x.charAt(0).toUpperCase() + x.slice(1)}
v2.foldSpace = function foldSpace(x) {return x.trim().replace(/\s+/g, ' ')}
v2.stripHTML = function stripHTML(x) {
  // this is why we can't have nice things
  return x.replace(/<(?:\/|[a-z])[^ \t\f\n\/\>]*(?:[ \t\f\n]+(?:=?[^ \t\f\n\/>=]*(?:=(?:"[^"]*(?:"|$)|'[^']*(?:'|$)|[^ \t\f\n>]+)?)?)?|\/)*?\/?(?:>|$)|<!--[^]*?(?:(?:-?-)?>|(?:-?-!?)?$|<!--)|<!doctype[^>]*(?:>|$)|<[\/?!].*?(?:>|$)/gi, '')
  // <!doctype[ \t\f\n]*[^ \t\f\n]*[ \t\f\n]*(?:(?:public[ \t\f\n]*(?:'[^'>]*(?:'|$)|"[^">]*(?:"|$))|system)[ \t\f\n]*(?:'[^'>]*(?:'|$)|"[^">]*(?:"|$)))?[^>]*(?:>|$)
  // return new DOMParser().parseFromString(x, 'text/html').documentElement.textContent
}

v2.monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
v2.shortMonthNames = v2.monthNames.map(x => x.slice(0, 3))
v2.dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
v2.shortDayNames = v2.dayNames.map(x => x.slice(0, 3))
v2.isLeapYear = function isLeapYear(y) {
  return !(y % 4) && (y % 100 !== 0 || !(y % 400))
}
v2.dayCounts = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
v2.monthLengths = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
v2.getDayOfYear = function getDayOfYear(d) {
  const m = d.getMonth()
  const n = d.getDate()
  return v2.dayCounts[m] + n + (m > 1 && v2.isLeapYear(d.getFullYear()) ? 0 : -1)
}
v2.getMonthLength = function getMonthLength(d) {
  const m = d.getMonth()
  return v2.dayCounts[m] + (m === 1 && v2.isLeapYear(d.getFullYear()) ? 1 : 0)
}
v2.format = {
  dateToday(format, d) {
    const now = new Date()
    if (now.getFullYear() === d.getFullYear() &&
      now.getMonth() === d.getMonth()) {
      if (now.getDate() === d.getDate()) return 'Today'
      if (now.getDate() === d.getDate() + 1) return 'Yesterday'
    }
    return v2.format.date(format, d)
  },
  date: function date(format, d) {
    if (!d) d = new Date()
    if (typeof d === 'string' || typeof d === 'number') d = new Date(d)
    return format.replace(/\\([{}])|\{([\w:]+)\}/g, (_, esc, name) => {
      if (esc) return esc
      switch (name) {
        case '0date': return (d.getDate() + '').padStart(2, '0')
        case 'date': return d.getDate()
        case '0date0': return (d.getDate() - 1 + '').padStart(2, '0')
        case 'date0': return d.getDate() - 1

        case 'day': return d.getDay() + 1
        case 'day0': return d.getDay()
        case 'dayISO': return d.getDay() || 7
        case 'dayISO0': return (d.getDay() || 7) - 1
        case 'Day': return v2.dayNames[d.getDay()]
        case 'Dy': return v2.shortDayNames[d.getDay()]

        case 'dayOfYear': return v2.getDayOfYear(d) + 1
        case 'dayOfYear0': return v2.getDayOfYear(d)

        case '0month': return (d.getMonth() + 1 + '').padStart(2, '0')
        case 'month': return d.getMonth() + 1
        case '0month0': return (d.getMonth() + '').padStart(2, '0')
        case 'month0': return d.getMonth()
        case 'Month': return v2.monthNames[d.getMonth()]
        case 'Mth': return v2.shortMonthNames[d.getMonth()]
        case 'monthLength': return v2.getMonthLength(d.getMonth())

        case 'isLeapYear': return v2.isLeapYear(d.getFullYear()) ? '1' : '0'
        case 'year': return d.getFullYear()
        case 'yr': return (d.getFullYear() + '').slice(-2)

        case 'am': case 'pm': return d.getHours() < 12 ? 'am' : 'pm'
        case 'AM': case 'PM': return d.getHours() < 12 ? 'AM' : 'PM'

        case '0hour': return (d.getHours() % 12 + 1 + '').padStart(2, '0')
        case 'hour': case 'h': return d.getHours() % 12 + 1
        case '0hour24': case 'h24': return (d.getHours() + '').padStart(2, '0')
        case 'hour24': return d.getHours()

        case 'm': case '0minute': return (d.getMinutes() + '').padStart(2, '0')
        case 'minute': return d.getMinutes()

        case 's': case '0second': return (d.getSeconds() + '').padStart(2, '0')
        case 'second': return d.getSeconds()

        case 'ms': case '0millisecond': return (d.getMilliseconds() + '').padStart(3, '0')
        case 'millisecond': return d.getMilliseconds()

        case 'tzOff': return v2.format.timezoneOffset(d.getTimezoneOffset())
        case 'tzOff:': return v2.format.timezoneOffset(d.getTimezoneOffset(), ':')

        case 'ISO': return d.toISOString()
        case 'unix': return Math.floor(d / 1000)
        default: return ''
      }
    })
  },
  timezoneOffset(z, sep = '') {
    const t = z < 0 ? -z : z
    return (z > 0 ? '-' : '+') + (Math.floor(t / 60) + '').padStart(2, '0') + sep + (t % 60 + '').padStart(2, '0')
  },
  list(items) {
    return items.length <= 2 ? items.join(' and ') : items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1]
  },
  bytes(b, opts) {
    if (!opts) opts = {}
    if (b < 1024) return b + ' B'
    const l = 'KMGTPEZY'
    let k = 0, n = 1024
    while (k < l.length - 1 && b >= n * 1024) {
      ++k
      n *= 1024
    }
    return (b < n * 16 ? Math.round(b / n * 10) / 10 : Math.round(b / n)) + ' ' + l.charAt(k) + (opts.si === false ? '' : 'i') + 'B'
  },
  _keyNames: {
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ' ': 'Space',
    '-': '–',
  },
  _appleKeyNames: {
    Enter: 'Return',
    Backspace: '⌫',
    Delete: '⌦',
    Escape: '⎋',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    CapsLock: '⇪',
    Control: '^',
    Alt: '⌥',
    Shift: '⇧',
    Meta: '⌘',
  },
  key(s) {
    const x = /^([\/#^]+)./.exec(s)
    if (x) s = s.slice(x[1].length)
    return (x ? v2.format.modifiers(x[1]) : '') + (
      v2.rt.isApple && v2.format._appleKeyNames[s] ||
      v2.format._keyNames[s] ||
      v2.ucfirst(s))
  },
  modifiers(s) {
    const a = v2.rt.isApple
    return (s.includes(a ? '##' : '#') ? a ? v2.format._appleKeyNames.Control : 'Ctrl+' : '') +
      (s.includes('/') ? a ? v2.format._appleKeyNames.Alt : 'Alt+' : '') +
      (s.includes('^') ? a ? v2.format._appleKeyNames.Shift : 'Shift+' : '') +
      (a && s.includes('#') ? v2.format._appleKeyNames.Meta : '')
  }
}

v2.wrapBlob = function wrapBlob(blob, options) {
  if (!options) options = {}
  if (!blob) return Promise.reject(new Error('Not found'))
  const type = options.as === 'xml' ? 'text/xml' : options.type || blob.type
  const as = options.as === 'xml' ? 'document' : options.as || 'text'
  if (as === 'blob') return Promise.resolve(options.type ? new Blob([blob], {type}) : blob)
  return new Promise((resolve, reject) => {
    const r = new FileReader
    r.onerror = () => reject(r.error)
    r.onload = () => resolve(
      as === 'document' ? new DOMParser().parseFromString(r.result, type) :
      as === 'json' ? JSON.parse(r.result) : r.result)
    if (as === 'arraybuffer') r.readAsArrayBuffer(blob)
    else r.readAsText(blob)
  })
}
v2.asBlob = function asBlob(data, options) {
  if (!options) options = {}
  if (typeof data === 'string' || data.byteLength != null) return new Blob([data], {type: options.type || ''})
  return data
}

v2.idb = {
  _Cursor: class _Cursor {
    constructor(direction) {
      this._cursor = null
      this.direction = direction
      this._continue = null
    }
    _reinit(cursor) {this._cursor = cursor}
    get source() {return this._cursor.source}
    get key() {return this._cursor.key}
    get primaryKey() {return this._cursor.primaryKey}
    get value() {return this._cursor.value}
    update(value) {this._cursor.update(value)}
    continue(k) {
      if (k) throw new Error('Unimplemented')
      this._continue()
    }
    advance() {throw new Error('Unimplemented')}
  },
  _CursorPoint: class _CursorPoint {
    constructor(cursor) {
      this.key = cursor.key
      this.primaryKey = cursor.primaryKey
      this.value = cursor.value
    }
  },
  _Request: class _Request {
    constructor(source, transaction) {
      this.source = source
      this.readyState = 'pending'
      this.result = null
      this.error = null
      this.onsuccess = null
      this.onerror = null
    }
    _success(result) {
      this.result = result
      const e = {type: 'success', target: this}
      if (this.onsuccess) this.onsuccess(e)
    }
    _error(err) {
      this.error = err
      const e = {type: 'error', target: this}
      if (this.onerror) this.onerror(e)
    }
  },
  _forwards: (a, b) => a.compare(b),
  _backwards: (a, b) => b.compare(a),
  anyOf(source, keys, direction) {
    if (!direction) direction = 'next'
    if (direction.startsWith('prev')) throw new Error('Unimplemented')
    const isOS = source instanceof IDBObjectStore
    const realDir = isOS || source.unique ? 'nextunique' : direction
    keys = keys.sort()
    let i = 0
    const rc = new v2.idb._Cursor(direction)
    rc._continue = function() {
      if (direction === 'nextunique') {
        if (++i === keys.length) return rr._success()
        this._cursor.continue(keys[i])
      } else this._cursor.continue()
    }
    const rr = new v2.idb._Request(source, (isOS ? source : source.objectStore).transaction)
    const r = source.openCursor(undefined, direction)
    r.onsuccess = e => {
      const c = r.result
      if (!c) return rr._success()
      while (c.key > keys[i]) if (++i === keys.length) return rr._success()
      if (c.key === keys[i]) {
        rc._reinit(c)
        rr._success(rc)
      } else {
        c.continue(keys[i])
      }
    }
    r.onerror = e => rr._error(r.error)
    return rr
  },
  startsWith(source, prefix, direction) {
    return source.openCursor(IDBKeyRange.bound(prefix, prefix + '\uffff'))
  },
  or(r1, r2) {
    if (r1.source !== r2.source) {
      throw new TypeError('v2.idb.or() sources must match')
    }
    const pks = new Set
    const rc = new v2.idb._Cursor(null)
    const rr = new v2.idb._Request(r1.source, (r1.source instanceof IDBObjectStore ? r1.source : r1.source.objectStore).transaction)

    let inProgress = false, queued = null, done = 0, error = null
    rc._continue = () => {
      if (error) return
      inProgress = false
      this._cursor.continue()
      if (!queued) return
      rc._reinit(queued)
      queued = null
      rr._success(rc)
    }
    r1.onsuccess = r2.onsuccess = e => {
      const c = e.target.result
      if (!c) return ++done === 2 && rr._success()
      if (pks.has(c.primaryKey)) return c.continue()
      pks.add(c.primaryKey)
      if (inProgress) {
        queued = c
      } else {
        inProgress = true
        rc._reinit(c)
        rr._success(rc)
      }
    }
    r1.onerror = r2.onerror = e => rr._error(error = e.target.error)
    return rr
  },
}

v2.fs = {
  readDirectory(dir, fn) {
    const r = dir.createReader()
    const promises = []
    return new Promise(function loop(resolve, reject) {
      r.readEntries(es => {
        if (!es.length) return resolve(Promise.all(promises))
        promises.push(...es.map(fn))
        loop(resolve, reject)
      }, e => reject(e))
    })
  },
  recurse(dir, fn) {
    return function loop(entry) {
      const r = fn(entry)
      return entry.isDirectory ? Promise.all([r, v2.fs.readDirectory(entry, loop)]) : r
    }(dir)
  },
  createWriter(entry) {return new Promise((r, j) => entry.createWriter(r, j))},

  file(entry) {return v2.fs._file(entry).then(v2.fs._adoptFile)},
  _file(entry) {return new Promise((r, j) => entry.file(r, j))},
  _adoptFile(f) {return f instanceof File ? f : new File([f], f.name, f)},

  getFile(entry, path, options) {return new Promise((r, j) => entry.getFile(path, options || {}, r, j))},
  getDirectory(entry, path, options) {return new Promise((r, j) => entry.getDirectory(path, options || {}, r, j))},
}
if (global.JSZip) v2.fs.zip = function zip(root) {
  if (!root.isDirectory) throw new Error('Root zip entry must be a directory')
  const i = root.fullPath.length + 1
  const zip = new JSZip()
  return v2.fs.recurse(root, e =>
    e.isFile && v2.fs.file(e).then(f => zip.file(e.fullPath.slice(i), f)))
  .then(() => zip)
}

v2.rt = {
  platforms: ['mac', 'win', 'iOS', 'android', 'other'],
  platform:
    /Macintosh/.test(navigator.userAgent) ? 'mac' :
    /Windows/.test(navigator.userAgent) ? 'win' :
    /like Mac OS X/i.test(navigator.userAgent) ? 'iOS' :
    /Android/i.test(navigator.userAgent) ? 'android' : 'other',
  types: ['chrome', 'web'],
  type: global.chrome && chrome.app && chrome.app.runtime ? 'chrome' : 'web',
}
v2.rt.web = {
  chooseFile(accept, options) {
    if (!options) options = {}
    const i = h('input', {type: 'file', accept, multiple: !!options.multiple})
    return new Promise((resolve, reject) => {
      i.onchange = e =>
        i.files.length === 0 ? reject(new Error('No files selected')) :
        resolve(options.multiple ? Array.from(i.files) : i.files[0])
      i.click()
    })
  },
  saveFile(data, name, options) {
    if (!options) options = {}
    data = v2.asBlob(data, options)
    const a = h('a', {
      download: name || '',
      type: data.type || options.type || '',
      href: URL.createObjectURL(data),
    })
    a.click()
    requestIdleCallback(() => URL.revokeObjectURL(a.href))
  },
}
v2.rt.chrome = {
  _callback(fn, ...args) {
    return new Promise((r, j) => fn(...args, x => chrome.runtime.lastError ? j(chrome.runtime.lastError) : r(x)))
  },
  hasPermission(info) {return v2.rt.chrome._callback(chrome.permissions.contains, info)},
  restoreEntry(id) {return v2.rt.chrome._callback(chrome.fileSystem.restoreEntry, id)},
  chooseEntry(options) {return v2.rt.chrome._callback(chrome.fileSystem.chooseEntry, options)},
  chooseFile(type, options) {
    if (!options) options = {}
    return v2.rt.chrome.chooseEntry({
      type: 'openFile',
      acceptsMultiple: !!options.multiple,
      accepts: options.accepts && [v2.rt.chrome._parseAccepts(options.accepts)],
    }).then(entry => Array.isArray(entry) ?
      Promise.all(entry.map(v2.fs.file)) : v2.fs.file(entry))
  },
  _parseAccepts(str) {
    const mimeTypes = [], extensions = []
    for (const part of str.split(',')) {
      if (part[0] === '.') extensions.push(part.slice(1))
      else mimeTypes.push(part)
    }
    return {mimeTypes, extensions}
  },
  saveFile(data, name, options) {
    if (!options) options = {}
    data = v2.asBlob(data, options)
    return v2.rt.chrome.hasPermission({permissions: ['fileSystem.write']}).then(r => !r ? v2.rt.web.saveFile(data, name, options) : v2.rt.chrome.chooseEntry({
      type: 'saveFile',
      suggestedName: name,
      accepts: [{
        mimeTypes: [options.type || data.type],
        extensions: [v2.path.ext(name)],
      }],
    }).then(e => v2.fs.createWriter(e)).then(w => new Promise((r, j) => {
      w.onwrite = r
      w.onerror = j
      w.write(data)
    })))
  },
}
for (const t of v2.rt.types) {
  v2.rt[`is${v2.ucfirst(t)}`] = v2.rt.type === t
}
for (const p of v2.rt.platforms) {
  v2.rt[`is${v2.ucfirst(p)}`] = v2.rt.platform === p
}
v2.rt.isApple = v2.rt.isMac || v2.rt.isIOS
v2.rt.current = v2.rt[v2.rt.type] || {}

v2.chooseFile = v2.rt.current.chooseFile || v2.rt.web.chooseFile
v2.saveFile = v2.rt.current.saveFile || v2.rt.web.saveFile

v2.iter = function() {
  function is(xs) {return typeof xs[Symbol.iterator] === 'function' || typeof xs.next === 'function'}
  function from(xs) {return new Iter(typeof xs[Symbol.iterator] === 'function' ? xs[Symbol.iterator]() : xs)}
  function generator(gen) {return (...args) => new Iter(gen(...args))}
  const G = generator

  const range = G(function*(start, end, skip = 1) {
    if (end === undefined) [start, end] = [0, start]
    if (skip > 0) for (let i = start; i < end; i += skip) yield i
    else for (let i = start; i > end; i += skip) yield i
  })
  const irange = G(function*(start = 0, skip = 1) {
    for (let i = start; ; i += skip) yield i
  })
  const replicate = G(function*(n, x) {for (let i = 0; i < n; ++i) yield x})
  const forever = G(function*(x) {for (;;) yield x})
  const iterate = G(function*(x, fn) {for (;; x = fn(x)) yield x})

  const entries = G(function*(o) {for (const k of Object.keys(o)) yield [k, o[k]]})
  function keys(o) {return new Iter(Object.keys(o)[Symbol.iterator]())}
  const values = G(function*(o) {for (const k of Object.keys(o)) yield o[k]})

  function split(xs, n = 2) {return new SplitSource(xs, n).derived}
  const cycle = G(function*(xs) {
    const cache = []
    for (const x of xs) {
      cache.push(xs)
      yield x
    }
    for (;;) yield* cache
  })
  const enumerate = G(function*(xs) {let i = 0; for (const x of xs) yield [i++, x]})
  const map = G(function*(xs, fn) {for (const x of xs) yield fn(x)})
  const filter = G(function*(xs, fn) {for (const x of xs) if (fn(x)) yield x})
  const concat = G(function*(...xss) {for (const xs of xss) yield* xs})
  const push = G(function*(xs, ...ys) {yield* xs; yield* ys})
  const unshift = G(function*(xs, ...ys) {yield* ys; yield* xs})
  const flatten = G(function*(xss) {for (const xs of xss) yield* xs})
  const chunksOf = G(function*(n, xs) {
    let list = []
    for (const x of xs) {
      if (list.length >= n) {yield list; list = []}
      list.push(x)
    }
    if (list.length) yield list
  })
  function first(xs) {
    if (Array.isArray(xs)) return xs[0]
    for (const x of xs) return x
  }
  function last(xs) {
    if (Array.isArray(xs)) return xs[xs.length - 1]
    let z
    for (const x of xs) z = x
    return z
  }
  const drop = G(function*(n, xs) {for (const x of xs) if (n <= 0) yield x; else --n})
  const dropWhile = G(function*(xs, fn) {let init = true; for (const x of xs) if (!init || !fn(x)) {init = false; yield x}})
  const dropLast = G(function*(n, xs) {
    if (n === 0) yield* xs; else {
      const list = []
      let i = 0
      for (const x of xs) {
        if (i >= n) yield list[i % n]
        list[i++ % n] = x
      }
    }
  })
  const take = G(function*(n, xs) {for (const x of xs) if (n-- > 0) yield x; else return})
  const takeWhile = G(function*(fn, xs) {for (const x of xs) if (fn(x)) yield x; else return})
  const takeLast = G(function*(n, xs) {
    const list = []
    let i = 0
    for (const x of xs) list[i++ % n] = x
    if (n > list.length) n = list.length
    for (let j = 0; j < n; j++) yield list[(i + j) % n]
  })
  const zip = G(function*(...xss) {
    const its = map(xs => xs[Symbol.iterator](), xss)
    for (;;) {
      const rs = its.map(it => it.next())
      if (some(r => r.done, rs)) return
      yield rs.map(r => r.value)
    }
  })

  function every(fn, xs) {for (const x of xs) if (!fn(x)) return false; return true}
  function some(fn, xs) {for (const x of xs) if (fn(x)) return true; return false}
  function find(fn, xs) {for (const x of xs) if (fn(x)) return x}
  // function findIndex(fn, xs) {for (const [i, x] of enumerate(xs)) if (fn(x)) return i}
  function findIndex(fn, xs) {let i = 0; for (const x of xs) {if (fn(x)) return i; ++i} return -1}
  function findLastIndex(fn, xs) {let i = 0, j = -1; for (const x of xs) {if (fn(x)) j = i; ++i} return j}
  //function indexOf(y, xs) {return findIndex(x => x === y, xs)}
  function indexOf(y, xs) {let i = 0; for (const x of xs) {if (x === y) return i; ++i} return -1}
  function lastIndexOf(y, xs) {let i = 0, j = -1; for (const x of xs) {if (x === y) j = i; ++i} return j}
  function includes(y, xs) {
    for (const x of xs) if (x === y) return true
    return false
  }
  function reduce(a, fn, xs) {for (const x of xs) a = fn(a, x); return a}
  function inject(a, fn, xs) {for (const x of xs) fn(a, x); return a}

  function head(xs) {for (const x of xs) return x}
  function last(xs) {if (Array.isArray(xs)) return xs[xs.length - 1]; let l; for (const x of xs) l = x; return l}
  function tail(xs) {return drop(1, xs)}
  function init(xs) {return dropLast(1, xs)}

  function count(xs) {if (Array.isArray(xs)) return xs.length; let i = 0; for (const x of xs) ++i; return i}
  function pick(i, xs) {if (Array.isArray(xs)) return xs[i]; for (const x of xs) if (i-- <= 0) return x}

  function sum(xs) {return reduce(0, (x, y) => x + y, xs)}
  function product(xs) {return reduce(1, (x, y) => x * y, xs)}
  function max(xs) {return reduce(-Infinity, Math.max, xs)}
  function min(xs) {return reduce(Infinity, Math.min, xs)}
  function groupBy(fn, xs) {return inject(new Map, (m, x) => {
    const k = fn(x), l = m.get(k)
    if (l) l.push(x)
    else m.set(k, [x])
  }, xs)}

  const unique = G(function*(xs) {
    const used = new Set
    for (const x of xs) {
      if (!used.has(x)) {
        yield x
        used.add(x)
      }
    }
  })

  function array(xs) {return Array.from(xs)}
  const intersperse = G(function*(sep, xs) {
    let use = false
    for (const x of xs) {
      if (use) yield sep
      yield x
      use = true
    }
  })
  function join(sep, xs) {
    let s = ''
    if (sep) {
      let use = false
      for (const x of xs) {
        if (use) s += sep
        s += x
        use = true
      }
    } else {
      for (const x of xs) s += x
    }
    return s
  }

  const slice = G(function*(xs, start = 0, end) {
    if (Array.isArray(xs)) {
      if (start < 0) start += array.length
      if (end === undefined) end = array.length
      else if (end < 0) end += array.length
      for (let i = start; i < end; ++i) yield array[i]
    } else if (end === undefined) {
      yield* start < 0 ? takeLast(-start, xs) : drop(start, xs)
    } else if (start >= 0) {
      let i = 0
      if (end === 0) return
      else if (end > 0) {
        for (const x of xs) {
          if (i >= start) yield x
          if (++i >= end) return
        }
      } else {
        // yield* dropLast(-end, drop(start, xs))
        const list = []
        const n = -end
        for (const x of xs) {
          if (i >= start) {
            const k = (i - start) % n
            if (i - start >= n) yield list[k]
            list[k] = x
          }
          ++i
        }
      }
    } else {
        // yield* dropLast(-end, takeLast(-start, xs))
      const list = []
      let n = -start
      let i = 0
      for (const x of xs) list[i++ % n] = x
      if (n > list.length) n = list.length
      for (let j = 0; j < n + end; j++) yield list[(i + j) % n]
    }
  })

  class Iter {
    constructor(inner) {this.inner = inner}
    [Symbol.iterator]() {return this.inner}
    next() {return this.inner.next()}
    array() {return Array.from(this.inner)}
    join(sep) {return join(sep, this)}
    intersperse(sep) {return intersperse(sep, this)}

    split() {return split(this.inner)}
    cycle() {return cycle(this.inner)}
    enumerate() {return enumerate(this.inner)}
    map(fn) {return map(this.inner, fn)}
    filter(fn) {return filter(this.inner, fn)}
    concat(...xs) {return concat(...[this.inner, ...xs])}
    push(...xs) {return push(this.inner, ...xs)}
    unshift(...xs) {return unshift(this.inner, ...xs)}
    flatten() {return flatten(this.inner)}
    chunksOf(n) {return chunksOf(n, this.inner)}
    drop(n) {return drop(n, this.inner)}
    dropWhile(fn) {return dropWhile(this.inner, fn)}
    dropLast(n) {return dropLast(n, this.inner)}
    take(n) {return take(n, this.inner)}
    takeWhile(fn) {return takeWhile(this.inner, fn)}
    takeLast(n) {return takeLast(n, this.inner)}
    zip(...xs) {return zip(...[this.inner, ...xs])}

    every(fn) {return every(fn, this.inner)}
    some(fn) {return some(fn, this.inner)}
    find(fn) {return find(fn, this.inner)}
    findIndex(fn) {return findIndex(fn, this.inner)}
    findLastIndex(fn) {return findLastIndex(fn, this.inner)}
    indexOf(x) {return indexOf(x, this.inner)}
    lastIndexOf(x) {return lastIndexOf(x, this.inner)}
    includes(x) {return includes(x, this.inner)}
    reduce(x, fn) {return reduce(x, fn, this.inner)}
    inject(x, fn) {return inject(x, fn, this.inner)}

    head() {return head(this.inner)}
    last() {return last(this.inner)}
    tail() {return tail(this.inner)}
    init() {return init(this.inner)}
    count() {return count(this.inner)}
    pick(i) {return pick(i, this.inner)}

    sum() {return sum(this.inner)}
    product() {return product(this.inner)}
    max() {return max(this.inner)}
    min() {return min(this.inner)}

    groupBy(fn) {return groupBy(fn, this.inner)}
    unique() {return unique(this.inner)}

    slice(start, end) {return slice(this.inner, start, end)}
  }
  class SplitSource {
    constructor(iter, n) {
      this.iter = iter
      this.derived = Array(n)
      for (let i = this.derived.length; i--;) {
        this.derived[i] = new SplitIter(this)
      }
    }
    pull() {
      const {done, value} = this.iter.next()
      if (done) return
      for (const b of this.derived) b.push(value)
    }
  }
  class SplitIter extends Iter {
    constructor(source) {
      super(this)
      this.inner = this
      this.buffer = []
      this.source = source
    }
    [Symbol.iterator]() {return this}
    push(v) {this.buffer.push(v)}
    next() {
      if (!this.buffer.length) this.source.pull()
      return this.buffer.length ? {done: false, value: this.buffer.shift()} : {done: true}
    }
  }

  Object.assign(from, {
    is, from, generator,
    range, irange, replicate, forever, iterate,
    entries, keys, values,
    array, intersperse, join,

    split, cycle, enumerate,
    map, filter, concat, push, unshift, flatten, chunksOf,
    drop, dropWhile, dropLast,
    take, takeWhile, takeLast,
    zip,
    every, some, find, findIndex, findLastIndex, indexOf, lastIndexOf, includes, reduce, inject,
    head, last, tail, init,
    count, pick,
    sum, product, max, min,
    groupBy, unique,
    slice,
  })
  return from
}()

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
  },
  ext(s) {
    const i = s.lastIndexOf('/')
    if (i !== -1) s = s.slice(i + 1)
    const j = s.lastIndexOf('.')
    return j === -1 ? '' : s.slice(j + 1)
  },
}

v2.emitter = function emitter(o) {
  Object.defineProperties(o, {
    on: {value: function on(e, fn) {
      const m = this._listeners || (this._listeners = new Map)
      const l = m.get(e)
      if (l) l.push(fn)
      else m.set(e, [fn])
      return this
    }},
    once: {value: function once(e, fn) {
      const bound = () => {
        fn()
        this.unlisten(e, bound)
      }
      this.on(e, bound)
      return this
    }},
    unlisten: {value: function unlisten(e, fn) {
      const m = this._listeners
      if (!m) return this
      const l = m.get(e)
      if (!l) return this
      const i = l.indexOf(fn)
      if (i !== -1) l.splice(i, 1)
      return this
    }},
    listeners: {value: function listeners(e) {
      const m = this._listeners
      return m ? m.get(e) || [] : []
    }},
    emit: {value: function emit(e, arg) {
      const m = this._listeners
      if (!m) return
      const l = m.get(e)
      if (!l) return
      for (let i = l.length; i--;) l[i](arg)
      return this
    }},
  })
}
v2.watchableProperty = function watchableProperty(o, name, get) {
  const _name = `_${name}`
  const event = `${name} change`
  Object.defineProperty(o, name, {
    enumerable: true,
    get: get || function get() {return this[_name]},
    set(value) {
      const oldValue = this[_name]
      if (oldValue === value) return
      this[_name] = value
      const e = {target: this, name, value, oldValue}
      this.emit(event, e)
      this.emit('change', e)
    },
  })
}
class Model {
  constructor(o) {if (o) Object.assign(this, o)}
  sendAllProperties(fn) {
    for (const name of this.dataProperties) {
      fn({target: this, name, value: this[name], oldValue: null})
    }
    return this
  }
  toJSON() {
    const o = {}
    for (const k of this.dataProperties) o[k] = this[k]
    return o
  }

  static _property(name, opts) {
    this.dataProperties.push(name)
    v2.watchableProperty(this.prototype, name, opts)
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
v2.emitter(Model.prototype)

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
    return v2.iter.last(this.intermediates)[v2.iter.last(this.path)]
  }
  set value(value) {
    if (this.isIncomplete) return
    v2.iter.last(this.intermediates)[v2.iter.last(this.path)] = value
  }

  update() {
    if (this.isIncomplete) return
    const value = this.other.value
    if (!value) return
    const object = v2.iter.last(this.intermediates)
    const name = v2.iter.last(this.path)
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

class View {
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
    return c.startsWith('rt-') ? v2.rt.type === c.slice(3) :
      c === 'pf-apple' ? v2.rt.isApple :
      c.startsWith('pf-') ? v2.rt.platform === c.slice(3) : false
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
    this.el.parentNode.removeChild(this.el)
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
v2.emitter(View.prototype)

class App extends View {
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
    this._appKeyDown = this._appKeyDown.bind(this)
  }
  build() {
    return h('.v2-view.v2-app')
  }
  start() {return this.mount(document.body)}

  _onActivate() {
    document.addEventListener('contextmenu', this._contextMenu)
    document.addEventListener('mousedown', this._appMouseDown, true)
    document.addEventListener('keydown', this._appKeyDown)
  }
  _onDeactivate() {
    document.removeEventListener('contextmenu', this._contextMenu)
    document.removeEventListener('mousedown', this._appMouseDown, true)
    document.removeEventListener('keydown', this._appKeyDown)
  }
  _contextMenu(e) {
    if (e.target.localName !== 'textarea' && (e.target.localName !== 'input' || !['text', 'search', 'tel', 'url', 'email', 'password', 'date', 'month', 'week', 'time', 'datetime-local', 'number'])) e.preventDefault()
  }
  _appKeyDown(e) {
    let t = e.target
    if (t === document.body) t = this.el
    const key = v2.keyWithModifiers(e)
    const override = h.acceptsKeyboardInput(t, e)
    const cmd = key.includes('#')
    for (; t; t = t.parentElement) {
      const v = t.view
      if (!v || !v.keyBindings) continue
      for (const b of v.keyBindings) {
        if (b.key !== key ||
          override && (cmd ? b.override === false : !b.override) ||
          b.context && (
            typeof b.context === 'string' ? !v.hasContext(b.context) :
            b.context.some(c => !v.hasContext(c)))) continue
        v[b.command](...(b.args || []))
        e.preventDefault()
        return
      }
    }
    if (v2.rt.isMac && v2.rt.isChrome && key === '`#f') {
      const win = chrome.app.window.current()
      if (win.isFullscreen()) win.restore()
      else win.fullscreen()
    }
  }
  _appMouseDown(e) {
    const m = h.nearest('.v2-menu:not(.v2-menu-bar)', e.target)
    if (m) return
    else this.hideMenus()
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

class List {
  constructor(data) {
    this._data = data || []
    this._changes = []
    this._immediate = false
    this._lengthChange = null
    this._sendChanges = this._sendChanges.bind(this)
  }

  get data() {return this._data.slice()}
  set data(xs) {
    const old = this._data
    this._data = xs
    this._splice(0, xs.length, old.slice())
  }

  get length() {return this._data.length}
  set length(value) {
    const l = this._data.length
    const original = this._data.slice()
    this._data.length = value
    const nl = this._data.length
    if (l < nl) this._splice(l, nl - l, [])
    else if (l > nl) this._splice(nl, 0, original.slice(nl))
  }
  get(i) {return this._data[this._index(i)]}
  set(i, value) {
    i = this._index(i)
    const oldValue = this._data[i]
    this._data[i] = value
    this._replaced(i, [oldValue])
    return this
  }
  fill(value, start, end) {
    start = start == null ? 0 : this._index(start)
    end = end == null ? this.length : this._index(end)
    const original = this._data.slice(start, end)
    this._data.fill(value, start, end)
    this._replaced(start, original)
    return this
  }
  copyWithin(target, start, end) {
    target = this._index(target)
    start = start == null ? 0 : this._index(start)
    end = end == null ? this.length : this._index(end)
    const targetLength = Math.min(end - start, this.length - target)
    const original = this._data.slice(target, target + targetLength)
    this._data.copyWithin(target, start, end)
    this._splice(target, original)
    return this
  }
  _index(i) {
    const length = this.length
    i = i | 0
    if (i < 0) i += length
    return i < 0 ? 0 : i > length ? length : i
  }

  push(...xs) {
    const l = this.length
    this._data.push(...xs)
    this._splice(l, xs.length, [])
  }
  pop() {
    const x = this._data.pop()
    this._splice(this.length, 0, [x])
    return x
  }
  unshift(...xs) {
    this._data.unshift(...xs)
    this._splice(0, xs.length, [])
  }
  shift() {
    const x = this._data.shift()
    this._splice(0, 0, [x])
    return x
  }
  splice(i, remove, ...add) {
    const removed = this._data.splice(i, remove, ...add)
    this._splice(i, add.length, removed.slice())
    return removed
  }
  reverse() {
    const original = this._data.slice()
    this._data.reverse()
    this._splice(0, this.length, original)
    return this
  }
  sort(fn) {
    const original = this._data.slice()
    this._data.sort(fn)
    this._replaced(0, original)
    return this
  }

  _splice(i, added, removed) {
    const d = this._data
    for (let j = i, k = 0;;) {
      for (let m = k; m < removed.length; ++m) {
        for (let l = j; l < i + added; ++l) {
          if (removed[m] === d[l]) {
            this._rawSplice(j, l - j, removed.slice(k, m))
            j = l + 1
            k = m + 1
            while (k < removed.length && j < i + added && removed[k] === d[j]) {++k, ++j}
            continue
          }
        }
      }
      this._rawSplice(j, i + added - j, removed.slice(k))
      break
    }
    if (added !== removed.length) {
      const c = this._lengthChange, l = this.length
      if (c) c.value = l
      else this._lengthChange = {target: this, name: 'length', value: l, oldValue: l - added + removed.length}
    }
  }
  _rawSplice(i, added, removed) {
    if (added === 0 && removed.length === 0) return
    this._changed(added === removed.length ?
      {type: 'replace', start: i, end: i + added, oldValues: removed} :
      {type: 'splice', index: i, added, removed})
  }
  _replaced(i, oldValues) {this._splice(i, oldValues.length, oldValues)}
  _changed(data) {
    if (!this._immediate) {
      v2.immediate(this._sendChanges)
      this._immediate = true
    }
    this._changes.push(data)
  }
  _sendChanges() {
    this._immediate = false
    if (this._lengthChange) {
      this.emit('length change', this._lengthChange)
    }
    this.emit('change', {target: this, changes: this._changes.slice()})
    this._changes.length = 0
  }

  [Symbol.iterator]() {return this._data[Symbol.iterator]()}
  entries() {return this._data.entries()}
  values() {return this._data.values()}
  keys() {return this._data.keys()}

  forEach(fn, self) {this._data.forEach(fn, self)}
  map(fn, self) {return this._data.map(fn, self)}
  filter(fn, self) {return this._data.filter(fn, self)}
  some(fn, self) {return this._data.some(fn, self)}
  every(fn, self) {return this._data.every(fn, self)}
  reduce(fn, start) {return this._data.reduce(fn, start)}
  reduceRight(fn, start) {return this._data.reduceRight(fn, start)}

  includes(x) {return this._data.includes(x)}
  indexOf(x) {return this._data.indexOf(x)}
  lastIndexOf(x) {return this._data.lastIndexOf(x)}
  find(fn, self) {return this._data.find(fn, self)}
  findIndex(fn, self) {return this._data.findIndex(fn, self)}

  join(sep) {return this._data.join(sep)}
  toLocaleString() {return this._data.toLocaleString()}
  toString() {return this._data.toString()}
  toJSON() {return this._data}
}
v2.emitter(List.prototype)

class FilteredList {
  constructor(o) {
    if (o instanceof List) o = {model: o}
    this._changes = []
    this._data = []
    this._indices = []
    this._model = null
    this._include = null
    // this._transform = null
    this._compare = null
    this._modelChanged = this._modelChanged.bind(this)
    Object.assign(this, o)
  }

  get data() {throw new Error('Invalid')}
  get length() {return this._data.length}

  set() {throw new Error('Immutable')}
  fill() {throw new Error('Immutable')}
  copyWithin() {throw new Error('Immutable')}
  push() {throw new Error('Immutable')}
  pop() {throw new Error('Immutable')}
  unshift() {throw new Error('Immutable')}
  shift() {throw new Error('Immutable')}
  splice() {throw new Error('Immutable')}
  reverse() {
    const f = this._include
    this.include = x => !f(x)
  }
  sort(fn) {this.compare = fn || ((a, b) => (''+a).localeCompare(''+b))}

  get model() {return this._model}
  set model(value) {
    if (this._model === value) return
    if (this._model) this._unlisten()
    if (this._model = value) this._listen()
    this._updateAll()
  }
  destroy() {if (this._model) this._unlisten()}
  _listen() {this._model.on('change', this._modelChanged)}
  _unlisten() {this._model.unlisten('change', this._modelChanged)}
  _modelChanged(e) {
    const f = this._include
    this._changes.length = 0
    for (const c of e.changes) {
      if (c.type === 'splice') {
        let i = c.index
        for (const m of c.removed) {
          const j = this._indices[i]
          if (j != null) this._delete(j, i)
          ++i
        }
        const l = c.index + c.added
        for (let i = c.index; i < l; ++i) {
          const m = this._model._data[i]
          const include = !f || f(m)
          if (include) this._insert(m, i)
        }
      } else if (c.type === 'replace') {
        for (let i = c.start; i < c.end; ++i) {
          const m = this._model._data[i]
          const include = !f || f(m)
          const j = this._indices[i]
          if (include) {
            if (j == null) this._insert(m, i)
            else this._update(j, m)
          } else if (j != null) {
            this._delete(j, i)
          }
        }
      }
    }
    this._sendChanges()
  }
  _insert(y, i) {
    const c = this._compare
    let j
    if (c) {
      const l = this._data.length
      for (j = 0; j < l && c(y, this._data[j]) > 0; ++j) {}
    } else {
      while (j == null && i < this._model._data.length) j = this._indices[i++]
      if (j == null) j = this._data.length
    }
    for (let l = 0; l < this._indices.length; ++l) {
      const k = this._indices[l]
      if (k != null && k >= j) ++this._indices[l]
    }
    this._changes.push({type: 'splice', index: j, added: 1, removed: []})
    this._data.splice(j, 0, y)
    this._indices[i] = j
  }
  _delete(j, i) {
    const old = this._data[j]
    this._changes.push({type: 'splice', index: j, added: 0, removed: [old]})
    this._data.splice(j, 1)
    this._indices[i] = null
    for (let l = 0; l < this._indices.length; ++l) {
      const k = this._indices[l]
      if (k != null && k > j) --this._indices[l]
    }
  }
  _update(j, y) {
    const old = this._data[j]
    this._changes.push({type: 'replace', start: j, end: j + 1, oldValues: [old]})
  }
  _changed(c) {this._changes.push(c)}
  _sendChanges() {this.emit('change', {target: this, changes: this._changes})}

  get include() {return this._include}
  set include(value) {
    if (this._include === value) return
    this._include = value
    this._updateAll()
  }
  // get transform() {return this._transform}
  // set transform(value) {
  //   if (this._transform === value) return
  //   this._transform = value
  //   this._updateAll()
  // }
  get compare() {return this._compare}
  set compare(value) {
    if (this._compare === value) return
    this._compare = value
    this._updateAll()
  }

  resort() {this._updateAll()}
  _updateAll() {
    const old = this._data.slice()
    if (!this._model) {
      this._data.length = 0
      this._indices.length = 0
      this._changes.length = 0
      this._splice(0, 0, old)
      this._sendChanges()
      return
    }
    const data = []
    const f = this._include
    let index = 0
    for (const x of this._model._data) {
      if (!f || f(x)) data.push({index, value: x})
      ++index
    }
    if (this._compare) {
      data.sort((x, y) => this._compare(x.value, y.value))
    }
    this._data = data.map(x => x.value)
    let j = 0
    for (const x of data) this._indices[x.index] = j++
    this._changes.length = 0
    this._splice(0, this._data.length, old)
    this._sendChanges()
  }
}
v2.emitter(FilteredList.prototype)
for (const k of '_splice _rawSplice _replaced _index get entries values keys forEach map filter some every reduce reduceRight includes indexOf lastIndexOf find findIndex join toLocaleString toString'.split(' ').concat(Symbol.iterator)) {
  FilteredList.prototype[k] = List.prototype[k]
}

class CyNode extends Model {
  constructor(data, children) {
    super({data})
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

class DynamicTreeItem extends View {
  init() {
    this._model = null
    this.items = null
    this.tree = null
    this.isExpanded = false
    this._content = null
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
    if (value) {
      value.on('child inserted', this._childInserted)
      value.on('child removed', this._childRemoved)
      if (this._label) {
        h.pushView(this)
        h.add(this._label, this._content = this.tree.template(value.data))
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

class Tree extends View {
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
    this.keyBindings = Tree.keyBindings
  }
  build() {
    return h('.v2-view.v2-tree', {tabIndex: 0, onscroll: '_scroll', onmousedown: '_mouseDown'},
      this._overflowEl = h('.v2-tree-overflow'))
  }

  get model() {return this._model}
  set model(value) {
    this._model = value
    this._linear.length = 0
    this._root = new Tree._L(this, -1, value)
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
  selectFirst() {
    this._select(this._linear[0])
  }
  selectPrevious() {
    const i = this._linear.indexOf(this._lastL)
    const j = i === -1 ? this._linear.length - 1 : i > 0 ? i - 1 : 0
    this._select(this._linear[j])
  }
  selectLast() {
    this._select(this._linear[this._linear.length - 1])
  }
  selectNext() {
    const i = this._linear.indexOf(this._lastL)
    const end = this._linear.length - 1
    const j = i === -1 ? 0 : i < end ? i + 1 : end
    this._select(this._linear[j])
  }
  selectIn() {
    if (!this._lastL || !this._lastL.isExpandable) return
    if (this._lastL.isExpanded) {
      this._select(this._lastL.children[0])
    } else this._lastL.toggle(e.ctrlKey || e.metaKey)
  }
  selectOut() {
    if (!this._lastL) return
    if (this._lastL.isExpanded) this._lastL.toggle(e.ctrlKey || e.metaKey)
    else {
      const p = this._parentOf(this._lastL)
      if (p) this._select(p)
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
  _hasContext(n) {
    return n === 'editing' ? this._editing && this._editItem.visible : super._hasContext(n)
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
        this._editItem = new Tree._EditItem({tree: this, model: l})
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
      item = new Tree._Item({tree: this, model: l})
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
Tree.keyBindings = [
  {key: 'Return', command: 'acceptEdit', context: 'editing'},
  {key: 'Escape', command: 'cancelEdit', context: 'editing'},
  {key: '/ArrowUp', command: 'selectFirst'},
  {key: 'ArrowUp', command: 'selectPrevious'},
  {key: '/ArrowDown', command: 'selectLast'},
  {key: 'ArrowDown', command: 'selectNext'},
  {key: 'ArrowRight', command: 'selectIn'},
  {key: 'ArrowLeft', command: 'selectOut'},
]
Tree._L = class _L {
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
    const l = new Tree._L(this, this.level + 1, e.node)
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
      this.children = this.node.children.map(c => new Tree._L(this.tree, this.level + 1, c))
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
Tree._Item = class _Item extends View {
  get model() {return this._model}
  set model(value) {
    if (this._model === value) return
    if (this._model) {
      this._model.node.unlisten('data change', this._dataChanged)
    }
    if (this._model = value) {
      this._update()
      value.node.on('data change', this._dataChanged)
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
    this.el.classList.toggle('v2-tree-item--expanded', this._model.isExpanded)
  }
  _selected() {
    this.el.classList.toggle('v2-tree-item--selected', this._model.isSelected)
  }
  _dataChanged() {
    if (!this._model) return
    this.text = this.tree._transform ? this.tree._transform(this._model.node.data) : this._model.node.data
  }
  _update() {
    this._toggled()
    this._selected()
    this.el.classList.toggle('v2-tree-item--empty', this._model.node.children.length === 0)
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
Tree._EditItem = class _EditItem extends Tree._Item {
  build() {
    return h('.v2-tree-item.v2-tree-item--editing',
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

class Collection extends View {
  // TODO support collections containing multiple identical items
  init() {
    this._tileWidth = 200
    this._tileHeight = 275
    this._justifyTiles = true
    this.itemsPerLine = 1
    this._cache = new Map
    this._unused = []
    this._bb = null
    this._model = null
    this._scrollY = 0
    this._selection = new Set
    this.Item = this.constructor.Item
    this._reflow = this._reflow.bind(this)
    this._changed = this._changed.bind(this)
  }
  build() {
    return h('.v2-view.v2-collection', {tabIndex: 0, onscroll: '_scroll', onmousedown: '_mouseDown', onkeydown: '_keyDown', ondblclick: '_dblclick'},
      this._overflow = h('.v2-collection-overflow'))
  }
  menu() {}
  dblclick() {}

  showMenu(items, x, y) {
    if (!items) items = this.selectedItems
    if (!Array.isArray(items)) items = [items]
    const m = this.menu && this.menu(items)
    if (!m) return
    const done = m => {
      if (x == null) {
        for (const item of this._cache.values()) {
          if (item.selected) {
            const bb = item.el.getBoundingClientRect()
            x = bb.left + bb.width/2
            y = bb.top + bb.height/2
            break
          }
        }
        if (x == null) {
          x = this._bb.left
          y = this._bb.top
        }
      }
      m.show(this.app, x, y)
    }
    if (m.then) return m.then(done)
    else done(m)
  }

  get model() {return this._model}
  set model(value) {
    if (this._model === value) return
    if (this._model && this.isLive) this._unlisten()
    this._model = value
    if (this.isLive) {
      if (this._model) this._listen()
      this._reflow()
    }
  }
  _onActivate() {
    this._selection.clear()
    this.resize()
    if (this._model) this._listen()
  }
  _onDeactivate() {
    this._bb = null
    if (this._model) this._unlisten()
  }
  _listen() {this._model.on('change', this._changed)}
  _unlisten() {this._model.unlisten('change', this._changed)}
  _changed(e) {
    const selection = Array.from(this._selection)
    for (const c of e.changes) {
      if (c.type === 'splice') {
        const rend = c.index + c.removed.length
        for (let i = c.index; i < rend; ++i) {
          const k = selection.indexOf(i)
          if (k !== -1) selection.splice(k, 1)
        }
        const d = c.added - c.removed.length
        if (d) {
          const l = selection.length
          for (let i = 0; i < l; ++i) {
            if (selection[i] >= rend) selection[i] += d
          }
        }
      } else if (c.type !== 'replace') {
        for (let i = c.start; i < c.end; ++i) {
          const k = selection.indexOf(i)
          if (k !== -1) selection.splice(k, 1)
        }
      }
    }
    this._selection = new Set(selection)
    this._reflow()
  }

  _keyDown(e) {
    if (e.key === 'ArrowLeft') {
      this.selectLeft()
    } else if (e.key === 'ArrowRight') {
      this.selectRight()
    } else if (e.key === 'ArrowUp') {
      this.selectUp()
    } else if (e.key === 'ArrowDown') {
      this.selectDown()
    } else {
      return
    }
    e.preventDefault()
    e.stopPropagation()
  }
  _mouseDown(e) {
    const item = h.nearest('.v2-collection-item', e.target)
    const i = item && item.view.index
    if (e.button === 2) {
      const m = this.menu && this.menu(item ? this._selection.has(i) ? this.selectedItems : [this._model.get(i)] : [])
      if (m) {
        if (m.then) m.then(m => m.show(this.app, e.clientX, e.clientY))
        else m.show(this.app, e.clientX, e.clientY)
      }
      return
    }
    if (item) {
      if (e.metaKey || e.ctrlKey) {
        this.toggleSelect(i)
      } else if (e.shiftKey && this._selection.size) {
        this.selectRange(v2.iter.last(this._selection), i, true)
      } else {
        this.select(i)
      }
    } else {
      this.clearSelection()
    }
  }
  _dblclick(e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return
    this.dblclick(this.selectedItems)
  }

  focus() {this.el.focus()}
  selectLeft(add) {
    let i = v2.iter.last(this._selection)
    if (i == null) return this.selectFirst()
    const first = (i / this.itemsPerLine | 0) * this.itemsPerLine
    if (i === first) return
    while (!this._model.get(--i)) if (i <= first) return
    this.select(i, add)
    this.scrollToIndexIfNecessary(i)
  }
  selectRight(add) {
    let i = v2.iter.last(this._selection)
    if (i == null) return this.selectFirst()
    const last = (i / this.itemsPerLine + 1 | 0) * this.itemsPerLine - 1
    if (i === last) return
    while (!this._model.get(++i)) if (i >= last) return
    this.select(i, add)
    this.scrollToIndexIfNecessary(i)
  }
  selectUp(add) {
    let i = v2.iter.last(this._selection)
    if (i == null) return this.selectFirst()
    const start = i % this.itemsPerLine
    if (i === start) return
    while (!this._model.get(i -= this.itemsPerLine)) if (i <= start) return
    this.select(i, add)
    this.scrollToIndexIfNecessary(i)
  }
  selectDown(add) {
    let i = v2.iter.last(this._selection)
    if (i == null) return this.selectFirst()
    const end = this._model.length - (this._model.length - i) % this.itemsPerLine
    if (i === end) return
    while (!this._model.get(i += this.itemsPerLine)) if (i >= end) return
    this.select(i, add)
    this.scrollToIndexIfNecessary(i)
  }
  selectFirst() {
    let j = 0
    for (; !this._model.get(j); ++j) {
      if (j >= this._model.length) return
    }
    this.scrollToIndexIfNecessary(j)
    this.select(j)
    return this
  }
  selectAll() {
    if (this.model.length) this.selectRange(0, this.model.length - 1)
  }
  toggleSelect(i) {
    if (this._selection.has(i)) {
      this.deselect(i)
    } else {
      this.select(i, true)
    }
    return this
  }
  deselect(i) {
    this._selection.delete(i)
    const item = this.itemAtIndex(i)
    if (item) item.selected = false
    return this
  }
  select(i, add) {return this.selectRange(i, i, add)}
  selectRange(i, j, add) {
    if (i > j) [i, j] = [j, i]
    if (!add) this.clearSelection()
    for (let k = i; k <= j; ++k) {
      this._selection.add(k)
      const item = this.itemAtIndex(k)
      if (item) item.selected = true
    }
    return this
  }
  scrollToIndexIfNecessary(i) {
    if (!this.isLive) return
    const y0 = Math.floor(i / this.itemsPerLine) * this._tileHeight
    const y1 = y0 + this._tileHeight
    const y = this._scrollY, yh = y + this._bb.height
    if (y0 < y) this.el.scrollTop += y0 - y
    else if (y1 >= yh) this.el.scrollTop += y1 - yh
  }
  clearSelection() {
    for (const i of this._selection) {
      const item = this.itemAtIndex(i)
      if (item) item.selected = false
    }
    this._selection.clear()
    return this
  }
  itemAtIndex(i) {
    const m = this.model.get(i)
    if (!m) return null
    return this._cache.get(m)
  }

  get selectedItems() {
    return Array.from(this._selection).map(i => this._model.get(i))
  }

  resize() {
    this._bb = this.el.getBoundingClientRect()
    this._scroll()
  }
  _scroll() {
    this._scrollY = this.el.scrollTop
    this._reflow()
  }

  setTileSize(w, h) {
    this._tileWidth = w
    this._tileHeight = h
    for (const v of this._cache.values()) v.setSize(w, h)
    for (const v of this._unused) v.setSize(w, h)
    if (this.isLive) this._reflow()
  }
  _reflow() {
    if (!this._model) {
      this._unused.push(...this._cache.values())
      this._cache.clear()
      for (const unused of this._unused) unused.visible = false
      return
    }
    const perLine = this.itemsPerLine = Math.floor(this._bb.width / this._tileWidth)
    const buffer = 4
    const startLine = Math.max(0, Math.floor(this._scrollY / this._tileHeight) - buffer)
    const endLine = Math.floor((this._scrollY + this._bb.height) / this._tileHeight) + 1 + buffer
    const j = Math.min(this._model.length, endLine * perLine)
    const unused = new Map(this._cache)
    for (let i = startLine * perLine; i < j; ++i) {
      unused.delete(this._model.get(i))
    }
    for (const [k, v] of unused) {
      this._cache.delete(k)
      this._unused.push(v)
    }
    const distWidth = this._tileWidth + (this._bb.width - this._tileWidth * perLine) / (perLine - 1)
    for (let x = 0, y = startLine, i = startLine * perLine; i < j; ++i) {
      const view = this._dequeue(i)
      if (!view) continue
      view.index = i
      view.selected = this._selection.has(i)
      view.setPosition(this._justifyTiles ? x * distWidth | 0 : x * this._tileWidth, y * this._tileHeight)
      ++x
      if (x === perLine) x = 0, ++y
    }
    for (const unused of this._unused) unused.visible = false
    this._overflow.style.height = Math.ceil(this._model.length / perLine) * this._tileHeight + 'px'
  }
  _dequeue(i) {
    const m = this._model.get(i)
    if (!m) return null
    const item = this._cache.get(m)
    if (item) return item
    let unused = this._unused.pop()
    if (!unused) {
      this.add(unused = new this.Item())
      unused.setSize(this._tileWidth, this._tileHeight)
    } else {
      unused.visible = true
    }
    unused.model = m
    this._cache.set(m, unused)
    return unused
  }
}
Collection.Item = class Item extends View {
  init() {
    this.index = null
    this._selected = false
    this._visible = true
    this._model = null
    this._width = null
    this._height = null
    this._x = null
    this._y = null
    this._changed = this._changed.bind(this)
  }
  build() {
    return h('.v2-collection-item')
  }

  get selected() {return this._selected}
  set selected(value) {
    value = !!value
    if (this._selected === value) return
    this._selected = value
    this.el.classList.toggle('v2-collection-item--selected', value)
  }

  setPosition(x, y) {
    if (this._x !== x || this._y !== y) {
      this.el.style.transform = `translate3d(${this._x = x}px, ${this._y = y}px,0)`
    }
  }
  setSize(width, height) {
    if (this._width !== width) {
      this.el.style.width = `${this._width = width}px`
    }
    if (this._height !== height) {
      this.el.style.height = `${this._height = height}px`
    }
  }

  get visible() {return this._visible}
  set visible(value) {
    value = !!value
    if (this._visible === value) return
    if (!(this._visible = value)) {
      this.setPosition(0, 0)
    }
    this.el.style.visibility = value ? 'visible' : 'hidden'
  }

  _onActivate() {
    if (this._model) {
      this._update()
      this._listen()
    }
  }
  _onDeactivate() {if (this._model) this._unlisten()}

  get model() {return this._model}
  set model(value) {
    if (this._model === value) return
    if (this._model) this._unlisten()
    if ((this._model = value) && this.isLive) {
      this._update()
      this._listen()
    }
  }
  _unlisten() {this._model.unlisten('change', this._changed)}
  _listen() {this._model.on('change', this._changed)}
  _changed() {this._update()}
  _update() {}
}

class Menu extends View {
  init() {
    this.ownerItem = null
    this._openMenu = null
    this._openMenuHidden = this._openMenuHidden.bind(this)
    this._selectedItem = null
    this._clearDelay = 500
    this._typeTimeout = null
    this._clear = this._clear.bind(this)
  }
  build() {
    return h('.v2-menu.v2-view', {onmouseup: '_click', onmousemove: '_mouseSelect', onkeydown: '_keyDown', onfocusin: '_focusIn'},
      this._input = h('input.v2-menu-input', {oninput: '_selectByTitle'}))
  }

  _focusIn(e) {
    const item = h.nearest('.v2-menu-item', e.target)
    if (item) this.selectItem(item.view)
  }

  show(app, x, y, bw = 1, bh = 1, offset = true, focus = true) {
    x = Math.round(x), y = Math.round(y), bw = Math.round(bw), bh = Math.round(bh)
    this.selectItem(null)
    app.addMenu(this)
    const bb = this.el.getBoundingClientRect()
    const w = Math.ceil(bb.width), h = Math.ceil(bb.height)
    const pt = offset ? parseInt(getComputedStyle(this.el).paddingTop) : 0
    x += bw, y += bh - pt
    if (x > innerWidth - w) x -= w + bw
    if (y > innerHeight - h) y -= h + bh - pt
    x = Math.max(0, x)
    y = Math.max(0, y)
    this.el.style.transform = `translate(${x}px, ${y}px)`
    if (focus) setTimeout(() => this.focus())
  }
  hide() {
    this.emit('hide', {target: this})
    this.remove()
    if (this._openMenu) {
      this._openMenu.hide()
      this._openMenu = null
    }
  }
  get visible() {return !!this.parent}

  get target() {return this._target || this.ownerItem && this.ownerItem.target}
  set target(value) {this._target = value}

  _click(e) {
    const el = h.nearest('.v2-menu-item', e.target)
    if (el && !el.classList.contains('v2-menu-item--disabled')) this._activateItem(el.view, e)
  }
  _activateItem(v, e) {
    const app = this.app
    if (app) app.hideMenus()
    else this.hide()

    const t = v.target
    const a = v.action
    if (typeof a === 'function') a(e)
    else if (typeof t === 'function') t(a, e)
    else if (t && a && typeof t[a] === 'function') t[a](e)

    const obj = {target: this, item: v}
    for (let m = this; m; m = m.ownerItem && m.ownerItem.parent) {
      m.emit('activate', obj)
    }
  }
  _mouseSelect(e) {
    const t = h.nearest('.v2-menu-item', e.target)
    if (t && !t.classList.contains('v2-menu-item--disabled')) this.selectItem(t.view, true)
  }
  _showMenu(v, focus = false) {
    const bb = v.el.getBoundingClientRect()
    v.menu.show(this.app, bb.left, bb.top, bb.width, 0, true, focus)
  }
  focus() {this._input.focus()}
  _keyDown(e) {
    const k = v2.keyWithModifiers(e)
    switch (k) {
      case 'ArrowUp':
      // case 'k':
        this.selectPrevious()
        break
      case 'ArrowDown':
      // case 'j':
        this.selectNext()
        break
      case '/ArrowUp':
      case '#ArrowUp':
      // case '#k':
      // case '^K':
        this.selectFirst()
        break
      case '/ArrowDown':
      case '#ArrowDown':
      // case '#j':
      // case '^J':
        this.selectLast()
        break
      case 'ArrowLeft':
      // case 'h':
        if (this.ownerItem) {
          if (this.ownerItem.parent instanceof MenuBar) {
            this.ownerItem.parent.selectPrevious()
          } else {
            this.hide()
          }
        }
        break
      case 'ArrowRight':
      // case 'l':
        if (this._selectedItem && this._selectedItem.menu) {
          this.openMenu = this._selectedItem.menu
          this._showMenu(this._selectedItem, true)
          this._selectedItem.menu.selectFirst()
        } else if (this.ownerItem && this.ownerItem.parent instanceof MenuBar) {
          this.ownerItem.parent.selectNext()
        }
        break
      case 'Enter':
      // case 'o':
        if (this._selectedItem) this._activateItem(this._selectedItem, e)
        break
      default:
        if (!h.constrainTab(e, this.el)) return
    }
    e.preventDefault()
    e.stopPropagation()
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
    const re = new RegExp('^' + v2.escapeRegExp(title.trim()).replace(/\s+/, '\\s+'), 'i')
    for (const v of this.children) {
      if (re.test(v.title)) return this.selectItem(v)
    }
  }

  selectNext() {
    if (!this.selectedItem) return this.selectFirst()
    const el = h.nextDescendentMatching('.v2-menu-item:not(.v2-menu-item--disabled)', h.nextSkippingChildren(this.selectedItem.el, this.el), this.el)
    if (el) this.selectItem(el.view)
  }
  selectPrevious() {
    if (!this.selectedItem) return this.selectLast()
    const el = h.previousDescendentMatching('.v2-menu-item:not(.v2-menu-item--disabled)', h.previous(this.selectedItem.el), this.el)
    if (el) this.selectItem(el.view)
  }
  selectFirst() {
    const el = h.nextDescendentMatching('.v2-menu-item:not(.v2-menu-item--disabled)', this.el.firstElementChild, this.el)
    if (el) this.selectItem(el.view)
  }
  selectLast() {
    const el = h.previousDescendentMatching('.v2-menu-item:not(.v2-menu-item--disabled)', h.lastDescendent(this.el), this.el)
    if (el) this.selectItem(el.view)
  }

  get openMenu() {return this._openMenu}
  set openMenu(value) {
    if (this._openMenu) {
      this._openMenu.unlisten('hide', this._openMenuHidden)
    }
    if (this._openMenu = value) {
      value.on('hide', this._openMenuHidden)
    }
  }
  _openMenuHidden() {
    this.openMenu = null
    this.focus()
  }

  get selectedItem() {return this._selectedItem}
  selectItem(view, showMenu) {
    if (this._selectedItem === view) return
    if (this._openMenu && (!view || this._openMenu !== view.menu)) {
      this._openMenu.unlisten('hide', this._openMenuHidden)
      this._openMenu.hide()
      this.focus()
    }
    if (this._selectedItem) this._selectedItem.selected = false
    if (this._selectedItem = view) {
      view.selected = true
    }
    if ((showMenu || this instanceof MenuBar) && view && view.menu) {
      this.openMenu = view.menu
      this._showMenu(view)
    }
    if (!this.el.contains(document.activeElement)) this.focus()
  }

  set spec(value) {
    for (const x of value) if (x) {
      if (x === '-') {
        this.el.appendChild(h('.v2-menu-separator'))
      } else if (Array.isArray(x)) {
        const [title, spec, opts] = x
        this.add(new MenuItem(Object.assign({title, spec}, opts)))
      } else {
        h.pushView(this)
        h.add(this.el, x)
        h.popView()
      }
    }
  }
}

class MenuBar extends Menu {
  build() {
    return h('.v2-menu.v2-menu-bar.v2-view', {tabIndex: 0, onmousedown: '_click', onmousemove: '_mouseSelect'})
  }
  focus() {this.el.focus()}
  _mouseSelect(e) {
    if (!this._openMenu || !this._openMenu.visible) return
    super._mouseSelect(e)
  }
  _activateItem(v, e) {
    if (v.menu) {
      this.selectItem(this.selectedItem === v ? null : v, true)
      return
    }
    super._activateItem(v, e)
  }
  _showMenu(v) {
    const bb = v.el.getBoundingClientRect()
    v.menu.show(this.app, bb.left, bb.bottom, 0, 0, false)
  }
  _openMenuHidden() {
    super._openMenuHidden()
    setTimeout(() => this.selectItem(null))
  }
}

class MenuItem extends View {
  init() {
    this._menu = null
    this._currentMenu = null
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

  get menu() {
    if (this._currentMenu) return this._currentMenu
    const m = typeof this._menu === 'function' ? this._menu() : this._menu
    if (m) {
      this._currentMenu = m
      m.once('hide', () => this._currentMenu = null)
      m.ownerItem = this
    }
    return m
  }
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
    this._keyEl.textContent = v2.format.key(value)
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

Object.assign(v2, {Model, View, App, Split, List, FilteredList, CyNode, Node, DynamicTreeItem, DynamicTree, Tree, Collection, Menu, MenuBar, MenuItem})

global.h = h
global.v2 = v2

}(this)
