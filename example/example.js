import {store, shadowWriter, mount, renderable, forward} from '../store-element.js'
import {el, select} from '../dom.js'

const button = shadowWriter({
  style: `
    .button {
      font-size: 24px;
    }
  `,
  setup: (host, curr, handle) => {
    el(host)
      .append(
        el.create('button')
          .classes(['button'])
          .on('click', forward(handle, click))
          .text(`Clicks: ${curr.clicks}`)
          .done()
      )
  },
  patch: (host, prev, curr, handle) => {
    el.select('.button', host)
      .text(`Clicks: ${curr.clicks}`)
  }
})

customElements.define('my-button', renderable(button))

const main = shadowWriter({
  style: `
    .main {
      background: blue;
      width: 100vw;
      height: 100vw;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `,
  setup: (host, curr, handle) => {
    el(host)
      .append(
        el.create('my-button')
          .id('button')
          .send(handle)
          .render(curr)
          .done()
      )
  },
  patch: (host, prev, curr, handle) => {
    el.select('my-button#button', host)
      .render(curr)
  }
})

customElements.define('my-main', renderable(main))

const click = () => ({type: 'click'})

const init = () => ({clicks: 0})

const update = (state, msg) => {
  if (msg.type === 'click') {
    return [
      {...state, clicks: state.clicks + 1},
      null
    ]
  }
  return [state, null]
}

const app = store({init, update})

mount(
  select('body'),
  el.create('my-main').done(),
  app
)