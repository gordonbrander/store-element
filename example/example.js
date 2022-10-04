import {store, view, component, writer, forward} from '../store-element.js'
import {el, select} from '../dom.js'

const writeButton = writer({
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

const button = view({
  style: `
    .button {
      font-size: 24px;
    }
  `,
  write: writeButton
})

customElements.define('my-button', button)

const click = () => ({type: 'click'})

const writeMain = writer({
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

const main = component({
  init: ({clicks=0}) => ({clicks}),
  update: (state, msg) => {
    if (msg.type === 'click') {
      return [
        {...state, clicks: state.clicks + 1},
        null
      ]
    }
    return [state, null]
  },
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
  write: writeMain
})

customElements.define('my-main', main)