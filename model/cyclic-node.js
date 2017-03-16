'use strict'
const Model = require('./model')

class CyclicNode extends Model {
  constructor(data, children) {
    super({data})
    this.children = children || []
  }

  clear() {
    for (const c of this.children) c._removed()
    let index = this.children.length
    this.children.length = 0
    while (index--) this.emit('child removed', {target: this, index})
  }
  add(node) {
    node._moveTo(this)
    const index = this.children.length
    this.children.push(node)
    this.emit('child inserted', {target: this, node, index})
  }
  insert(node, index) {
    node._moveTo(this)
    this.children.splice(index, 0, node)
    this.emit('child inserted', {target: this, node, index})
  }
  removeAt(index) {
    const child = this.children[index]
    if (!child) return
    this.children.splice(index, 1)
    child._removed()
    this.emit('child removed', {target: this, index})
  }
  _moveTo(parent) {}
  _removed() {}

  get firstChild() {return this.children[0]}
  get lastChild() {return this.children[this.children.length - 1]}

  [Symbol.iterator]() {return this.children[Symbol.iterator]()}
}
CyclicNode.properties('data')
module.exports = CyclicNode
