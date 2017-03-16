'use strict'
const rt = require('./rt')
const {ucfirst} = require('./util')

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SHORT_MONTH_NAMES = MONTH_NAMES.map(x => x.slice(0, 3))
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT_DAY_NAMES = DAY_NAMES.map(x => x.slice(0, 3))

const DAY_COUNTS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const MONTH_LENGTHS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]

function isLeapYear(y) {
  return !(y % 4) && (y % 100 !== 0 || !(y % 400))
}
function getDayOfYear(d) {
  const m = d.getMonth()
  const n = d.getDate()
  return MONTH_LENGTHS[m] + n + (m > 1 && isLeapYear(d.getFullYear()) ? 1 : 0)
}
function getMonthLength(d) {
  const m = d.getMonth()
  return DAY_COUNTS[m] + (m === 1 && isLeapYear(d.getFullYear()) ? 1 : 0)
}

function dateToday(format, d) {
  const now = new Date()
  if (now.getFullYear() === d.getFullYear() &&
    now.getMonth() === d.getMonth()) {
    if (now.getDate() === d.getDate()) return 'Today'
    if (now.getDate() === d.getDate() + 1) return 'Yesterday'
  }
  return date(format, d)
}
function date(format, d) {
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
      case 'Day': return DAY_NAMES[d.getDay()]
      case 'Dy': return SHORT_DAY_NAMES[d.getDay()]

      case 'dayOfYear': return getDayOfYear(d) + 1
      case 'dayOfYear0': return getDayOfYear(d)

      case '0month': return (d.getMonth() + 1 + '').padStart(2, '0')
      case 'month': return d.getMonth() + 1
      case '0month0': return (d.getMonth() + '').padStart(2, '0')
      case 'month0': return d.getMonth()
      case 'Month': return MONTH_NAMES[d.getMonth()]
      case 'Mth': return SHORT_MONTH_NAMES[d.getMonth()]
      case 'monthLength': return getMonthLength(d.getMonth())

      case 'isLeapYear': return isLeapYear(d.getFullYear()) ? '1' : '0'
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

      case 'tzOff': return timezoneOffset(d.getTimezoneOffset())
      case 'tzOff:': return timezoneOffset(d.getTimezoneOffset(), ':')

      case 'ISO': return d.toISOString()
      case 'unix': return Math.floor(d / 1000)
      default: return ''
    }
  })
}
function timezoneOffset(z, sep = '') {
  const t = z < 0 ? -z : z
  return (z > 0 ? '-' : '+') + (Math.floor(t / 60) + '').padStart(2, '0') + sep + (t % 60 + '').padStart(2, '0')
}
function list(items, last = ' and ', oxford = true) {
  return items.length <= 2 ? items.join(last) : items.slice(0, -1).join(', ') + (oxford ? ',' : '') + last + items[items.length - 1]
}
function bytes(b, opts) {
  if (!opts) opts = {}
  if (b < 1024) return b + ' B'
  const l = 'KMGTPEZY'
  let k = 0, n = 1024
  while (k < l.length - 1 && b >= n * 1024) {
    ++k
    n *= 1024
  }
  return (b < n * 16 ? Math.round(b / n * 10) / 10 : Math.round(b / n)) + ' ' + l.charAt(k) + (opts.si === false ? '' : 'i') + 'B'
}

const KEY_NAMES = {
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ' ': 'Space',
  '-': '–',
}
const APPLE_KEY_NAMES = {
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
}
function key(s) {
  const x = /^([\/#^]+)./.exec(s)
  if (x) s = s.slice(x[1].length)
  return (x ? modifiers(x[1]) : '') + (
    rt.isApple && APPLE_KEY_NAMES[s] ||
    KEY_NAMES[s] ||
    ucfirst(s))
}
function modifiers(s) {
  const a = rt.isApple
  return (s.includes(a ? '##' : '#') ? a ? APPLE_KEY_NAMES.Control : 'Ctrl+' : '') +
    (s.includes('/') ? a ? APPLE_KEY_NAMES.Alt : 'Alt+' : '') +
    (s.includes('^') ? a ? APPLE_KEY_NAMES.Shift : 'Shift+' : '') +
    (a && s.includes('#') ? APPLE_KEY_NAMES.Meta : '')
}

module.exports = {dateToday, date, timezoneOffset, list, bytes, key, modifiers}
