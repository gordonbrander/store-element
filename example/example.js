import {store, component, mount, renderable} from '../store-element.js'

const button = component({
  html: `
    <style>
    .button {
      font-size: 24px;
    }
    </style>
    <button class="button"></button>
  `,
  setup: (host, curr, handle) => {
    host.querySelector(':scope .button').innerText = curr.text
  },
  patch: (host, prev, curr, handle) => {
    if (prev.text !== curr.text) {
      host.querySelector(':scope .button').innerText = curr.text
    }
  }
})
customElements.define('my-button', renderable(button))

const main = component({
  html: `
  <my-button></my-button>
  `,
  setup: (host, curr, handle) => {
    host.querySelector(':scope my-button').render(curr)
  },
  patch: (host, prev, curr, handle) => {
    host.querySelector(':scope my-button').render(curr)
  }
})
customElements.define('my-main', renderable(main))

const app = store({
  init: () => ({text: "Foo"}),
  update: (state, msg) => [state, null]
})

mount(
  document.querySelector('body'),
  document.createElement('my-main'),
  app
)