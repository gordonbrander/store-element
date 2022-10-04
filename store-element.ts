type Fx<Action> = Promise<Action|undefined>

// Shortcut for an effect that produces nothing
export const nofx = async () => undefined

// A container for a state/fx pair
export class Change<State, Action> {
  state: State
  fx: Fx<Action>

  constructor(state: State, fx: Fx<Action> = nofx()) {
    this.state = state
    this.fx = fx
  }
}

// Convenience factory
export const change = <State, Action>(
  state: State,
  fx: Fx<Action> = nofx()
) => new Change(state, fx)

type Mapping<A, B> = (value: A) => B
type Rendering<State> = (state: State) => void
type Writing<Subject, State, Action> = (
  subject: Subject,
  state: State,
  send: Address<Action>
  ) => void
type Address<Action> = (action: Action) => void
type Updating<State, Action> = (state: State, action: Action) => Change<State, Action>

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

  send(action: Action) {
    const next = this.update(this.state, action)
    if (this.state !== next.state) {
      this.state = next.state
      this.render(next.state)
    }
    this.effect(next.fx)
  }

  async effect(fx: Fx<Action>) {
    const msg = await fx
    if (msg) {
      this.send(msg)
    }
  }

  render(state: State) {}
}

// Convenience factory for Store
export const store = <State, Action>(options: StoreOptions<State, Action>) => new Store(options)

// Forward a send function so that messages addressed to it get tagged
// before being sent.
//
// We use this when passing an address function down to a sub-component.
export const forward = <Action, InnerAction>(
  send: Address<Action>,
  tag: Mapping<InnerAction, Action>
) => (action: InnerAction) => send(tag(action))

// Map an async value with function
export const tagged = async <InnerAction, Action>(
  f: Mapping<InnerAction, Action>,
  fx: Fx<InnerAction>
): Fx<Action> => {
  const value = await fx
  if (value) {
    return f(value)
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
  store: StoreInterface<State, Action>,
  renderable: Renderable<State, Action>
  ) => {
  store.render = renderable.render
  renderable.address = store.send
  renderable.render(store.state)
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

// A view is a stateless renderable that knows how to style itself.
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
export const view = <State, Action>({css, write}: ViewOptions<State, Action>) => {
  class CustomViewElement extends ViewElement<State, Action> {}
  CustomViewElement.prototype.css = () => css
  CustomViewElement.prototype.write = write
  return CustomViewElement
}

const json = (str: string) => {
  if (str === '') {
    return
  }
  try {
    return JSON.parse(str)
  } catch {
    return
  }
}

// A stateful view that holds a store instance which drives its state updates.
// State be initialized via HTML with `state` attribute.
// Typically used as a top-level view.
export class ComponentElement<State, Action>
extends ViewElement<State, Action>
{
  store?: Store<State, Action>

  constructor() {
    super()
    const stateAttr = this.getAttribute('state')
    const flags = json(stateAttr)
    if (flags != null) {
      this.start(state)
    }
  }

  update(state: State, action: Action): Change<State, Action> {
    return change(state)
  }

  start(state: State) {
    this.store = store({
      state: state,
      update: this.update
    })
    connect(this.store, this)
  }
}

interface ComponentOptions<State, Action> {
  css: string
  update: Updating<State, Action>
  write: Writing<ShadowRoot, State, Action>
}

export const component = <State, Action>({
  css,
  update,
  write
}: ComponentOptions<State, Action>) => {
  class CustomComponentElement<State, Action> extends ComponentElement<State, Action> {}
  CustomComponentElement.prototype.css = () => css
  CustomComponentElement.prototype.write = write
  CustomComponentElement.prototype.update = update
  return CustomComponentElement
}