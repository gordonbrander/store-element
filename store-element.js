const _state = Symbol('state')

// Create a DOM writer function from a setup and patch function.
// `setup` is called on first write, `patch` is called for every
// subsequent write.
//
// Writen state is saved to a hidden field of the element. On `patch`, we pass
// the last state written and the next state to be written so you can compare
// them to make efficient writes.
//
// Patch is only called if the state has changed, so it is safe to call
// as often as you like.
export const writer = ({setup, patch}) => (el, curr, handle) => {
  const prev = el[_state]
  if (prev == null) {
    setup(el, curr, handle)
    el[_state] = curr
  } else if (prev !== curr) {
    patch(el, prev, curr, handle)
    el[_state] = curr
  }
}

const _frame = Symbol('frame')

// Write to an element using a state during the next animation frame.
// Renders a given element at most once per frame.
export const renderNextFrame = (writef, el, state, handle) => {
  const frame = requestAnimationFrame(() => {
    writef(el, state, handle)
  })
  // Avoid extra writes by cancelling any previous renders that
  // queued the next frame.
  cancelAnimationFrame(el[_frame])
  el[_frame] = frame
}

const _shadow = Symbol('shadow')

// A RenderableElement is a custom element that knows how to take a state
// and render itself using a write function you define.
export class RenderableElement extends HTMLElement {
  constructor() {
    super()
    this.handle = this.handle.bind(this)
    // Attach *closed* shadow. We keep the insides of the component closed
    // so that we can be sure no one is messing with the DOM, and DOM
    // writes are deterministic functions of state.
    this[_shadow] = this.attachShadow({mode: 'closed'})
  }

  handle(action) {
    if (action) {
      this.send(action)
    }
  }

  render(state) {
    renderNextFrame(this.write, this[_shadow], state, this.handle)
  }

  write(el, state, handle) {}
  send(action) {}
}

/// Convenience factory for defining a custom renderable element
export const renderable = write => {
  class CustomRenderableElement extends RenderableElement {}
  CustomRenderableElement.prototype.write = write
  return CustomRenderableElement
}

// Store is a deterministic store for state, inspired loosely by
// Elm's App Architecture pattern.
export class Store {
  constructor({init, update, flags}) {
    this.state = init(flags)
    this.update = update
    this.send = this.send.bind(this)
  }

  send(msg) {
    const [next, fx] = this.update(this.state, msg)
    if (this.state !== next) {
      this.state = next
      this.render(next)
    }
    if (fx) {
      this.effect(fx)
    }
  }

  async effect(fx) {
    const msg = await fx
    if (msg) {
      this.send(msg)
    }
  }

  render(state) {}
}

// Convenience factory for Store
export const store = (config) => new Store(config)

// Connect a store to a renderable element.
// - Invokes `renderable.render` with new store states
// - Sends renderable actions to `store.send`
export const connect = (store, renderable) => {
  store.render = renderable.render
  renderable.send = store.send
  renderable.render(store.state)
}

// Mount a renderable to a parent, connecting it to a store instance.
export const mount = (parent, renderable, store) => {
  connect(store, renderable)
  parent.appendChild(renderable)
}

// Create a renderable by name, rendering it with an initial state.
export const create = (name, state) => {
  const el = document.createElement(name)
  el.render(state)
  return el
}

// Create template element
const template = html => {
  const templateEl = document.createElement('template')
  templateEl.innerHTML = html
  return templateEl
}

const noop = () => {}

// Create a writer that scaffolds DOM with HTML
// Scaffold is saved as a template for efficient cloning.
// Setup and patch fill the scaffold with dynamic values.
export const component = ({html="", setup=noop, patch=noop}) => {
  const scaffold = template(html)
  const setupScaffold = (el, curr, handle) => {
    const inner = scaffold.content.cloneNode(true)
    el.appendChild(inner)
    setup(el, curr, handle)
  }
  return writer({setup: setupScaffold, patch})
}