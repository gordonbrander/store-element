// An effect that produces nothing
export const nofx = async function* () { };
// Wrap a promise in an fx
export const fx = async function* (promise) {
    yield await promise;
};
// An effect that produces "just" an action
export const just = async function* (action) {
    yield action;
};
// Represents a state change transaction.
// A container for a state/fx pair
export class Change {
    constructor(state, fx = nofx()) {
        this.state = state;
        this.fx = fx;
    }
}
// Create a new change, generating default `nofx` if no fx are specified.
export const change = (state, fx = nofx()) => new Change(state, fx);
// Store is a deterministic store for state, inspired loosely by
// Elm's App Architecture pattern.
export class Store {
    constructor({ state, update }) {
        this.state = state;
        this.update = update;
        this.send = this.send.bind(this);
    }
    // Send an action to the store
    send(action) {
        const next = this.update(this.state, action);
        if (this.state !== next.state) {
            this.state = next.state;
            this.render(next.state);
        }
        this.effect(next.fx);
    }
    // Run an effect, sending any resulting action to the store.
    async effect(fx) {
        for await (const action of fx) {
            if (action) {
                this.send(action);
            }
        }
    }
    render(state) { }
}
// Create a new store
export const store = (options) => new Store(options);
// Forward a send function so that messages addressed to it get tagged
// before being sent.
//
// We use this to map between component domains, when passing an address
// down to a sub-component.
export const forward = (send, tag) => (action) => send(tag(action));
// Tag an fx, mapping its value to some new value.
export const tagged = async function* (f, fx) {
    for await (const value of fx) {
        yield f(value);
    }
};
// Create an update function for a sub-component
export const cursor = ({ update, get, set, tag }) => (state, action) => {
    const inner = update(get(state), action);
    const next = set(state, inner.state);
    return change(next, tagged(tag, inner.fx));
};
// Connect a store to a renderable element.
// - Invokes `renderable.render` with new store states
// - Sends renderable actions to `store.send`
export const connect = (renderable, store) => {
    store.render = renderable.render;
    renderable.address = store.send;
    renderable.render(store.state);
};
export const mount = (parent, renderable, store) => {
    connect(renderable, store);
    parent.appendChild(renderable);
};
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
export const writer = ({ setup, patch }) => {
    // Create a symbol for storing this writer's state.
    // Symbol is unique to writer, so you can have multiple writers for the
    // same element.
    const _state = Symbol('state');
    const write = (el, curr, handle) => {
        const prev = el[_state];
        if (prev == null) {
            setup(el, curr, handle);
            el[_state] = curr;
        }
        else if (prev !== curr) {
            patch(el, prev, curr, handle);
            el[_state] = curr;
        }
    };
    return write;
};
const _shadow = Symbol('shadow');
// A RenderableElement is a custom element that knows how to take a state
// and render itself using a write function you define.
export class RenderableElement extends HTMLElement {
    constructor() {
        super();
        // Attach *closed* shadow. We keep the insides of the component closed
        // so that we can be sure no one is messing with the DOM, and DOM
        // writes are deterministic functions of state.
        this[_shadow] = this.attachShadow({ mode: 'closed' });
        // Assign hard-bound handler that we can pass down to views.
        // References `this.send` delegate in a late-binding way.
        // If `this.send` gets set on instance, the override will be called
        // instead of the prototype.
        this.send = msg => this.address(msg);
        // Render state on element.
        // Safe to call multiple times. Will render at most once per frame.
        // It's hard-bound so we can safely set it as a delegate on other classes.
        this.render = (state) => {
            const frame = requestAnimationFrame(() => {
                this.write(this[_shadow], state, this.send);
            });
            if (this._frame) {
                cancelAnimationFrame(this._frame);
            }
            this._frame = frame;
        };
    }
    disconnectedCallback() {
        // If element is removed from DOM, cancel any pending renders.
        // We don't need to render it.
        if (this._frame) {
            cancelAnimationFrame(this._frame);
        }
    }
    // Override with custom write logic
    write(el, state, send) { }
    // Delegate. Set a send function on this property to
    // have it forward messages up to a parent component or store.
    address(action) { }
}
// A view is a renderable that knows how to style itself.
export class ViewElement extends RenderableElement {
    constructor() {
        super();
        let styleEl = document.createElement('style');
        styleEl.id = '__style__';
        styleEl.innerHTML = this.css();
        this[_shadow].appendChild(styleEl);
    }
    // Override with custom styles
    css() {
        return '';
    }
}
/// Convenience factory for defining a stateless view element
export const view = ({ css, write }) => {
    class CustomViewElement extends ViewElement {
    }
    CustomViewElement.prototype.css = () => css;
    CustomViewElement.prototype.write = write;
    return CustomViewElement;
};
