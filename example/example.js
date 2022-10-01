import {store, writer, mount, renderable} from '../store-element.js'
import {style, el, append, appendAll, setText, text, select} from '../dom.js'

const click = {type: 'click'}

const button = writer({
  setup: (host, curr, handle) => {
    appendAll(host, [
      style(`
        .button {
          font-size: 24px;
        }
      `),
      el('button',
        {
          classes: ['button'],
          events: {
            click: () => handle(click)
          }
        },
        [
          text(`Clicks: ${curr.clicks}`)
        ]
      )
    ])
  },
  patch: (host, prev, curr, handle) => {
    setText(select('.button', host), `Clicks: ${curr.clicks}`)
  }
})

customElements.define('my-button', renderable(button))

const app = store({
  init: () => ({clicks: 0}),
  update: (state, msg) => {
    if (msg.type === 'click') {
      return [
        {...state, clicks: state.clicks + 1},
        null
      ]
    }
    return [state, null]
  }
})

mount(
  select('body'),
  el('my-button'),
  app
)