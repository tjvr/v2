'use strict'
const path = require('./path')
const fs = require('./fs')
const {ucfirst} = require('./util')

const rt = module.exports = {
  platforms: ['mac', 'win', 'iOS', 'android', 'other'],
  platform:
    /Macintosh/.test(navigator.userAgent) ? 'mac' :
    /Windows/.test(navigator.userAgent) ? 'win' :
    /like Mac OS X/i.test(navigator.userAgent) ? 'iOS' :
    /Android/i.test(navigator.userAgent) ? 'android' : 'other',
  types: ['electron', 'chrome', 'web'],
  type:
    typeof process !== 'undefined' && process.versions && process.versions.electron ? 'electron' :
    typeof chrome !== 'undefined' && chrome.app && chrome.app.runtime ? 'chrome' : 'web',
}

function asBlob(data, options) {
  if (!options) options = {}
  if (typeof data === 'string' || data.byteLength != null) return new Blob([data], {type: options.type || ''})
  return data
}

rt.web = {
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
    data = asBlob(data, options)
    const a = h('a', {
      download: name || '',
      type: data.type || options.type || '',
      href: URL.createObjectURL(data),
    })
    a.click()
    requestIdleCallback(() => URL.revokeObjectURL(a.href))
  },
}

rt.chrome = {
  _callback(fn, ...args) {
    return new Promise((r, j) => fn(...args, x => chrome.runtime.lastError ? j(chrome.runtime.lastError) : r(x)))
  },
  hasPermission(info) {return rt.chrome._callback(chrome.permissions.contains, info)},
  restoreEntry(id) {return rt.chrome._callback(chrome.fileSystem.restoreEntry, id)},
  chooseEntry(options) {return rt.chrome._callback(chrome.fileSystem.chooseEntry, options)},
  chooseFile(type, options) {
    if (!options) options = {}
    return rt.chrome.chooseEntry({
      type: 'openFile',
      acceptsMultiple: !!options.multiple,
      accepts: options.accepts && [rt.chrome._parseAccepts(options.accepts)],
    }).then(entry => Array.isArray(entry) ?
      Promise.all(entry.map(fs.file)) : fs.file(entry))
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
    data = asBlob(data, options)
    return rt.chrome.hasPermission({permissions: ['fileSystem.write']}).then(r => !r ? rt.web.saveFile(data, name, options) : rt.chrome.chooseEntry({
      type: 'saveFile',
      suggestedName: name,
      accepts: [{
        mimeTypes: [options.type || data.type],
        extensions: [path.ext(name)],
      }],
    }).then(e => fs.createWriter(e)).then(w => new Promise((r, j) => {
      w.onwrite = r
      w.onerror = j
      w.write(data)
    })))
  },
}

for (const t of rt.types) {
  rt[`is${ucfirst(t)}`] = rt.type === t
}
for (const p of rt.platforms) {
  rt[`is${ucfirst(p)}`] = rt.platform === p
}
rt.isApple = rt.isMac || rt.isIOS
rt.current = rt[rt.type] || {}

rt.keyWithModifiers = function keyWithModifiers(e) {
  return (rt.isApple && e.ctrlKey ? '`' : '') + (e.shiftKey ? '^' : '') + (e.altKey ? '/' : '') + ((rt.isApple ? e.metaKey : e.ctrlKey) ? '#' : '') + e.key
}

rt.chooseFile = rt.current.chooseFile || rt.web.chooseFile
rt.saveFile = rt.current.saveFile || rt.web.saveFile

const h = require('./h')
