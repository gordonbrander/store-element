import {store, writer, mount, renderable} from '../store-element.js'
import {el, create} from '../dom.js'

const button = writer({
  setup: (host, curr, handle) => {
    el(host)
      .child(
        create('style')
          .html(`
            .button {
              font-size: 24px;
            }
          `)
          .done()
      )
      .child(
        create('button')
          .classname('button')
          .text(curr.text)
          .done()
      )
  },
  patch: (host, prev, curr, handle) => {
    if (prev.text !== curr.text) {
      host.querySelector(':scope .button').innerText = curr.text
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
  app
)