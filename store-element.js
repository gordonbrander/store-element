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
export const writer = ({setup, patch}) => {
  // Create a symbol for storing this writer's state.
  // Symbol is unique to writer, so you can have multiple writers for the
  // same element.
  const _state = Symbol('state')

  const write = (el, curr, handle) => {
    const prev = el[_state]
    if (prev == null) {
      setup(el, curr, handle)
      el[_state] = curr
    } else if (prev !== curr) {
      patch(el, prev, curr, handle)
      el[_state] = curr
    }
  }

  return write
}

const _shadow = Symbol('shadow')

// A RenderableElement is a custom element that knows how to take a state
// and render itself using a write function you define.
export class RenderableElement extends HTMLElement {
  constructor() {
    super()
    // Attach *closed* shadow. We keep the insides of the component closed
    // so that we can be sure no one is messing with the DOM, and DOM
    // writes are deterministic functions of state.
    this[_shadow] = this.attachShadow({mode: 'closed'})

    // Assign hard-bound handler that we can pass down to views.
    // References `this.send` delegate in a late-binding way.
    // If `this.send` gets set on instance, the override will be called
    // instead of the prototype.
    this.handle = msg => this.send(msg)

    // Render state on element.
    // Safe to call multiple times. Will render at most once per frame.
    // It's hard-bound so we can safely set it as a delegate on other classes.
    this.render = state => {
      const frame = requestAnimationFrame(() => {
        this.write(this[_shadow], state, this.handle)
      })
      cancelAnimationFrame(this._frame)
      this._frame = frame
    }
  }

  disconnectedCallback() {
    // If element is removed from DOM, cancel any pending renders.
    // We don't need to render it.
    cancelAnimationFrame(this._frame)
  }

  // Override with custom write logic
  write(el, state, handle) {}

  // Delegate. Set a send function on an instance of this element to
  // have it forward messages up to a parent component or store.
  send(msg) {}
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

// Forward a send function so that messages addressed to it get tagged
// before being sent.
//
// We use this when passing an address function down to a sub-component.
export const forward = (send, tag) => (msg) => send(tag(msg))

// Map an async value with function
export const mapAsync = async (f, x) => f(await x)

// Create an update function for a sub-component
export const cursor = ({update, get, set, tag}) => (big, msg) => {
  const [small, fx] = update(get(big), msg)
  const next = set(big, small)
  return [next, mapAsync(tag, fx)]
}

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