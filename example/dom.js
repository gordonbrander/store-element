import {writer} from '../dist/store-element.js'

export const setClasses = (el, classes) => {
  el.className = classes.join(' ')
}

export const setAttr = (el, key, value) => {
  if (value === null) {
    el.removeAttribute(key)
  } else {
    el.addAttribute(key, value)
  }
}

export const setProp = (el, key, value) => {
  el[key] = value
}

export const setSend = (el, send) => {
  el.send = send
}

export const setID = (el, id) => {
  el.id = id
}

export const append = (el, child) => {
  el.appendChild(child)
}

// Replace all children
export const children = (el, children) => {
  el.replaceChildren(...children)
}

// Set innerText on element
export const setText = writer({
  setup: (el, text, _) => {
    el.innerText = text
  },
  patch: (el, prev, curr, _) => {
    if (prev !== curr) {
      el.innerText = curr
    }
  }
})

// Set innerHTML on element
export const setHTML = (el, inner) => {
  el.innerHTML = inner
}

const _listeners = Symbol('stored event listeners')

// Remove listener for event, if any.
export const off = (el, event) => {
  if (el[_listeners] == null) {
    return
  }
  const handle = el[_listeners][event]
  if (handle != null) {
    el.removeEventListener(event, handle)
  }
}

// Set an event listener.
// Only one per event type.
export const on = (el, event, handle) => {
  off(el, event)
  if (el[_listeners] == null) {
    el[_listeners] = {}
  }
  el[_listeners][event] = handle
  el.addEventListener(event, handle)
  return el
}

// Render an element (provided it has a render function)
export const render = (el, state) => {
  el.render(state)
}

export const select = (selector, scope=document) =>
  scope.querySelector(`:scope ${selector}`)

// A simple chainable DSL for DOM manipulation.
export class El {
  // Register a write function, setting it on the prototype
  // for this class.
  static register(name, fn) {
    this.prototype[name] = function chain(...rest) {
      fn(this.subject, ...rest)
      return this
    }
    return this
  }

  constructor(subject) {
    this.subject = subject
  }

  // Chain a write function
  do(fn, ...rest) {
    fn(this.subject, ...rest)
    return this
  }

  done() {
    return this.subject
  }
}

El.register('classes', setClasses)
El.register('attr', setAttr)
El.register('prop', setProp)
El.register('append', append)
El.register('children', children)
El.register('text', setText)
El.register('html', setHTML)
El.register('on', on)
El.register('off', off)
El.register('id', setID)
El.register('render', render)
El.register('send', setSend)

export const el = element => new El(element)
el.select = (selector, scope=document) => el(select(selector, scope))
el.create = (name) => el(document.createElement(name))