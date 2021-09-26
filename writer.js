const $rendered = Symbol('rendered state')

export const isMounted = (el) => el[$rendered] != null

// Mount an element, running a mount function, and marking the
// state that was rendered.
export const mounts = (mountf, el, state, handle) => {
  mountf(el, state, handle)
  el[$rendered] = state
}

// Write a state to an element with a write function.
// Retrieves previously written state so you can compare changes.
// Only writes if the state is dirty.
export const writes = (writef, el, state, handle) => {
  const prev = el[$rendered]
  if (prev !== state) {
    writef(el, prev, state, handle)
  }
  el[$rendered] = state
}

// Given a mount and a write function, create a write function
// with a consistent signature that will either mount or write,
// depending on which is needed.
export const writer = ({mount, write}) => (el, state, handle) => {
  if (!isMounted(el)) {
    mounts(mount, el, state, handle)
  } else {
    writes(write, el, state, handle)
  }
}