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

// An updating function takes a state and an action and produces a
// change representing the next state and effects.
type Updating<State, Action> = (
  state: State,
  action: Action
) => Change<State, Action>

// An effect is a collection of one or more promises for future actions.
// Promises are "tasks" in the sense that they are always expected to succeed.
// Failures should also be modeled as actions.
export class Fx<Action> {
  tasks: Array<Promise<Action>>

  constructor(tasks: Array<Promise<Action>>) {
    this.tasks = tasks
  }

  run(address: Address<Action>) {
    for (const task of this.tasks) {
      task.then(address)
    }
  }
}

// Task is an fx for a single task
export const task = <Action>(task: Promise<Action>) => new Fx([task])

// An effect that produces "just" an action
export const just = <Action>(action: Action) =>
  new Fx([Promise.resolve(action)])

// Batch an array of fx together creating a new fx.
export const batchFx = <Action>(batch: Array<Fx<Action>>) =>
  new Fx(batch.flatMap(fx => fx.tasks))

// Map an fx with a function, returning a new fx.
export const mapFx = <A, B>(
  mapping: (a: A) => B,
  fx: Fx<A>
) => new Fx(fx.tasks.map(task => task.then(mapping)))

// Represents a state change transaction.
// A container for a state/fx pair
export class Change<State, Action> {
  state: State
  fx?: Fx<Action>

  constructor(state: State, fx?: Fx<Action>) {
    this.state = state
    this.fx = fx
  }
}

// Create a new change, defaulting to no fx, if no fx are specified.
export const change = <State, Action>(
  state: State,
  fx?: Fx<Action>
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
    if (next.fx) {
      next.fx.run(this.send)
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
  return new Change(next, mapFx(tag, inner.fx))
}

// Batch a series of update actions
// Returns a Change containing the resulting state and batched fx.
export const updateBatch = <State, Action>(
  update: Updating<State, Action>,
  state: State,
  actions: Array<Action>
) => {
  let curr = state
  let batchedFx: Array<Fx<Action>> = []
  for (let action of actions) {
    const next = update(curr, action)
    curr = next.state
    batchedFx.push(next.fx)
  }
  return change(curr, batchFx(batchedFx))
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

/// Convenience factory for defining a stateless view element
export const renderable = <State, Action>(
  write: Writing<ShadowRoot, State, Action>
) => {
  class CustomRenderableElement extends RenderableElement<State, Action> {}
  CustomRenderableElement.prototype.write = write
  return CustomRenderableElement
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