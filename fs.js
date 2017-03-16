'use strict'

function readDirectory(dir, fn) {
  const r = dir.createReader()
  const promises = []
  return new Promise(function loop(resolve, reject) {
    r.readEntries(es => {
      if (!es.length) return resolve(Promise.all(promises))
      promises.push(...es.map(fn))
      loop(resolve, reject)
    }, e => reject(e))
  })
}
function recurse(dir, fn) {
  return function loop(entry) {
    const r = fn(entry)
    return entry.isDirectory ? Promise.all([r, readDirectory(entry, loop)]) : r
  }(dir)
}
function createWriter(entry) {
  return new Promise((r, j) => entry.createWriter(r, j))
}

function file(entry) {return _file(entry).then(adoptFile)}
function _file(entry) {return new Promise((r, j) => entry.file(r, j))}
function adoptFile(f) {return f instanceof File ? f : new File([f], f.name, f)}

function getFile(entry, path, options) {return new Promise((r, j) => entry.getFile(path, options || {}, r, j))}
function getDirectory(entry, path, options) {return new Promise((r, j) => entry.getDirectory(path, options || {}, r, j))}

function zip(root) {
  if (!root.isDirectory) throw new Error('Root zip entry must be a directory')
  const i = root.fullPath.length + 1
  const zip = new JSZip()
  return recurse(root, e =>
    e.isFile && file(e).then(f => zip.file(e.fullPath.slice(i), f)))
  .then(() => zip)
}

module.exports = {readDirectory, recurse, createWriter, file, getFile, getDirectory, zip}
