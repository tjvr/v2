'use strict'
module.exports = function watchableProperty(o, name, get) {
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
