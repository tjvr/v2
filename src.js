'use strict'
require('./polyfill')
const itt = require('itt')

const v2 = {}

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

module.exports = v2
