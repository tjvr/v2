'use strict'

function def(target, key, value) {
  if (Object.defineProperty) Object.defineProperty(target, key, {value})
  else target[key] = value
}

if (!Number.MAX_SAFE_INTEGER) def(Number, 'MAX_SAFE_INTEGER', 9007199254740991)

function ToLength(len) {
  len = +len
  return len != len || len <= 0 ? 0 : len > Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : len
}

if (!String.prototype.padStart) def(String.prototype, 'padStart', function padStart(max, fill = ' ') {
  if (this == null) throw new TypeError('"this" value cannot be null or undefined')
  const s = '' + this
  max = ToLength(max)
  fill = '' + fill
  const len = s.length
  if (len >= max || !fill) return s
  const toFill = max - len
  let r, l
  while ((r = toFill - (l = fill.length)) > 0) {
    fill += r < l ? fill.slice(0, r) : fill
  }
  return fill.slice(0, toFill) + s
})

if (!String.prototype.padEnd) def(String.prototype, 'padEnd', function padEnd(max, fill = ' ') {
  if (this == null) throw new TypeError('"this" value cannot be null or undefined')
  const s = '' + this
  max = ToLength(max)
  fill = '' + fill
  const len = s.length
  if (len >= max || !fill) return s
  const toFill = max - len
  let r, l
  while ((r = toFill - (l = fill.length)) > 0) {
    fill += r < l ? fill.slice(0, r) : fill
  }
  return s + fill.slice(0, toFill)
})
