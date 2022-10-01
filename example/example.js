import {store, component, renderable} from '../store-element.js'

const button = component({
  body: state => `
    <style>
    :host {
      background: red;
    }
    </style>
    <button>Button</button>
  `,
  patch: (host, prev, curr, handle) => {
    if (prev.text !== curr.text) {
      let button = host.querySelector('button')
      button.innerText = curr.text
    }
  }
})

customElements.define('my-button', renderable(button))

const app = store({
  init: () => ({text: "Foo"}),
  update: (state, msg) => [state, null]
})

mount(
  document.querySelector('body'),
  document.createElement('my-button'),
  store
)