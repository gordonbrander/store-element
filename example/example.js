import {store, writer, mount, renderable, forward} from '../store-element.js'
import {el, select} from '../dom.js'

const button = writer({
  setup: (host, curr, handle) => {
    el(host)
      .append(
        el.create('style')
          .html(`
            .button {
              font-size: 24px;
            }
          `)
          .done()
      )
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

const main = writer({
  setup: (host, curr, handle) => {
    el(host)
      .append(
        el.create('style')
          .html(`
            .main {
              background: blue;
              width: 100vw;
              height: 100vw;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          `)
          .done()
      )
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