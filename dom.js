// Simple jQuery-like chainable element builder
class ElementBuilder {
  constructor(el) {
    this.element = el
  }

  prop(key, value) {
    this[key] = value
    return this
  }

  attr(key, value) {
    if (value === null) {
      this.removeAttribute(key)
    } else {
      this.addAttribute(key, value)
    }
    return this
  }

  classname(key, isPresent=true) {
    this.element.classList.toggle(key, isPresent)
    return this
  }

  on(event, handler, options) {
    this.element.addEventListener(event, handler, options)
    return this
  }

  text(text) {
    this.element.innerText = text
    return this
  }

  html(text) {
    this.element.innerHTML = text
    return this
  }

  child(el) {
    this.element.appendChild(el)
    return this
  }

  children(els) {
    for (let el of els) {
      this.element.appendChild(el)
    }
    return this
  }

  render(state) {
    this.element.render(state)
    return this
  }

  done() {
    return this.element
  }
}

export const el = el => new ElementBuilder(el)

export const create = name =>
  new ElementBuilder(document.createElement(name))

export const select = (selector, scope=document) =>
  el(scope.querySelector(`:scope ${selector}`))