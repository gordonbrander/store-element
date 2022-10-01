import {store, writer, mount, renderable} from '../store-element.js'
import {style, el, append, appendAll, setText, text, select} from '../dom.js'

const button = writer({
  setup: (host, curr, handle) => {
    appendAll(host, [
      style(`
        .button {
          font-size: 24px;
        }
      `),
      el(
        'button',
        {
          classes: ['button']
        },
        [
          text('Click')
        ]
      )
    ])
  },
  patch: (host, prev, curr, handle) => {
    setText(select('.button', host), curr.text)
  }
})

customElements.define('my-button', renderable(button))

const app = store({
  init: () => ({text: "Foo"}),
  update: (state, msg) => [state, null]
})

mount(
  select('body'),
  el('my-button'),
  app
)