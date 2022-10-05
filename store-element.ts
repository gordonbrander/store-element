// A rendering function (takes a state and produces some side-effect with it)
type Rendering<State> = (state: State) => void

// A writing function takes a subject, a state, and an address.
// Subject is expected to be mutated.
type Writing<Subject, State, Action> = (
  subject: Subject,
  state: State,
  send: Address<Action>
) => void

// An address function takes an action message and produces some
// side-effect with it.
type Address<Action> = (action: Action) => void

// An "Fx", or effect, is an async iterable for asyncronous side-effects
// that produce actions.
//
// Promises of the generator are expected to always succeed and never fail.
// Failure should be represented as a promise success for an action
// that describes the failure condition.
type Fx<Action> = AsyncGenerator<Action, void, void>

// An updating function takes a state and an action and produces a
// change representing the next state and effects.
type Updating<State, Action> = (
  state: State,
  action: Action
) => Change<State, Action>

// An effect that produces nothing
export const nofx = async function*() {}

// Wrap a promise in an fx
export const fx = async function*<Action>(promise: Promise<Action>) {
  yield await promise
}

// An effect that produces "just" an action
export const just = async function*<Action>(action: Action) {
  yield action
}

// Represents a state change transaction.
// A container for a state/fx pair
export class Change<State, Action> {
  state: State
  fx: Fx<Action>

  constructor(state: State, fx: Fx<Action> = nofx()) {
    this.state = state
    this.fx = fx
  }
}

// Create a new change, generating default `nofx` if no fx are specified.
export const change = <State, Action>(
  state: State,
  fx: Fx<Action> = nofx()
) => new Change(state, fx)

// An abstract interface for a reactive store
interface StoreInterface<State, Action> {
  state: State
  send: Address<Action>
  render: Rendering<State>
}

interface StoreOptions<State, Action> {
  state: State
  update: Updating<State, Action>
}

// Store is a deterministic store for state, inspired loosely by
// Elm's App Architecture pattern.
export class Store<State, Action> implements StoreInterface<State, Action> {
  state: State
  update: Updating<State, Action>

  constructor({state, update}: StoreOptions<State, Action>) {
    this.state = state
    this.update = update
    this.send = this.send.bind(this)
  }

  // Send an action to the store
  send(action: Action) {
    const next = this.update(this.state, action)
    if (this.state !== next.state) {
      this.state = next.state
      this.render(next.state)
    }
    this.effect(next.fx)
  }

  // Run an effect, sending any resulting action to the store.
  async effect(fx: Fx<Action>) {
    for await (const action of fx) {
      if (action) {
        this.send(action)
      }  
    }
  }

  render(state: State) {}
}

// Create a new store
export const store = <State, Action>(
  options: StoreOptions<State, Action>
) => new Store(options)

// Forward a send function so that messages addressed to it get tagged
// before being sent.
//
// We use this to map between component domains, when passing an address
// down to a sub-component.
export const forward = <Action, InnerAction>(
  send: Address<Action>,
  tag: (value: InnerAction) => Action
) => (action: InnerAction) => send(tag(action))

// Tag an fx, mapping its value to some new value.
export const tagged = async function* <InnerAction, Action>(
  f: (value: InnerAction) => Action,
  fx: Fx<InnerAction>
): Fx<Action> {
  for await (const value of fx) {
    yield f(value)
  }
}

interface CursorOptions<State, Action, InnerState, InnerAction> {
  update: Updating<InnerState, InnerAction>
  get: (state: State) => InnerState
  set: (state: State, inner: InnerState) => State
  tag: (action: InnerAction) => Action
}

// Create an update function for a sub-component
export const cursor = <State, Action, InnerState, InnerAction>(
  {update, get, set, tag}: CursorOptions<State, Action, InnerState, InnerAction>
) => (state: State, action: InnerAction) => {
  const inner = update(get(state), action)
  const next = set(state, inner.state)
  return change(next, tagged(tag, inner.fx))
}

// Connect a store to a renderable element.
// - Invokes `renderable.render` with new store states
// - Sends renderable actions to `store.send`
export const connect = <State, Action>(
  renderable: Renderable<State, Action>,
  store: StoreInterface<State, Action>
) => {
  store.render = renderable.render
  renderable.address = store.send
  renderable.render(store.state)
}

export const mount = <State, Action>(
  parent: HTMLElement,
  renderable: RenderableElement<State, Action>,
  store: StoreInterface<State, Action>
) => {
  connect(renderable, store)
  parent.appendChild(renderable)
}

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

// Minimal interface for a renderable element
interface Renderable<State, Action> {
  address: Address<Action>
  render: Rendering<State>
}

const _shadow = Symbol('shadow')

// A RenderableElement is a custom element that knows how to take a state
// and render itself using a write function you define.
export class RenderableElement<State, Action>
extends HTMLElement
implements Renderable<State, Action>
{
  render: Rendering<State>
  send: Address<Action>
  _frame?: number

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
    this.send = msg => this.address(msg)

    // Render state on element.
    // Safe to call multiple times. Will render at most once per frame.
    // It's hard-bound so we can safely set it as a delegate on other classes.
    this.render = (state: State) => {
      const frame = requestAnimationFrame(() => {
        this.write(this[_shadow], state, this.send)
      })
      if (this._frame) {
        cancelAnimationFrame(this._frame)
      }
      this._frame = frame
    }
  }

  disconnectedCallback() {
    // If element is removed from DOM, cancel any pending renders.
    // We don't need to render it.
    if (this._frame) {
      cancelAnimationFrame(this._frame)
    }
  }

  // Override with custom write logic
  write(el: ShadowRoot, state: State, send: Address<Action>) {}

  // Delegate. Set a send function on this property to
  // have it forward messages up to a parent component or store.
  address(action: Action) {}
}

// A view is a renderable that knows how to style itself.
export class ViewElement<State, Action>
extends RenderableElement<State, Action>
{
  constructor() {
    super()
    let styleEl = document.createElement('style')
    styleEl.id = '__style__'
    styleEl.innerHTML = this.css()
    this[_shadow].appendChild(styleEl)
  }

  // Override with custom styles
  css() {
    return ''
  }
}

interface ViewOptions<State, Action> {
  css: string
  write: Writing<ShadowRoot, State, Action>
}

/// Convenience factory for defining a stateless view element
export const view = <State, Action>(
  {css, write}: ViewOptions<State, Action>
) => {
  class CustomViewElement extends ViewElement<State, Action> {}
  CustomViewElement.prototype.css = () => css
  CustomViewElement.prototype.write = write
  return CustomViewElement
}