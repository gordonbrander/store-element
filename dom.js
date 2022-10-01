export const setClasses = (el, classes) => {
  el.className = classes.join(' ')
}

export const setAttrs = (el, attrs) => {
  for (let [key, value] of Object.entries(attrs)) {
    if (value === null) {
      this.removeAttribute(key)
    } else {
      this.addAttribute(key, value)
    }
  }
}

export const append = (el, child) => {
  el.appendChild(child)
}

export const appendAll = (el, children) => {
  for (let child of children) {
    el.appendChild(child)
  }
}

export const setText = (el, inner) => {
  el.innerText = inner
}

export const setHTML = (el, inner) => {
  el.innerHTML = inner
}

export const writeEl = (el, props, children) => {
  if (props?.state != null) {
    element.render(state)
  }
  if (props?.classes != null) {
    setClasses(el, props.classes)
  }
  if (props?.attr != null) {
    setAttrs(el, props.attr)
  }
  if (children != null) {
    appendAll(el, children)
  }
}

export const el = (name, props, children) => {
  const el = document.createElement(name)
  writeEl(el, props, children)
  return el
}

export const style = inner => {
  const el = document.createElement('style')
  setHTML(el, inner)
  return el
}

export const text = inner => document.createTextNode(inner)

export const select = (selector, scope=document) =>
  scope.querySelector(`:scope ${selector}`)